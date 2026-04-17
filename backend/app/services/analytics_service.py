from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.claim import Claim, FraudResult, DisruptionType, ClaimStatus
from app.models.payout import Payout
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.services.response_serializers import normalize_enum_value

def get_insurer_overview(db: Session):
    total_workers = db.query(Worker).count()
    active_policies_count = db.query(Policy).filter(Policy.status == PolicyStatus.ACTIVE).count()
    total_payouts_amount = db.query(func.sum(Payout.amount)).scalar() or 0.0
    total_payouts_count = db.query(Payout).count()
    total_premium_collected = db.query(func.sum(Policy.premium_amount)).scalar() or 0.0

    # Loss ratio: Payouts / Premiums
    total_premiums = total_premium_collected or 1.0
    loss_ratio = total_payouts_amount / total_premiums

    # Fraud stats
    total_claims = db.query(Claim).count()
    fraud_claims_blocked = db.query(Claim).filter(
        Claim.fraud_check_result.in_([FraudResult.FAILED, FraudResult.FLAGGED])
    ).count()
    fraud_rate = (fraud_claims_blocked / total_claims) if total_claims > 0 else 0.0

    # Claims by type
    claims_by_type = {}
    type_counts = db.query(Claim.disruption_type, func.count(Claim.id)).group_by(Claim.disruption_type).all()
    for dtype, count in type_counts:
        claims_by_type[normalize_enum_value(dtype, DisruptionType)] = count

    # Top trigger
    top_trigger = None
    top_trigger_pct = None
    if type_counts and total_claims > 0:
        top = max(type_counts, key=lambda x: x[1])
        top_trigger = normalize_enum_value(top[0], DisruptionType)
        top_trigger_pct = round((top[1] / total_claims) * 100, 1)

    # Avg claim processing time (created_at → reviewed_at)
    reviewed = db.query(Claim).filter(Claim.reviewed_at != None).all()
    avg_processing_seconds = None
    if reviewed:
        deltas = [
            (c.reviewed_at - c.created_at).total_seconds()
            for c in reviewed
            if c.reviewed_at and c.created_at
        ]
        if deltas:
            avg_processing_seconds = round(sum(deltas) / len(deltas), 1)

    return {
        "total_workers": total_workers,
        "total_payouts_amount": round(total_payouts_amount, 2),
        "active_policies_count": active_policies_count,
        "loss_ratio": round(loss_ratio, 4),
        "fraud_rate": round(fraud_rate, 4),
        "claims_by_type": claims_by_type,
        "total_premium_collected": round(total_premium_collected, 2),
        "total_claims_count": total_claims,
        "total_payouts_count": total_payouts_count,
        "fraud_claims_blocked": fraud_claims_blocked,
        "top_trigger": top_trigger,
        "top_trigger_pct": top_trigger_pct,
        "avg_claim_processing_seconds": avg_processing_seconds,
    }

def get_zone_heatmap(db: Session):
    zones = db.query(Zone).all()
    heatmaps = []
    for zone in zones:
        from app.models.trigger_event import TriggerEvent
        active_disruptions = db.query(TriggerEvent).filter(
            TriggerEvent.zone_id == zone.id,
            TriggerEvent.is_active == True
        ).count()
        total_claims_count = db.query(Claim).join(Worker).filter(Worker.zone_id == zone.id).count()

        risk_score = zone.base_risk_score
        if risk_score >= 0.7:
            risk_label = "High"
        elif risk_score >= 0.4:
            risk_label = "Medium"
        else:
            risk_label = "Low"

        heatmaps.append({
            "zone_id": zone.id,
            "zone_name": zone.name,
            "risk_score": risk_score,
            "active_disruptions_count": active_disruptions,
            "total_claims_count": total_claims_count,
            "latitude": zone.latitude,
            "longitude": zone.longitude,
            "pincode": zone.pincode,
            "flood_prone": zone.flood_prone,
            "risk_label": risk_label,
        })
    return heatmaps
