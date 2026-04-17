from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping

from app.models.claim import Claim
from app.models.worker import AreaType
from sqlalchemy.orm import Session

BASE_EARNINGS = {
    "morning": 250,
    "afternoon": 350,
    "evening": 500,
    "night": 400,
}

AREA_SCORES = {
    AreaType.COMMERCIAL: 9,
    AreaType.COLLEGE: 8,
    AreaType.RESIDENTIAL: 6,
    AreaType.LOW_DENSITY: 4,
}


def _value(source: Any, key: str, default: Any = None) -> Any:
    if source is None:
        return default

    if isinstance(source, Mapping):
        return source.get(key, default)

    return getattr(source, key, default)


def _normalize_area_type(area_type: Any) -> str:
    if hasattr(area_type, "value"):
        return str(area_type.value).lower()

    return str(area_type or "commercial").lower()


def _area_score(area_type: Any) -> float:
    if area_type in AREA_SCORES:
        return float(AREA_SCORES[area_type])

    normalized = _normalize_area_type(area_type)
    for enum_value, score in AREA_SCORES.items():
        if getattr(enum_value, "value", None) == normalized:
            return float(score)

    return 5.0


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return float(default)

    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if hasattr(value, "value") and not isinstance(value, (str, bytes)):
        value = value.value

    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _shift_bucket_from_hour(hour: int) -> str:
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 22:
        return "evening"
    return "night"


def _shift_consistency(worker_shifts: Any, claim_time: datetime | None) -> float:
    shifts = [str(shift).lower() for shift in (worker_shifts or [])]
    if not shifts or claim_time is None:
        return 0.5

    bucket = _shift_bucket_from_hour(claim_time.hour)
    if bucket in shifts:
        return 1.0

    return 0.35


def build_earnings_feature_map(
    shift: str,
    area_type: Any,
    footfall_score: float = 0.5,
    historical_order_density: float = 0.5,
    warehouse_distance_km: float = 1.0,
    road_accessibility: float = 1.0,
    live_deliveries_per_hour: float = 2.0,
    platform_type: str = "Blinkit",
    zone: Any = None,
) -> dict[str, float]:
    zone_footfall = _coerce_float(_value(zone, "footfall_score", footfall_score), footfall_score)
    zone_density = _coerce_float(
        _value(zone, "historical_order_density", historical_order_density),
        historical_order_density,
    )
    zone_risk = _coerce_float(_value(zone, "base_risk_score", 0.5), 0.5)
    zone_road_accessibility = _value(zone, "road_accessibility", None)
    road_score = (
        _coerce_float(zone_road_accessibility, road_accessibility)
        if zone_road_accessibility is not None
        else max(0.0, min(1.0, 1.0 - (zone_risk * 0.35)))
    )
    live_density = _value(zone, "live_delivery_density", None)
    if live_density is None:
        live_density = max(0.0, min(1.0, live_deliveries_per_hour / 10.0))

    platform = str(_value(zone, "platform_type", platform_type) or platform_type).lower()

    return {
        "base_earning": float(BASE_EARNINGS.get(str(shift).lower(), 300)),
        "area_type_score": _area_score(area_type),
        "footfall_score": float(zone_footfall),
        "warehouse_distance_km": float(warehouse_distance_km),
        "road_accessibility": float(road_score),
        "live_delivery_density": float(_coerce_float(live_density, live_deliveries_per_hour / 10.0)),
        "historical_order_density": float(zone_density),
        "live_deliveries_per_hour": float(live_deliveries_per_hour),
        "platform_bias": 1.0 if platform == "blinkit" else 0.92,
    }


def build_fraud_feature_map(
    db: Session | None,
    claim: Claim,
    worker: Any,
    trigger_event: Any = None,
    duplicate_flag: bool = False,
) -> dict[str, float]:
    trigger_event = trigger_event or _value(claim, "trigger_event", None)
    worker_id = _value(worker, "id", None)
    worker_zone_id = _value(worker, "zone_id", None)
    claim_id = _value(claim, "id", None)
    trigger_event_id = _value(claim, "trigger_event_id", None)

    gap_seconds = 0.0
    worker_last_active = _value(worker, "last_active_at", None)
    trigger_started = _value(trigger_event, "started_at", None)
    claim_created = _value(claim, "created_at", None)

    if worker_last_active and trigger_started:
        gap_seconds = abs((trigger_started - worker_last_active).total_seconds())
    elif worker_last_active and claim_created:
        gap_seconds = abs((claim_created - worker_last_active).total_seconds())

    zone_match = 1.0
    if trigger_event is not None and worker_zone_id:
        zone_match = 1.0 if worker_zone_id == _value(trigger_event, "zone_id", None) else 0.0

    worker_claim_count = 0
    zone_claim_count = 0
    if db is not None and worker_id:
        worker_claim_count = db.query(Claim).filter(Claim.worker_id == worker_id).count()
        if worker_zone_id:
            from app.models.worker import Worker

            zone_claim_count = (
                db.query(Claim)
                .join(Worker)
                .filter(Worker.zone_id == worker_zone_id)
                .count()
            )

    registered_at = _value(worker, "registered_at", None)
    account_age_days = 1
    if registered_at and claim_created:
        account_age_days = max(1, (claim_created - registered_at).days)

    historical_claim_freq = worker_claim_count / max(account_age_days, 1)
    shift_consistency = _shift_consistency(_value(worker, "shifts", []), claim_created)
    duplicate_claim = 1.0 if duplicate_flag else 0.0

    if not duplicate_flag and db is not None and worker_id and trigger_event_id:
        duplicate_claim = float(
            db.query(Claim)
            .filter(
                Claim.worker_id == worker_id,
                Claim.trigger_event_id == trigger_event_id,
                Claim.id != claim_id,
            )
            .count()
            > 0
        )

    return {
        "online_to_trigger_gap_sec": float(gap_seconds),
        "gps_zone_match_score": float(zone_match),
        "historical_claim_freq": float(historical_claim_freq),
        "claim_density_rank": float(zone_claim_count),
        "shift_consistency": float(shift_consistency),
        "duplicate_flag": float(duplicate_claim),
        "account_age_days": float(account_age_days),
        "worker_online": 1.0 if _value(worker, "is_online", False) else 0.0,
        "severity_multiplier": float(_value(claim, "severity_multiplier", 1.0)),
    }
