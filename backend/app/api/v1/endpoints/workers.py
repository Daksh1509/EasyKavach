from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.schemas.onboarding import WorkerOnboardingResponse
from app.schemas.worker import Worker as WorkerSchema, WorkerCreate, WorkerUpdate, Zone as ZoneSchema
from app.services.premium_calculator import build_policy_quote
from app.services.response_serializers import (
    normalize_enum_value,
    safe_datetime,
    safe_date,
    safe_float,
    safe_list,
    safe_str,
)
from app.services.zone_defaults import zone_default_area_type, zone_default_warehouse_distance
from app.models.worker import AreaType

router = APIRouter()


def _serialize_worker(worker: Worker) -> dict:
    return {
        "id": safe_str(worker.id),
        "name": safe_str(worker.name),
        "phone": safe_str(worker.phone),
        "email": safe_str(worker.email),
        "pancard": safe_str(worker.pancard),
        "aadhaar": safe_str(worker.aadhaar),
        "upi_id": safe_str(worker.upi_id),
        "zone_id": safe_str(worker.zone_id),
        "area_type": normalize_enum_value(worker.area_type, AreaType),
        "warehouse_distance_km": safe_float(worker.warehouse_distance_km, 1.0),
        "platform_type": safe_str(worker.platform_type, "Blinkit"),
        "shifts": safe_list(worker.shifts),
        "is_online": bool(worker.is_online),
        "registered_at": safe_datetime(worker.registered_at),
        "last_active_at": safe_datetime(worker.last_active_at),
        # Phase 3: Individual Behavioral Analysis
        "reliability_score": safe_float(worker.reliability_score, 0.8),
        "avg_daily_earnings": safe_float(worker.avg_daily_earnings, 500.0),
        "shift_completion_rate": safe_float(worker.shift_completion_rate, 0.9),
        "past_shifts_history": worker.past_shifts_history if isinstance(worker.past_shifts_history, list) else [],
    }


def _serialize_policy(policy: Policy) -> dict:
    return {
        "id": safe_str(policy.id),
        "worker_id": safe_str(policy.worker_id),
        "week_start": safe_date(policy.week_start),
        "week_end": safe_date(policy.week_end),
        "premium_amount": safe_float(policy.premium_amount),
        "expected_weekly_earning": safe_float(policy.expected_weekly_earning),
        "expected_weekly_loss": safe_float(policy.expected_weekly_loss),
        "risk_score": safe_float(policy.risk_score),
        "status": getattr(policy.status, "value", policy.status),
        "created_at": safe_datetime(policy.created_at),
    }


def _serialize_zone(zone: Zone) -> dict:
    return {
        "id": safe_str(zone.id),
        "name": safe_str(zone.name),
        "city": safe_str(zone.city),
        "latitude": safe_float(zone.latitude),
        "longitude": safe_float(zone.longitude),
        "elevation_m": safe_float(zone.elevation_m),
        "flood_prone": bool(zone.flood_prone),
        "base_risk_score": safe_float(zone.base_risk_score, 0.5),
        "footfall_score": safe_float(zone.footfall_score, 0.5),
        "historical_order_density": safe_float(zone.historical_order_density, 0.5),
        "default_area_type": zone_default_area_type(zone.id).value,
        "default_warehouse_distance_km": zone_default_warehouse_distance(zone.id),
        # Phase 3: Granular Zone Definitions
        "pincode": safe_str(zone.pincode),
        "dark_store_radius_ring": safe_str(zone.dark_store_radius_ring, "0-2km"),
    }

@router.post("/register", response_model=WorkerOnboardingResponse)
async def register_worker(worker_in: WorkerCreate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.phone == worker_in.phone).first()
    if worker:
        raise HTTPException(
            status_code=400,
            detail="Worker with this phone number already exists."
        )

    zone = db.query(Zone).filter(Zone.id == worker_in.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    worker_payload = worker_in.model_dump()
    worker_payload["area_type"] = worker_payload.get("area_type") or zone_default_area_type(zone.id)
    worker_payload["warehouse_distance_km"] = (
        worker_payload.get("warehouse_distance_km")
        if worker_payload.get("warehouse_distance_km") is not None
        else zone_default_warehouse_distance(zone.id)
    )

    db_worker = Worker(**worker_payload)
    db.add(db_worker)
    db.flush()

    quote = build_policy_quote(
        shifts=db_worker.shifts,
        area_type=db_worker.area_type,
        zone=zone,
        warehouse_distance_km=db_worker.warehouse_distance_km,
        platform_type=db_worker.platform_type,
        reliability_score=getattr(db_worker, "reliability_score", 0.8) or 0.8,
        shift_completion_rate=getattr(db_worker, "shift_completion_rate", 0.9) or 0.9,
    )

    start_date = datetime.utcnow().date()
    db_policy = Policy(
        worker_id=db_worker.id,
        week_start=start_date,
        week_end=start_date + timedelta(days=7),
        premium_amount=quote["premium_amount"],
        expected_weekly_earning=quote["expected_weekly_earning"],
        expected_weekly_loss=quote["expected_weekly_loss"],
        risk_score=quote["risk_score"],
        status=PolicyStatus.ACTIVE,
    )
    db.add(db_policy)
    db.commit()
    db.refresh(db_worker)
    db.refresh(db_policy)

    # Phase 3: Build onboarding summary (Feature #1)
    risk_pct = int(round(quote["risk_score"] * 100))
    if risk_pct >= 70:
        risk_label = f"High ({risk_pct}/100 zone score)"
    elif risk_pct >= 40:
        risk_label = f"Medium-High ({risk_pct}/100 zone score)"
    else:
        risk_label = f"Low ({risk_pct}/100 zone score)"

    ring = zone.dark_store_radius_ring or "0-2km"
    ring_label_map = {"0-1km": "Zone A — 0–1km from dark store", "1-2km": "Zone B — 1–2km from dark store", "2-3km": "Zone C — 2–3km from dark store"}
    ring_label = ring_label_map.get(ring, ring)
    pincode = zone.pincode or ""
    zone_display = f"{zone.name} ({pincode}) [{ring_label}]" if pincode else f"{zone.name} [{ring_label}]"

    # Worker ID display: platform prefix + last 4 chars of UUID
    platform_prefix = {"Blinkit": "BLK", "Swiggy": "SWG", "Zepto": "ZPT"}.get(db_worker.platform_type, "EK")
    worker_id_display = f"{platform_prefix}_{db_worker.id[-4:].upper()}"

    return {
        "worker": _serialize_worker(db_worker),
        "policy": _serialize_policy(db_policy),
        "quote": quote,
        "worker_id_display": worker_id_display,
        "risk_level": risk_label,
        "zone_display": zone_display,
        "policy_status_label": "Active",
        "hourly_support_rate": quote.get("hourly_income_floor", 0.0),
    }

@router.get("/", response_model=List[WorkerSchema])
def list_workers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    workers = db.query(Worker).offset(skip).limit(limit).all()
    return [_serialize_worker(worker) for worker in workers]

@router.get("/{id}", response_model=WorkerSchema)
def get_worker(id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return _serialize_worker(worker)

@router.patch("/{id}", response_model=WorkerSchema)
def update_worker(id: str, worker_in: WorkerUpdate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    update_data = worker_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(worker, field, value)
    
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return _serialize_worker(worker)

@router.get("/zones/list", response_model=List[ZoneSchema])
def list_zones(db: Session = Depends(get_db)):
    return [_serialize_zone(zone) for zone in db.query(Zone).all()]


@router.get("/{id}/profile")
def get_worker_profile(id: str, db: Session = Depends(get_db)):
    """
    Phase 3: Individual Behavioral Analysis
    Returns a worker's behavioral profile score — used to personalise premiums
    and payout adjustments. Workers with higher reliability and shift completion
    rates receive a higher behavioral_modifier on their claim payouts.
    """
    worker = db.query(Worker).filter(Worker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    reliability = safe_float(worker.reliability_score, 0.8)
    shift_completion = safe_float(worker.shift_completion_rate, 0.9)
    behavioral_score = round((reliability * 0.6) + (shift_completion * 0.4), 4)
    # Maps [0.5, 1.0] → [0.95, 1.10]
    behavioral_modifier = round(0.95 + (behavioral_score - 0.5) * 0.30, 4)
    behavioral_modifier = max(0.90, min(1.10, behavioral_modifier))

    zone = db.query(Zone).filter(Zone.id == worker.zone_id).first()

    return {
        "worker_id": safe_str(worker.id),
        "name": safe_str(worker.name),
        "zone_id": safe_str(worker.zone_id),
        "zone_name": safe_str(zone.name) if zone else None,
        "pincode": safe_str(zone.pincode) if zone else None,
        "dark_store_radius_ring": safe_str(zone.dark_store_radius_ring) if zone else None,
        # Behavioral metrics
        "reliability_score": reliability,
        "shift_completion_rate": shift_completion,
        "avg_daily_earnings": safe_float(worker.avg_daily_earnings, 500.0),
        "behavioral_score": behavioral_score,
        "behavioral_modifier": behavioral_modifier,
        "behavioral_modifier_explanation": (
            f"Payout adjusted by {round((behavioral_modifier - 1.0) * 100, 1):+.1f}% "
            f"based on reliability ({reliability}) and shift completion ({shift_completion})"
        ),
        "total_past_shifts": len(worker.past_shifts_history if isinstance(worker.past_shifts_history, list) else []),
    }


@router.get("/{id}/history")
def get_worker_history(id: str, db: Session = Depends(get_db)):
    """
    Phase 3: Individual Behavioral Analysis — shift history table.
    Returns the worker's past shift records used to compute behavioral scores
    and validate income loss claims.
    """
    worker = db.query(Worker).filter(Worker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    history = worker.past_shifts_history if isinstance(worker.past_shifts_history, list) else []
    total_earnings = sum(float(s.get("earnings", 0)) for s in history if isinstance(s, dict))
    completed_shifts = sum(1 for s in history if isinstance(s, dict) and s.get("completed"))

    return {
        "worker_id": safe_str(worker.id),
        "name": safe_str(worker.name),
        "total_shifts_recorded": len(history),
        "completed_shifts": completed_shifts,
        "total_earnings_recorded": round(total_earnings, 2),
        "avg_earnings_per_shift": round(total_earnings / len(history), 2) if history else 0.0,
        "shift_history": history,
    }
