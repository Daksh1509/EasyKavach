from __future__ import annotations

from typing import Optional

from app.ml.artifacts import predict_expected_shift_earning
from app.ml.features import AREA_SCORES, BASE_EARNINGS, build_earnings_feature_map
from app.models.worker import AreaType, Zone

# Phase 3: Radius-ring earning multipliers.
# Workers closer to the dark store (0-1km) earn more per shift due to shorter
# delivery distances and higher order density near the hub.
RADIUS_RING_MULTIPLIERS: dict[str, float] = {
    "0-1km": 1.15,   # Zone A — highest earning potential
    "1-2km": 1.00,   # Zone B — baseline
    "2-3km": 0.88,   # Zone C — longer trips, fewer orders
}


def _legacy_weighted_formula(
    shift: str,
    area_type: AreaType,
    footfall_score: float = 0.5,
    historical_order_density: float = 0.5,
    warehouse_distance_km: float = 1.0,
    road_accessibility: float = 1.0,
    live_deliveries_per_hour: float = 2.0,
    platform_type: str = "Blinkit",
    zone: Optional[Zone] = None,
) -> float:
    """Fallback formula kept only when the model artifact is unavailable."""
    B = BASE_EARNINGS.get(str(shift).lower(), 300)
    A = AREA_SCORES.get(area_type, 5)

    zone_footfall = getattr(zone, "footfall_score", footfall_score) if zone else footfall_score
    zone_density = (
        getattr(zone, "historical_order_density", historical_order_density)
        if zone
        else historical_order_density
    )
    zone_risk = getattr(zone, "base_risk_score", 0.5) if zone else 0.5
    zone_road_accessibility = getattr(zone, "road_accessibility", None) if zone else None
    road_score = (
        float(zone_road_accessibility)
        if zone_road_accessibility is not None
        else max(0.0, min(1.0, 1.0 - (zone_risk * 0.35)))
    )
    live_density = getattr(zone, "live_delivery_density", None) if zone else None
    if live_density is None:
        live_density = live_deliveries_per_hour / 10.0

    F = float(zone_footfall)
    D = max(0, (5 - warehouse_distance_km) / 5)
    R = road_score
    N = float(live_density)
    H = float(zone_density)
    P = 1.1 if str(platform_type).lower() == "blinkit" else 1.0

    E = (B + (20 * A) + (15 * F) + (25 * D) + (30 * R) + (40 * N) + (50 * H)) * P
    return round(E, 2)


def calculate_expected_shift_earning(
    shift: str,
    area_type: AreaType,
    footfall_score: float = 0.5,
    historical_order_density: float = 0.5,
    warehouse_distance_km: float = 1.0,
    road_accessibility: float = 1.0,
    live_deliveries_per_hour: float = 2.0,
    platform_type: str = "Blinkit",
    zone: Optional[Zone] = None,
) -> float:
    feature_map = build_earnings_feature_map(
        shift=shift,
        area_type=area_type,
        footfall_score=footfall_score,
        historical_order_density=historical_order_density,
        warehouse_distance_km=warehouse_distance_km,
        road_accessibility=road_accessibility,
        live_deliveries_per_hour=live_deliveries_per_hour,
        platform_type=platform_type,
        zone=zone,
    )

    prediction = predict_expected_shift_earning(feature_map)
    base = (
        round(prediction, 2)
        if prediction is not None
        else _legacy_weighted_formula(
            shift=shift,
            area_type=area_type,
            footfall_score=footfall_score,
            historical_order_density=historical_order_density,
            warehouse_distance_km=warehouse_distance_km,
            road_accessibility=road_accessibility,
            live_deliveries_per_hour=live_deliveries_per_hour,
            platform_type=platform_type,
            zone=zone,
        )
    )

    # Phase 3: Apply radius-ring multiplier based on zone proximity to dark store
    ring = getattr(zone, "dark_store_radius_ring", None) if zone else None
    ring_multiplier = RADIUS_RING_MULTIPLIERS.get(ring, 1.0) if ring else 1.0
    return round(base * ring_multiplier, 2)


def calculate_hourly_wage(expected_shift_earning: float, duration_hours: float = 5.0) -> float:
    return round(expected_shift_earning / duration_hours, 2)
