from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

from app.ml.artifacts import predict_fraud_probability
from app.ml.features import build_fraud_feature_map
from app.models.claim import Claim, ClaimStatus, FraudResult
from app.models.fraud_flag import FraudFlag, FraudSeverity
from app.models.trigger_event import TriggerEvent
from app.models.worker import Worker


def _make_signals(feature_map: Dict[str, float]) -> List[Tuple[str, FraudSeverity]]:
    signals: List[Tuple[str, FraudSeverity]] = []

    if feature_map.get("online_to_trigger_gap_sec", 0.0) < 300:
        signals.append(("pre_trigger_online", FraudSeverity.MEDIUM))

    if feature_map.get("gps_zone_match_score", 1.0) < 0.5:
        signals.append(("gps_mismatch", FraudSeverity.HIGH))

    if feature_map.get("historical_claim_freq", 0.0) > 0.6:
        signals.append(("high_claim_frequency", FraudSeverity.MEDIUM))

    if feature_map.get("claim_density_rank", 0.0) > 3:
        signals.append(("high_zone_claim_density", FraudSeverity.LOW))

    if feature_map.get("shift_consistency", 1.0) < 0.5:
        signals.append(("shift_mismatch", FraudSeverity.MEDIUM))

    if feature_map.get("duplicate_flag", 0.0) > 0.5:
        signals.append(("duplicate_claim", FraudSeverity.HIGH))

    if feature_map.get("account_age_days", 999.0) < 14:
        signals.append(("new_account", FraudSeverity.LOW))

    return signals


def _heuristic_probability(feature_map: Dict[str, float]) -> float:
    probability = 0.0

    if feature_map.get("online_to_trigger_gap_sec", 0.0) < 300:
        probability += 0.18
    if feature_map.get("gps_zone_match_score", 1.0) < 0.5:
        probability += 0.28
    if feature_map.get("historical_claim_freq", 0.0) > 0.6:
        probability += 0.16
    if feature_map.get("shift_consistency", 1.0) < 0.5:
        probability += 0.12
    if feature_map.get("duplicate_flag", 0.0) > 0.5:
        probability += 0.32
    if feature_map.get("account_age_days", 999.0) < 14:
        probability += 0.08

    return min(1.0, round(probability, 4))


def check_fraud_rules(db: Session, claim: Claim) -> dict:
    """
    Model-first fraud scoring with deterministic rule flags for explainability.
    """
    worker = db.query(Worker).filter(Worker.id == claim.worker_id).first()
    trigger_event = db.query(TriggerEvent).filter(TriggerEvent.id == claim.trigger_event_id).first()

    if worker is None:
        claim.fraud_probability = 0.0
        claim.fraud_check_result = FraudResult.PASSED
        db.commit()
        return {"probability": 0.0, "signals": [], "decision": "AUTO_APPROVED"}

    feature_map = build_fraud_feature_map(db, claim, worker, trigger_event)
    signals = _make_signals(feature_map)

    model_probability = predict_fraud_probability(feature_map)
    fraud_prob = model_probability if model_probability is not None else _heuristic_probability(feature_map)

    for signal_type, severity in signals:
        db.add(
            FraudFlag(
                claim_id=claim.id,
                signal_type=signal_type,
                severity=severity,
                description=f"Model feature flag: {signal_type}",
            )
        )

    if fraud_prob > 0.6:
        claim.fraud_check_result = FraudResult.FAILED
        claim.status = ClaimStatus.PENDING_REVIEW
    elif fraud_prob > 0.2:
        claim.fraud_check_result = FraudResult.FLAGGED
    else:
        claim.fraud_check_result = FraudResult.PASSED

    claim.fraud_probability = fraud_prob
    claim.reviewed_at = datetime.utcnow()
    db.commit()

    return {
        "probability": fraud_prob,
        "signals": [signal_type for signal_type, _ in signals],
        "decision": "FLAG_FOR_REVIEW" if fraud_prob > 0.2 else "AUTO_APPROVED",
    }
