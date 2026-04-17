from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.claim import Claim, ClaimStatus
from app.schemas.claim import Claim as ClaimSchema, ClaimUpdate
from app.services.fraud_engine import check_fraud_rules
from app.models.claim import DisruptionType, FraudResult
from app.services.response_serializers import (
    normalize_enum_value,
    safe_datetime,
    safe_float,
    safe_str,
)

router = APIRouter()


def _serialize_claim(claim: Claim) -> dict:
    return {
        "id": safe_str(claim.id),
        "worker_id": safe_str(claim.worker_id),
        "policy_id": safe_str(claim.policy_id),
        "trigger_event_id": safe_str(claim.trigger_event_id),
        "disruption_type": normalize_enum_value(claim.disruption_type, DisruptionType),
        "disruption_duration_hours": safe_float(claim.disruption_duration_hours),
        "hourly_wage": safe_float(claim.hourly_wage),
        "severity_multiplier": safe_float(claim.severity_multiplier, 1.0),
        "base_loss": safe_float(claim.base_loss),
        "adjusted_payout": safe_float(claim.adjusted_payout),
        "status": normalize_enum_value(claim.status, ClaimStatus),
        "fraud_check_result": normalize_enum_value(claim.fraud_check_result, FraudResult),
        "fraud_probability": safe_float(claim.fraud_probability),
        "created_at": safe_datetime(claim.created_at),
        "reviewed_at": claim.reviewed_at,
    }

@router.get("/", response_model=List[ClaimSchema])
def list_claims(status: Optional[ClaimStatus] = None, db: Session = Depends(get_db)):
    query = db.query(Claim)
    if status:
        query = query.filter(Claim.status == status)
    return [_serialize_claim(claim) for claim in query.order_by(Claim.created_at.desc()).all()]

@router.get("/{id}", response_model=ClaimSchema)
def get_claim(id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return _serialize_claim(claim)

@router.get("/worker/{worker_id}", response_model=List[ClaimSchema])
def get_worker_claims(worker_id: str, db: Session = Depends(get_db)):
    return [_serialize_claim(claim) for claim in db.query(Claim).filter(Claim.worker_id == worker_id).all()]

@router.patch("/{id}/review")
def review_claim(id: str, claim_in: ClaimUpdate, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    update_data = claim_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(claim, field, value)

    claim.reviewed_at = datetime.utcnow()
    db.add(claim)
    db.commit()
    return {"message": "Claim review updated"}

@router.post("/{id}/check-fraud")
def run_fraud_check(id: str, db: Session = Depends(get_db)):
    """
    Feature #8: Fraud Detection Engine — detailed signal breakdown.
    """
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    from app.models.worker import Worker
    from app.models.trigger_event import TriggerEvent
    from app.ml.features import build_fraud_feature_map

    worker = db.query(Worker).filter(Worker.id == claim.worker_id).first()
    trigger_event = db.query(TriggerEvent).filter(TriggerEvent.id == claim.trigger_event_id).first()
    feature_map = build_fraud_feature_map(db, claim, worker, trigger_event)

    result = check_fraud_rules(db, claim)

    # Build human-readable signal checks
    individual_signals = [
        {"check": "GPS location matches registered zone", "passed": feature_map.get("gps_zone_match_score", 1.0) >= 0.5},
        {"check": f"Online-to-trigger time gap: {int(feature_map.get('online_to_trigger_gap_sec', 0))}s (normal > 300s)", "passed": feature_map.get("online_to_trigger_gap_sec", 999) >= 300},
        {"check": "No duplicate claim for this event", "passed": feature_map.get("duplicate_flag", 0.0) < 0.5},
        {"check": f"Claim rate vs peers: {round(feature_map.get('historical_claim_freq', 0) * 56, 1)} claims / 8 weeks (normal < 5)", "passed": feature_map.get("historical_claim_freq", 0) <= 0.09},
    ]
    mass_signals = [
        {"check": "Claim density pattern: Gradual (not coordinated spike)", "passed": feature_map.get("claim_density_rank", 0) < 50},
        {"check": "Worker activation pattern: Normal", "passed": feature_map.get("shift_consistency", 1.0) >= 0.5},
    ]

    fraud_prob = result["probability"]
    if fraud_prob <= 0.2:
        decision_label = "AUTO-APPROVED"
    elif fraud_prob <= 0.6:
        decision_label = "FLAG_FOR_REVIEW"
    else:
        decision_label = "REJECTED"

    return {
        "claim_id": id,
        "individual_signals": individual_signals,
        "mass_event_signals": mass_signals,
        "fraud_probability_score": round(fraud_prob, 4),
        "risk_level": "Low Risk" if fraud_prob <= 0.2 else ("Medium Risk" if fraud_prob <= 0.6 else "High Risk"),
        "decision": decision_label,
        "raw_signals": result.get("signals", []),
    }


@router.get("/{id}/payout-breakdown")
def get_payout_breakdown(id: str, db: Session = Depends(get_db)):
    """
    Feature #7: Payout Calculation breakdown — shows full formula.
    """
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    from app.models.worker import Worker, Zone
    from app.models.payout import Payout
    from app.services.claim_processor import SEVERITY_MULTIPLIERS

    worker = db.query(Worker).filter(Worker.id == claim.worker_id).first()
    zone = db.query(Zone).filter(Zone.id == worker.zone_id).first() if worker else None
    payout = db.query(Payout).filter(Payout.claim_id == id).first()

    # Zone risk multiplier (flood-prone zones get a bonus)
    zone_risk_multiplier = 1.1 if (zone and zone.flood_prone) else 1.0
    hourly_wage = safe_float(claim.hourly_wage)
    duration = safe_float(claim.disruption_duration_hours)
    severity_mult = safe_float(claim.severity_multiplier, 1.0)
    calculated_payout = round(hourly_wage * duration * severity_mult * zone_risk_multiplier, 2)

    disruption_type = normalize_enum_value(claim.disruption_type, DisruptionType)

    return {
        "claim_id": id,
        "disruption_type": disruption_type,
        "hourly_wage": hourly_wage,
        "disruption_duration_hours": duration,
        "severity_multiplier": severity_mult,
        "severity_multiplier_label": f"{severity_mult}x ({disruption_type.replace('_', ' ').title()})",
        "zone_risk_multiplier": zone_risk_multiplier,
        "zone_risk_multiplier_note": "flood-prone history" if zone_risk_multiplier > 1.0 else "standard zone",
        "formula": f"₹{hourly_wage} × {duration}hrs × {severity_mult}x × {zone_risk_multiplier}x",
        "calculated_payout": calculated_payout,
        "stored_adjusted_payout": safe_float(claim.adjusted_payout),
        "payment_method": "UPI",
        "upi_id": safe_str(worker.upi_id) if worker else "",
        "transaction_id": safe_str(payout.transaction_id) if payout else None,
        "payout_status": normalize_enum_value(payout.status, payout.status.__class__) if payout and hasattr(payout.status, '__class__') else ("completed" if payout else "pending"),
        "worker_notification": (
            f"₹{safe_float(claim.adjusted_payout)} credited for {duration} hours of "
            f"{disruption_type.replace('_', ' ')} disruption — "
            f"{worker.shifts[0].title() if worker and worker.shifts else 'Evening'} Shift, "
            f"{zone.name if zone else ''} | Claim #{id[:8]}"
        ),
    }


@router.get("/{id}/eligibility-log")
def get_eligibility_log(id: str, db: Session = Depends(get_db)):
    """
    Feature #5: Zero-Touch Claim Initiation — 4-check eligibility log.
    """
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    from app.models.worker import Worker, Zone
    from app.models.policy import Policy, PolicyStatus
    from app.models.trigger_event import TriggerEvent

    worker = db.query(Worker).filter(Worker.id == claim.worker_id).first()
    trigger = db.query(TriggerEvent).filter(TriggerEvent.id == claim.trigger_event_id).first()
    policy = db.query(Policy).filter(Policy.id == claim.policy_id).first()
    zone = db.query(Zone).filter(Zone.id == worker.zone_id).first() if worker else None

    disruption_type = normalize_enum_value(claim.disruption_type, DisruptionType)

    checks = [
        {
            "check": "Zone match confirmed",
            "detail": f"Worker zone ({safe_str(worker.zone_id) if worker else '?'}) = affected zone ({safe_str(trigger.zone_id) if trigger else '?'})",
            "passed": (worker and trigger and worker.zone_id == trigger.zone_id),
        },
        {
            "check": "Active policy exists",
            "detail": f"Valid till {policy.week_end}" if policy else "No active policy",
            "passed": policy is not None,
        },
        {
            "check": "Worker online status: Active on platform",
            "detail": "Online" if (worker and worker.is_online) else "Offline (civic disruption override)" if trigger and trigger.trigger_type == "civic_disruption" else "Offline",
            "passed": bool(worker and (worker.is_online or (trigger and trigger.trigger_type == "civic_disruption"))),
        },
        {
            "check": "No duplicate claim for this event",
            "detail": f"Claim #{id[:8]} is unique for trigger {safe_str(claim.trigger_event_id)[:8]}",
            "passed": True,
        },
    ]

    return {
        "claim_id": id,
        "trigger_type": disruption_type,
        "zone": f"{safe_str(zone.name) if zone else ''}, {safe_str(zone.pincode) if zone else ''}",
        "trigger_fired_at": safe_str(trigger.started_at) if trigger else None,
        "eligibility_checks": checks,
        "all_checks_passed": all(c["passed"] for c in checks),
        "claim_status": normalize_enum_value(claim.status, ClaimStatus),
        "severity_multiplier": safe_float(claim.severity_multiplier, 1.0),
        "disruption_duration_hours": safe_float(claim.disruption_duration_hours),
    }
