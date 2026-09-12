# GridPilot ML Intelligence Backend

GridPilot is an advanced renewable energy intelligence backend designed for solar power plant forecasting, uncertainty quantification, operational risk classification, battery dispatch recommendations, and what-if scenario simulations.

---

## 1. System Pipeline Architecture

```
Demo Telemetry Data (Sites, Generation, Weather, Operations)
   ↓
Data Loading & Validation (app/data)
   ↓
Feature Engineering (app/ml/features.py)
   ↓
XGBoost Generation Forecasting (app/ml/train.py, predict.py)
   ↓
Residual Uncertainty Intervals (app/services/uncertainty_service.py)
   ↓
Surplus & Shortfall Detection (app/engines/surplus_engine.py, shortfall_engine.py)
   ↓
Deterministic Risk Engine (app/engines/risk_engine.py)
   ↓
Operational Decision & Recommendation Engine (app/engines/decision_engine.py)
   ↓
What-If Scenario Simulation (app/services/simulation_service.py)
```

---

## 2. Directory Structure

```
backend/mlengine/
├── app/
│   ├── api/          # FastAPI REST endpoints (/health, /risk, /decisions, /simulate)
│   ├── core/         # Configurable operational constants and thresholds
│   ├── data/         # Loaders and strict data validators
│   ├── engines/      # Deterministic decision, risk, surplus, and shortfall engines
│   ├── ml/           # XGBoost training, inference, feature engineering, and evaluation
│   ├── schemas/      # Pydantic data schemas
│   └── services/     # Orchestrating business logic services
├── data/
│   ├── demo/         # Synthetic demo datasets (sites.json, generation.csv, weather.csv, operations.csv)
│   ├── processed/    # ML-ready engineered feature datasets (solar_features.csv)
│   └── raw/          # Raw input store
├── models/
│   └── xgboost/      # Trained XGBoost estimator and uncertainty metadata
├── tests/            # Automated pytest regression suite (9 test suites, 98+ tests)
├── requirements.txt  # Python package dependencies
├── main.py           # Top-level ASGI entrypoint
└── README.md
```

---

## 3. Getting Started

### Installation & Environment Setup
```bash
cd backend/mlengine
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Running the XGBoost Training Pipeline
```bash
python -m app.ml.train
```

### Running Automated Test Suite
```bash
pytest -q
```

### Starting the API Server
```bash
uvicorn app.main:app --reload
```
Interactive API documentation is available at:
`http://127.0.0.1:8000/docs`
