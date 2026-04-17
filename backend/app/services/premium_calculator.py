from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.ml.artifacts import has_earnings_model
from app.models.worker import Zone

from .income_engine import calculate_expected_shift_earning, calculate_hourly_wage

SHIFT_DURATION_HOURS = 5.0
DEFAULT_SHIFT = "evening"


def _normalize_shifts(shifts: list[str] | None) -> list[str]:
    normalized = [str(shift).strip().lower() for shift in (shifts or []) if str(shift).strip()]
    return normalized or [DEFAULT_SHIFT]


def calculate_weekly_premium(weekly_expected_loss: float, margin_rate: float | None = None) -> float:
    """
    Weekly Premium = Expected Weekly Loss × Margin Rate (10%)
    """
    if margin_rate is None:
        margin_rate = settings.MARGIN_RATE

    premium = float(weekly_expected_loss) * float(margin_rate)
    return round(premium, 2)


def estimate_disruption_probability(
    zone_risk_score: float = 0.5,
    flood_prone: bool = False,
    shift_count: int = 1,
) -> float:
    base_probability = 0.035 + (float(zone_risk_score) * 0.11)
    flood_modifier = 0.035 if flood_prone else 0.0
    shift_modifier = max(0, shift_count - 1) * 0.01
    probability = min(0.25, base_probability + flood_modifier + shift_modifier)
    return round(probability, 4)


def build_policy_quote(
    shifts: list[str] | None,
    area_type: str,
    zone: Zone | None = None,
    warehouse_distance_km: float = 1.0,
    platform_type: str = "Blinkit",
    reliability_score: float = 0.8,
    shift_completion_rate: float = 0.9,
) -> dict[str, Any]:
    normalized_shifts = _normalize_shifts(shifts)
    zone_risk = float(getattr(zone, "base_risk_score", 0.5) if zone else 0.5)
    model_enabled = has_earnings_model()
    shift_forecasts: list[dict[str, float | str]] = []

    for shift in normalized_shifts:
        expected_shift_earning = calculate_expected_shift_earning(
            shift=shift,
            area_type=area_type,
            warehouse_distance_km=warehouse_distance_km,
            platform_type=platform_type,
            zone=zone,
        )
        shift_forecasts.append(
            {
                "shift": shift,
                "expected_shift_earning": round(expected_shift_earning, 2),
                "expected_hourly_wage": calculate_hourly_wage(
                    expected_shift_earning,
                    duration_hours=SHIFT_DURATION_HOURS,
                ),
            }
        )

    daily_expected_earning = round(
        sum(float(forecast["expected_shift_earning"]) for forecast in shift_forecasts),
        2,
    )
    total_daily_hours = max(float(len(shift_forecasts)) * SHIFT_DURATION_HOURS, SHIFT_DURATION_HOURS)
    blended_hourly_wage = round(daily_expected_earning / total_daily_hours, 2)
    weekly_expected_earning = round(daily_expected_earning * 7, 2)
    disruption_probability = estimate_disruption_probability(
        zone_risk_score=zone_risk,
        flood_prone=bool(getattr(zone, "flood_prone", False)),
        shift_count=len(shift_forecasts),
    )
    weekly_expected_loss = round(weekly_expected_earning * disruption_probability, 2)
    premium_amount = calculate_weekly_premium(weekly_expected_loss)
    top_shift = max(shift_forecasts, key=lambda forecast: forecast["expected_shift_earning"])

    # Phase 3: Individual Behavioral Analysis — adjust premium by worker profile.
    # High-reliability workers (consistent history, high completion rate) are
    # lower risk → slight premium discount. Low-reliability → slight surcharge.
    behavioral_score = round((float(reliability_score) * 0.6) + (float(shift_completion_rate) * 0.4), 4)
    # Maps behavioral_score [0.5, 1.0] → premium_modifier [1.05, 0.95] (inverse — better worker = lower premium)
    premium_modifier = round(1.05 - (behavioral_score - 0.5) * 0.20, 4)
    premium_modifier = max(0.90, min(1.10, premium_modifier))
    adjusted_premium = round(premium_amount * premium_modifier, 2)

    # Radius-ring context for transparency
    radius_ring = getattr(zone, "dark_store_radius_ring", None) if zone else None
    pincode = getattr(zone, "pincode", None) if zone else None

    return {
        "model_enabled": model_enabled,
        "pricing_mode": "random_forest" if model_enabled else "formula_fallback",
        "zone_id": getattr(zone, "id", None),
        "zone_name": getattr(zone, "name", None),
        "pincode": pincode,
        "dark_store_radius_ring": radius_ring,
        "risk_score": zone_risk,
        "disruption_probability": disruption_probability,
        "selected_shifts": normalized_shifts,
        "shift_forecasts": shift_forecasts,
        "recommended_shift": str(top_shift["shift"]),
        "expected_daily_earning": daily_expected_earning,
        "expected_weekly_earning": weekly_expected_earning,
        "expected_weekly_loss": weekly_expected_loss,
        "premium_amount": adjusted_premium,
        "base_premium_amount": premium_amount,
        "behavioral_score": behavioral_score,
        "premium_modifier": premium_modifier,
        "hourly_income_floor": blended_hourly_wage,
    }


def estimate_worker_risk_loss(
    shifts: list[str],
    area_type: str,
    zone_risk_score: float = 0.5,
    zone: Zone | None = None,
    warehouse_distance_km: float = 1.0,
    platform_type: str = "Blinkit",
    reliability_score: float = 0.8,
    shift_completion_rate: float = 0.9,
) -> float:
    quote = build_policy_quote(
        shifts=shifts,
        area_type=area_type,
        zone=zone,
        warehouse_distance_km=warehouse_distance_km,
        platform_type=platform_type,
        reliability_score=reliability_score,
        shift_completion_rate=shift_completion_rate,
    )
    if zone is None:
        zone_probability = estimate_disruption_probability(
            zone_risk_score=zone_risk_score,
            shift_count=len(_normalize_shifts(shifts)),
        )
        return round(quote["expected_weekly_earning"] * zone_probability, 2)
    return float(quote["expected_weekly_loss"])
