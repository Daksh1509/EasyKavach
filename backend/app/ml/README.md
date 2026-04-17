# EasyKavach ML Layout

The ML layer is organized so the app can load trained artifacts directly instead of relying on hard-coded heuristics.

## Structure

```text
app/ml/
  __init__.py
  artifacts.py
  features.py
  script.py
  earnings_predictor/
    model/
      easykavach_earnings_model.pt
  fraud_classifier/
    model/
      easykavach_fraud_model.pt
  metadata/
    easykavach_model_metadata.pt
  data/
    .gitkeep
```

For compatibility, the loader also accepts a flat `backend/ml/` drop-in layout for the model files and CSV demo data.

## What each file does

- `easykavach_earnings_model.pt` is the trained shift earnings regressor.
- `easykavach_fraud_model.pt` is the fraud probability classifier.
- `easykavach_model_metadata.pt` stores feature names, label encoders, and any default feature values the models need.
- `features.py` converts domain objects like `Worker`, `Zone`, `Claim`, and `TriggerEvent` into model-ready feature maps.
- `artifacts.py` loads the serialized artifacts and feeds them the feature frames.
- `script.py` is a CSV-backed demo runner for local inference checks.

## CSV input

`script.py` looks for `easykavach_engineered_dataset.csv` in `backend/ml/` first, then `backend/ml/data/`, then the repo root, and finally the existing `app/ml/` locations. It also honors the `EASYKAVACH_DATASET_PATH` environment variable or the `--csv` CLI flag.

## Expected metadata shape

The loader understands a flexible metadata payload, but the preferred structure is:

```python
{
  "earnings": {
    "feature_names": [...],
    "label_encoders": {...},
    "defaults": {...}
  },
  "fraud": {
    "feature_names": [...],
    "label_encoders": {...},
    "defaults": {...}
  }
}
```

If the metadata file is missing, the app falls back to the built-in feature order so the backend still starts cleanly.
