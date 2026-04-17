# EasyKavach Backend

The backend is a FastAPI app with a small ML layer for earnings prediction and fraud scoring.

## Install

From the `backend/` folder:

```bash
pip install -r requirements.txt
```

Optional demo and database helpers:

```bash
pip install -r requirements-optional.txt
```

## Run

From the repo root, this is the preferred command:

```bash
uvicorn backend.main:app --reload
```

If you are already inside `backend/`, this still works:

```bash
python run.py
```

## Model files

The loader accepts both of these layouts:

```text
backend/ml/easykavach_earnings_model.pt
backend/ml/easykavach_fraud_model.pt
backend/ml/easykavach_model_metadata.pt
backend/ml/script.py
```

or the existing nested layout:

```text
backend/app/ml/earnings_predictor/model/easykavach_earnings_model.pt
backend/app/ml/fraud_classifier/model/easykavach_fraud_model.pt
backend/app/ml/metadata/easykavach_model_metadata.pt
backend/app/ml/script.py
```

## CSV demo

`script.py` looks for `easykavach_engineered_dataset.csv` in:

1. `backend/ml/easykavach_engineered_dataset.csv`
2. `backend/ml/data/easykavach_engineered_dataset.csv`
3. repo root `easykavach_engineered_dataset.csv`
4. `backend/app/ml/easykavach_engineered_dataset.csv`
5. `backend/app/ml/data/easykavach_engineered_dataset.csv`

You can also override the path with `--csv` or `EASYKAVACH_DATASET_PATH`.
