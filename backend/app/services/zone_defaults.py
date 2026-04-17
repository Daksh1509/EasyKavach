from __future__ import annotations

from typing import Any

from app.models.worker import AreaType

ZONE_DEFAULTS: dict[str, dict[str, Any]] = {
    "koramangala_blr": {
        "default_area_type": AreaType.COMMERCIAL,
        "default_warehouse_distance_km": 1.1,
    },
    "velachery_chn": {
        "default_area_type": AreaType.RESIDENTIAL,
        "default_warehouse_distance_km": 1.8,
    },
    "cp_delhi": {
        "default_area_type": AreaType.COMMERCIAL,
        "default_warehouse_distance_km": 0.9,
    },
    "bandra_mumbai": {
        "default_area_type": AreaType.COLLEGE,
        "default_warehouse_distance_km": 1.4,
    },
    "indiranagar_blr": {
        "default_area_type": AreaType.COMMERCIAL,
        "default_warehouse_distance_km": 1.0,
    },
}


def zone_default_area_type(zone_id: str | None) -> AreaType:
    if zone_id and zone_id in ZONE_DEFAULTS:
        return ZONE_DEFAULTS[zone_id]["default_area_type"]
    return AreaType.COMMERCIAL


def zone_default_warehouse_distance(zone_id: str | None) -> float:
    if zone_id and zone_id in ZONE_DEFAULTS:
        return float(ZONE_DEFAULTS[zone_id]["default_warehouse_distance_km"])
    return 1.0

