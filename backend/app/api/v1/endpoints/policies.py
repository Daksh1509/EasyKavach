from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.schemas.policy import Policy as PolicySchema, PolicyQuote, PolicyQuoteRequest
from app.services.premium_calculator import build_policy_quote
from app.services.response_serializers import safe_date, safe_datetime, safe_float, safe_str
from app.services.zone_defaults import zone_default_area_type, zone_default_warehouse_distance

router = APIRouter()


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


def _find_existing_active_policy(db: Session, worker_id: str, today):
    return (
        db.query(Policy)
        .filter(
            Policy.worker_id == worker_id,
            Policy.status == PolicyStatus.ACTIVE,
            Policy.week_start <= today,
            Policy.week_end >= today,
        )
        .order_by(Policy.created_at.desc())
        .first()
    )


def _build_quote_for_worker(worker: Worker, zone: Zone | None) -> dict:
    return build_policy_quote(
        shifts=worker.shifts,
        area_type=worker.area_type,
        zone=zone,
        warehouse_distance_km=worker.warehouse_distance_km,
        platform_type=worker.platform_type,
    )


@router.post("/quote", response_model=PolicyQuote)
def quote_policy(policy_in: PolicyQuoteRequest, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == policy_in.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    return build_policy_quote(
        shifts=policy_in.shifts,
        area_type=policy_in.area_type or zone_default_area_type(zone.id),
        zone=zone,
        warehouse_distance_km=policy_in.warehouse_distance_km
        if policy_in.warehouse_distance_km is not None
        else zone_default_warehouse_distance(zone.id),
        platform_type=policy_in.platform_type,
    )

@router.post("/create", response_model=PolicySchema)
def create_policy(worker_id: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    today = datetime.utcnow().date()
    existing_policy = _find_existing_active_policy(db, worker.id, today)
    if existing_policy:
        return _serialize_policy(existing_policy)

    zone = db.query(Zone).filter(Zone.id == worker.zone_id).first()
    quote = _build_quote_for_worker(worker, zone)

    start_date = today
    end_date = start_date + timedelta(days=7)

    db_policy = Policy(
        worker_id=worker.id,
        week_start=start_date,
        week_end=end_date,
        premium_amount=quote["premium_amount"],
        expected_weekly_earning=quote["expected_weekly_earning"],
        expected_weekly_loss=quote["expected_weekly_loss"],
        risk_score=quote["risk_score"],
        status=PolicyStatus.ACTIVE,
    )

    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return _serialize_policy(db_policy)

@router.get("/worker/{worker_id}", response_model=List[PolicySchema])
def get_worker_policies(worker_id: str, db: Session = Depends(get_db)):
    policies = (
        db.query(Policy)
        .filter(Policy.worker_id == worker_id)
        .order_by(Policy.created_at.desc())
        .all()
    )
    return [_serialize_policy(policy) for policy in policies]

@router.get("/active", response_model=List[PolicySchema])
def list_active_policies(db: Session = Depends(get_db)):
    policies = db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).all()
    return [_serialize_policy(policy) for policy in policies]
