from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import pandas as pd

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.ml.artifacts import (
    EARNINGS_MODEL_PATH,
    FRAUD_MODEL_PATH,
    METADATA_PATH,
    load_metadata,
    predict_expected_shift_earning,
    predict_fraud_probability,
)

DATASET_ENV_VAR = "EASYKAVACH_DATASET_PATH"
DATASET_CANDIDATES = (
    Path(__file__).resolve().parents[3] / "easykavach_engineered_dataset.csv",
    Path(__file__).resolve().parent / "easykavach_engineered_dataset.csv",
    Path(__file__).resolve().parent / "data" / "easykavach_engineered_dataset.csv",
)

MODEL_FEATURE_SPECS: tuple[tuple[str, str, bool], ...] = (
    ("Delivery_person_Age", "Delivery_person_Age", False),
    ("Delivery_person_Ratings", "Delivery_person_Ratings", False),
    ("Vehicle_condition", "Vehicle_condition", False),
    ("multiple_deliveries", "multiple_deliveries", False),
    ("distance_km", "distance_km", False),
    ("area_score", "area_score", False),
    ("footfall_score", "footfall_score", False),
    ("warehouse_dist_score", "warehouse_dist_score", False),
    ("road_score", "road_score", False),
    ("deliveries_per_hour", "deliveries_per_hour", False),
    ("weather_risk", "weather_risk", False),
    ("base_earning", "base_earning", False),
    ("account_age_days", "account_age_days", False),
    ("shift_type", "shift_enc", True),
    ("Weather_conditions", "weather_enc", True),
    ("Road_traffic_density", "traffic_enc", True),
    ("City", "city_enc", True),
    ("Type_of_vehicle", "vtype_enc", True),
    ("Time_taken (min)", "Time_taken (min)", False),
)


def _clean_value(value: Any) -> Any:
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if isinstance(value, str):
        return value.strip()

    return value


def _coerce_float(value: Any, default: float = 0.0) -> float:
    value = _clean_value(value)
    if value is None:
        return float(default)

    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def resolve_dataset_path(explicit_path: str | None = None) -> Path:
    candidates: list[Path] = []

    if explicit_path:
        candidates.append(Path(explicit_path).expanduser())

    env_path = os.getenv(DATASET_ENV_VAR)
    if env_path:
        candidates.append(Path(env_path).expanduser())

    candidates.extend(DATASET_CANDIDATES)

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    searched = ", ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(f"Could not find easykavach_engineered_dataset.csv. Searched: {searched}")


def load_dataset(dataset_path: Path) -> pd.DataFrame:
    return pd.read_csv(dataset_path)


def _build_feature_map_from_row(row: pd.Series) -> dict[str, Any]:
    feature_map: dict[str, Any] = {}

    # Copy all fields from row first
    for col, value in row.items():
        feature_map[col] = _clean_value(value)

    # Apply specific overrides/renames from MODEL_FEATURE_SPECS
    for source_column, model_column, is_categorical in MODEL_FEATURE_SPECS:
        raw_value = _clean_value(row.get(source_column))
        if is_categorical:
            feature_map[model_column] = raw_value
        else:
            feature_map[model_column] = _coerce_float(raw_value, 0.0)

    return feature_map


def _sample_prediction(row: pd.Series, row_index: int) -> dict[str, Any]:
    feature_map = _build_feature_map_from_row(row)

    earnings_prediction = predict_expected_shift_earning(feature_map)
    fraud_probability = predict_fraud_probability(feature_map)

    actual_earnings = _clean_value(row.get("expected_shift_earning"))
    actual_fraud = _clean_value(row.get("is_fraud"))

    earnings_error = None
    if earnings_prediction is not None and actual_earnings is not None:
        earnings_error = round(abs(float(earnings_prediction) - float(actual_earnings)), 2)

    predicted_fraud_label = None
    fraud_match = None
    if fraud_probability is not None:
        predicted_fraud_label = bool(fraud_probability >= 0.5)
        if actual_fraud is not None:
            fraud_match = predicted_fraud_label == bool(int(float(actual_fraud)))

    return {
        "row_index": row_index,
        "delivery_person_id": _clean_value(row.get("Delivery_person_ID")),
        "shift_type": _clean_value(row.get("shift_type")),
        "city": _clean_value(row.get("City")),
        "actual_expected_shift_earning": actual_earnings,
        "predicted_expected_shift_earning": earnings_prediction,
        "earnings_abs_error": earnings_error,
        "actual_is_fraud": actual_fraud,
        "predicted_fraud_probability": fraud_probability,
        "predicted_fraud_label": predicted_fraud_label,
        "fraud_label_match": fraud_match,
    }


def demo(dataset_path: str | None = None, limit: int = 5) -> dict[str, object]:
    resolved_path = resolve_dataset_path(dataset_path)
    dataset = load_dataset(resolved_path)
    sample_limit = max(0, min(int(limit), len(dataset)))

    sample_predictions = [
        _sample_prediction(row, int(index))
        for index, row in dataset.head(sample_limit).iterrows()
    ]

    earnings_errors = [
        float(item["earnings_abs_error"])
        for item in sample_predictions
        if item["earnings_abs_error"] is not None
    ]
    fraud_matches = [item["fraud_label_match"] for item in sample_predictions if item["fraud_label_match"] is not None]

    return {
        "dataset": {
            "path": str(resolved_path),
            "rows": int(len(dataset)),
            "sample_limit": sample_limit,
        },
        "artifacts": {
            "earnings_model": str(EARNINGS_MODEL_PATH),
            "fraud_model": str(FRAUD_MODEL_PATH),
            "metadata": str(METADATA_PATH),
        },
        "metadata_keys": sorted(load_metadata().keys()),
        "sample_metrics": {
            "earnings_mae": round(sum(earnings_errors) / len(earnings_errors), 2) if earnings_errors else None,
            "fraud_label_agreement": round(sum(1 for match in fraud_matches if match) / len(fraud_matches), 3)
            if fraud_matches
            else None,
        },
        "sample_predictions": sample_predictions,
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run EasyKavach inference against the engineered CSV dataset.")
    parser.add_argument("--csv", dest="csv_path", help="Path to easykavach_engineered_dataset.csv.")
    parser.add_argument("--limit", type=int, default=5, help="How many rows to preview.")
    args = parser.parse_args(argv)

    print(json.dumps(demo(dataset_path=args.csv_path, limit=args.limit), indent=2, default=str))


if __name__ == "__main__":
    main()
