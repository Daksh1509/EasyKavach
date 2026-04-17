from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Type


def _enum_fallback(enum_cls: Type[Enum]) -> str:
    members = list(enum_cls)
    return members[0].value if members else ""


def normalize_enum_value(value: Any, enum_cls: Type[Enum], fallback: str | None = None) -> str:
    if fallback is None:
        fallback = _enum_fallback(enum_cls)

    if value is None:
        return fallback

    raw_value = getattr(value, "value", value)
    if isinstance(raw_value, Enum):
        raw_value = raw_value.value

    candidate = str(raw_value).strip()
    if not candidate:
        return fallback

    try:
        return enum_cls(candidate).value
    except Exception:
        try:
            return enum_cls[candidate].value
        except Exception:
            return fallback


def safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_str(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    try:
        return str(value)
    except Exception:
        return fallback


def safe_datetime(value: Any, fallback: datetime | None = None) -> datetime:
    if isinstance(value, datetime):
        return value
    return fallback or datetime.utcnow()


def safe_date(value: Any, fallback: date | None = None) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return fallback or datetime.utcnow().date()


def safe_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [safe_str(item) for item in value if item is not None]
    if value is None:
        return []
    return [safe_str(value)]
