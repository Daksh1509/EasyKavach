from __future__ import annotations

import importlib.util
import logging
import pickle
import warnings
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import settings
logger = logging.getLogger(__name__)

try:  # pragma: no cover - the warning class is version-specific
    from sklearn.exceptions import InconsistentVersionWarning
except Exception:  # pragma: no cover - older/newer sklearn builds may differ
    InconsistentVersionWarning = None

import sys
import types
from sklearn.pipeline import Pipeline
import numpy as np
import sklearn.compose._column_transformer

# Hack for older sklearn model pipelines unpickling in newer sklearn
class _RemainderColsList:
    pass

if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
    sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

# Hack for models pickled referencing a module "Pipeline" looking for "dtype"
pm = types.ModuleType("Pipeline")
pm.Pipeline = Pipeline
pm.dtype = np.dtype
sys.modules["Pipeline"] = pm

PACKAGE_ML_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT_CANDIDATES = (
    PACKAGE_ML_ROOT,
)


def _resolve_artifact_path(*relative_candidates: str) -> Path:
    for root in ARTIFACT_ROOT_CANDIDATES:
        for relative_candidate in relative_candidates:
            candidate = root / relative_candidate
            if candidate.exists():
                return candidate

    return ARTIFACT_ROOT_CANDIDATES[-1] / relative_candidates[-1]


EARNINGS_MODEL_PATH = settings.EARNINGS_MODEL_PATH
FRAUD_MODEL_PATH = settings.FRAUD_MODEL_PATH
METADATA_PATH = settings.METADATA_PATH

DEFAULT_EARNINGS_FEATURES = [
    "Delivery_person_Age",
    "Delivery_person_Ratings",
    "Vehicle_condition",
    "multiple_deliveries",
    "distance_km",
    "area_score",
    "footfall_score",
    "warehouse_dist_score",
    "road_score",
    "deliveries_per_hour",
    "weather_risk",
    "base_earning",
    "account_age_days",
    "shift_enc",
    "weather_enc",
    "traffic_enc",
    "city_enc",
    "vtype_enc",
]

DEFAULT_FRAUD_FEATURES = [
    "Delivery_person_Age",
    "Delivery_person_Ratings",
    "Vehicle_condition",
    "multiple_deliveries",
    "distance_km",
    "area_score",
    "footfall_score",
    "warehouse_dist_score",
    "road_score",
    "deliveries_per_hour",
    "weather_risk",
    "base_earning",
    "account_age_days",
    "shift_enc",
    "weather_enc",
    "traffic_enc",
    "city_enc",
    "vtype_enc",
    "Time_taken (min)",
]


def _load_with_torch(path: Path) -> Any:
    if importlib.util.find_spec("torch") is None:
        raise RuntimeError("torch is not installed")

    import torch

    return torch.load(path, map_location="cpu")


def _load_with_pickle(path: Path) -> Any:
    with path.open("rb") as handle:
        return pickle.load(handle)


def _load_serialized_artifact(path: Path) -> Any | None:
    if not path.exists():
        logger.warning("ML artifact not found: %s", path)
        return None

    loaders = (
        joblib.load,
        _load_with_pickle,
        _load_with_torch,
    )

    for loader in loaders:
        try:
            val = None
            if loader is joblib.load and InconsistentVersionWarning is not None:
                with warnings.catch_warnings():
                    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
                    val = loader(path)
            else:
                val = loader(path)
            
            if isinstance(val, dict) and 'pipeline' in val:
                return val['pipeline']
            return val
        except Exception as exc:  # pragma: no cover - loader fallbacks are runtime-safe
            logger.debug("Failed to load %s with %s: %s", path.name, loader, exc)

    logger.warning("Unable to deserialize ML artifact: %s", path)
    return None


def _metadata_section(model_key: str) -> dict[str, Any]:
    metadata = load_metadata()
    if not isinstance(metadata, dict):
        return {}

    for candidate in (
        model_key,
        model_key.replace("_model", ""),
        f"{model_key}_model",
    ):
        section = metadata.get(candidate)
        if isinstance(section, dict):
            return section

    if any(
        key in metadata
        for key in (
            "feature_names",
            "label_encoders",
            "defaults",
            "earnings_features",
            "fraud_features",
        )
    ):
        return metadata

    return {}


def _feature_names(model_key: str, fallback: list[str]) -> list[str]:
    section = _metadata_section(model_key)
    for key in (
        f"{model_key}_features",
        f"{model_key}_feature_names",
        "feature_names",
        "ordered_features",
        "features",
        "inputs",
    ):
        names = section.get(key)
        if isinstance(names, list) and names:
            return [str(name) for name in names]
    return fallback


def _encoders(model_key: str) -> dict[str, Any]:
    section = _metadata_section(model_key)
    for key in ("label_encoders", "encoders", "feature_encoders"):
        encoders = section.get(key)
        if isinstance(encoders, dict):
            model_encoders = dict(encoders)
            alias_map = {
                "shift_enc": "shift",
                "weather_enc": "weather",
                "traffic_enc": "traffic",
                "city_enc": "city",
                "vtype_enc": "vehicle_type",
            }
            for alias, source in alias_map.items():
                encoder = encoders.get(source)
                if encoder is not None:
                    model_encoders.setdefault(alias, encoder)
            return model_encoders
    return {}


def _defaults(model_key: str) -> dict[str, Any]:
    section = _metadata_section(model_key)
    for key in ("defaults", "default_values", "fill_values"):
        defaults = section.get(key)
        if isinstance(defaults, dict):
            return defaults
    return {}


def _encode_value(value: Any, encoder: Any) -> Any:
    if value is None:
        return None

    if encoder is None:
        return value

    if isinstance(encoder, dict):
        candidates = [value, str(value), str(value).lower()]
        for candidate in candidates:
            if candidate in encoder:
                return encoder[candidate]

    if hasattr(encoder, "transform"):
        try:
            transformed = encoder.transform([value])
            if hasattr(transformed, "__getitem__"):
                return transformed[0]
            return transformed
        except Exception:
            return value

    return value


def _coerce_numeric(value: Any, default: float = 0.0) -> float:
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


def _label_to_probability(label: Any) -> float | None:
    normalized = str(label).strip().lower()
    if normalized in {"1", "1.0", "true", "yes", "fraud", "failed", "flagged", "review"}:
        return 1.0
    if normalized in {"0", "0.0", "false", "no", "passed", "approved", "safe", "clear"}:
        return 0.0
    return None


def _build_feature_frame(model_key: str, feature_map: dict[str, Any], fallback: list[str]) -> pd.DataFrame:
    feature_names = _feature_names(model_key, fallback)
    encoders = _encoders(model_key)
    defaults = _defaults(model_key)

    row: list[float] = []
    for feature_name in feature_names:
        raw_value = feature_map.get(feature_name, defaults.get(feature_name, 0.0))
        encoded_value = _encode_value(raw_value, encoders.get(feature_name))
        row.append(_coerce_numeric(encoded_value, defaults.get(feature_name, 0.0)))

    return pd.DataFrame([row], columns=feature_names)


@lru_cache(maxsize=1)
def load_metadata() -> dict[str, Any]:
    metadata = _load_serialized_artifact(METADATA_PATH)
    return metadata if isinstance(metadata, dict) else {}


@lru_cache(maxsize=1)
def load_earnings_model() -> Any | None:
    return _load_serialized_artifact(EARNINGS_MODEL_PATH)


@lru_cache(maxsize=1)
def load_fraud_model() -> Any | None:
    return _load_serialized_artifact(FRAUD_MODEL_PATH)


def has_earnings_model() -> bool:
    return load_earnings_model() is not None


def has_fraud_model() -> bool:
    return load_fraud_model() is not None


def _predict(model: Any | None, feature_frame: pd.DataFrame, probability: bool = False) -> float | None:
    if model is None:
        return None

    try:
        if probability and hasattr(model, "predict_proba"):
            proba = model.predict_proba(feature_frame)
            if hasattr(proba, "shape") and len(proba.shape) == 2 and proba.shape[1] > 1:
                return float(proba[0][-1])

        prediction = model.predict(feature_frame)
        if hasattr(prediction, "__getitem__"):
            prediction = prediction[0]

        try:
            return float(prediction)
        except (TypeError, ValueError):
            label_probability = _label_to_probability(prediction)
            return label_probability
    except Exception as exc:
        logger.warning("ML inference failed: %s", exc)
        import traceback; traceback.print_exc()
        return None


def predict_expected_shift_earning(feature_map: dict[str, Any]) -> float | None:
    model = load_earnings_model()
    # Force use of the model's explicitly expected feature names to bypass any stale metadata
    feature_names = list(getattr(model, "feature_names_in_", DEFAULT_EARNINGS_FEATURES))
    
    encoders = _encoders("earnings")
    defaults = _defaults("earnings")
    
    row = []
    for f in feature_names:
        # Pass raw values; sklearn pipelines handle encoding and imputation internally
        row.append(feature_map.get(f, None))
        
    feature_frame = pd.DataFrame([row], columns=feature_names)
    return _predict(model, feature_frame, probability=False)


def predict_fraud_probability(feature_map: dict[str, Any]) -> float | None:
    model = load_fraud_model()
    # Force use of the model's explicitly expected feature names to bypass any stale metadata
    feature_names = list(getattr(model, "feature_names_in_", DEFAULT_FRAUD_FEATURES))
    
    encoders = _encoders("fraud")
    defaults = _defaults("fraud")
    
    row = []
    for f in feature_names:
        # Pass raw values; sklearn pipelines handle encoding and imputation internally
        row.append(feature_map.get(f, None))
        
    feature_frame = pd.DataFrame([row], columns=feature_names)
    return _predict(model, feature_frame, probability=True)
