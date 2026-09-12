# GridSense AI --- Backend Architecture & Implementation Plan

> This file defines the backend implementation for the GridSense AI MVP.
> `PLAN.md` remains the product-level source of truth. This document
> expands the backend responsibilities, service boundaries, APIs, AI/ML
> pipeline, and integration strategy.

------------------------------------------------------------------------

## 1. Backend Goal

The backend must implement the complete intelligence pipeline:

``` text
DATA
  ↓
VALIDATION
  ↓
FEATURE ENGINEERING
  ↓
FORECAST
  ↓
UNCERTAINTY
  ↓
RISK
  ↓
SCENARIO SIMULATION
  ↓
DECISION ENGINE
  ↓
RECOMMENDATION
  ↓
REST API
  ↓
REACT FRONTEND
```

The backend is decision-support only. It must never autonomously control
batteries, generators, grid infrastructure, or curtailment systems.

------------------------------------------------------------------------

# 2. Technology Split

## Python --- AI/ML + Energy Intelligence

Python owns:

-   Data loading and cleaning
-   Time-series feature engineering
-   XGBoost forecasting
-   Model training and evaluation
-   Forecast inference
-   Forecast uncertainty
-   Surplus/shortfall detection
-   Risk classification
-   Scenario calculations
-   Decision engine
-   Recommendation generation
-   Energy-domain calculations
-   Optional LLM explanation layer

Primary stack:

-   Python
-   FastAPI
-   Pydantic
-   Pandas
-   NumPy
-   Scikit-learn
-   XGBoost
-   Uvicorn

## Node.js --- Application/Integration Layer

Node.js is NOT the ML engine.

Use Node.js only where it provides value for application integration:

-   Optional API gateway/BFF
-   Frontend-facing proxy if required
-   Request aggregation
-   Authentication/session middleware if authentication is added later
-   WebSocket/SSE gateway if real-time updates are added later
-   External integration adapters if needed

For the MVP, Node.js should remain minimal. The React/Vite frontend
already uses Node.js for development and build tooling, but the core
backend intelligence stays in Python.

### Recommended MVP architecture

``` text
React + Vite
     ↓
FastAPI
     ↓
Python Services
     ↓
ML + Risk + Decision + Simulation
```

Do NOT add a Node.js server just for the sake of having Node.js.

If a Node.js gateway is later required:

``` text
React
  ↓
Node.js Gateway
  ↓
FastAPI
  ↓
AI/ML Services
```

------------------------------------------------------------------------

# 3. Backend Folder Structure

``` text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── health.py
│   │   ├── sites.py
│   │   ├── forecast.py
│   │   ├── risk.py
│   │   ├── simulation.py
│   │   ├── decisions.py
│   │   └── system.py
│   │
│   ├── schemas/
│   │   ├── site.py
│   │   ├── forecast.py
│   │   ├── risk.py
│   │   ├── simulation.py
│   │   └── decision.py
│   │
│   ├── services/
│   │   ├── data_service.py
│   │   ├── forecast_service.py
│   │   ├── uncertainty_service.py
│   │   ├── risk_service.py
│   │   ├── simulation_service.py
│   │   └── decision_service.py
│   │
│   ├── ml/
│   │   ├── features.py
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── evaluate.py
│   │   └── model_manager.py
│   │
│   ├── engines/
│   │   ├── risk_engine.py
│   │   ├── surplus_engine.py
│   │   ├── shortfall_engine.py
│   │   └── decision_engine.py
│   │
│   ├── data/
│   │   ├── loaders/
│   │   ├── validators/
│   │   └── preprocessors/
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── logging.py
│   │   └── constants.py
│   │
│   └── utils/
│       └── time.py
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── demo/
│
├── models/
│   └── xgboost/
│
├── tests/
│   ├── test_forecast.py
│   ├── test_risk.py
│   ├── test_decision.py
│   └── test_simulation.py
│
├── requirements.txt
├── .env.example
└── README.md
```

------------------------------------------------------------------------

# 4. Layer Responsibilities

## 4.1 API Layer

FastAPI routes expose backend capabilities.

The API layer must:

-   Validate requests
-   Call services
-   Return Pydantic responses
-   Handle errors
-   Never contain ML algorithms
-   Never contain complex decision logic

## 4.2 Service Layer

Services orchestrate business operations.

Example:

``` text
forecast_service
    ↓
load data
    ↓
build features
    ↓
run model
    ↓
calculate uncertainty
    ↓
return forecast
```

## 4.3 ML Layer

The ML layer owns only machine-learning concerns:

-   Feature generation
-   Training
-   Validation
-   Evaluation
-   Prediction
-   Model loading/versioning

## 4.4 Engine Layer

The engine layer owns deterministic energy intelligence:

-   Shortfall
-   Surplus
-   Risk
-   Available resources
-   Action selection

This layer must remain understandable without an ML model.

------------------------------------------------------------------------

# 5. Data Layer

The MVP must work without external services.

## Demo mode

Use CSV/JSON files.

Example:

``` text
data/demo/
├── sites.json
├── generation.csv
├── weather.csv
└── operations.csv
```

## Live mode

External weather data may be added later.

External API failure must fall back to demo data.

------------------------------------------------------------------------

# 6. Core Data Contracts

## Site

``` json
{
  "id": "solar-01",
  "name": "Solar Plant 01",
  "location": "Demo Location",
  "technology": "solar",
  "capacity_mw": 100
}
```

## Generation Record

``` json
{
  "timestamp": "2026-01-01T12:00:00",
  "site_id": "solar-01",
  "generation_mw": 72
}
```

## Weather Record

Use only fields actually available:

``` json
{
  "timestamp": "2026-01-01T12:00:00",
  "cloud_cover": 35,
  "temperature": 29,
  "irradiance": 710
}
```

## Operational Record

``` json
{
  "timestamp": "2026-01-01T12:00:00",
  "demand_mw": 78,
  "battery_soc": 68,
  "battery_capacity_mwh": 100,
  "battery_max_discharge_mw": 20,
  "backup_available": true,
  "backup_capacity_mw": 30
}
```

------------------------------------------------------------------------

# 7. Data Validation

Before ML processing:

1.  Validate required columns.
2.  Parse timestamps.
3.  Sort chronologically.
4.  Detect duplicate timestamps.
5.  Detect missing values.
6.  Detect impossible negative values where not allowed.
7.  Validate generation against site capacity where appropriate.
8.  Validate battery SOC range.
9.  Report missing data clearly.

Do not silently invent missing values.

If imputation is used, document the method.

------------------------------------------------------------------------

# 8. Feature Engineering

The ML pipeline may use:

## Historical features

-   Lag generation
-   Previous hour generation
-   Rolling mean
-   Rolling maximum/minimum
-   Recent generation trend

## Time features

-   Hour of day
-   Day of week
-   Month
-   Day of year
-   Solar-period indicators where appropriate

## Weather features

Only when available:

-   Irradiance
-   Cloud cover
-   Temperature
-   Humidity
-   Wind speed

## Site features

-   Installed capacity

Feature creation must be deterministic and reusable for both training
and inference.

------------------------------------------------------------------------

# 9. ML Forecasting Engine

## Model

Use XGBoost as the primary forecasting model.

Do not introduce LSTM, Transformer, or deep-learning models unless a
clear requirement appears later.

## Training

Use time-aware splitting:

``` text
Earlier data
     ↓
TRAIN
     ↓
VALIDATION
     ↓
TEST
```

Never randomly shuffle the primary time-series split.

Avoid data leakage.

## Training flow

``` text
Raw Data
   ↓
Validate
   ↓
Clean
   ↓
Feature Engineering
   ↓
Time Split
   ↓
Train XGBoost
   ↓
Validate
   ↓
Evaluate
   ↓
Save Model
```

## Evaluation

Use:

-   MAE
-   RMSE
-   MAPE where appropriate

Never fabricate accuracy.

Only show measured evaluation results.

------------------------------------------------------------------------

# 10. Forecast Inference

The prediction service receives:

-   Site
-   Historical observations
-   Future weather features if available
-   Forecast horizon

Supported horizons:

-   24 hours
-   48 hours
-   72 hours

Output:

``` json
{
  "site_id": "solar-01",
  "horizon_hours": 24,
  "forecast": [
    {
      "timestamp": "2026-01-01T18:00:00",
      "expected_generation_mw": 52
    }
  ]
}
```

Actual values must come from the model/data.

------------------------------------------------------------------------

# 11. Forecast Uncertainty

The system must communicate that predictions are not perfectly certain.

The uncertainty service returns:

``` json
{
  "expected_generation_mw": 52,
  "lower_bound_mw": 45,
  "upper_bound_mw": 59
}
```

The implementation must use a clearly defined method.

Possible approaches can include model residual-based intervals or
another defensible method.

Do not label an interval as statistically calibrated unless calibration
has actually been performed.

------------------------------------------------------------------------

# 12. Surplus Engine

Basic relationship:

``` text
Generation > Requirement
        ↓
     SURPLUS
```

Possible actions:

1.  Charge storage
2.  Export energy
3.  Curtail generation

The engine checks resource availability before recommending an action.

------------------------------------------------------------------------

# 13. Shortfall Engine

Basic relationship:

``` text
Generation < Requirement
        ↓
    SHORTFALL
```

Possible actions:

1.  Discharge storage
2.  Import energy
3.  Activate backup
4.  Flag critical shortfall

The engine must check constraints.

------------------------------------------------------------------------

# 14. Risk Engine

Risk levels:

``` text
LOW
MEDIUM
HIGH
```

Risk may depend on:

-   Expected shortfall
-   Expected surplus
-   Forecast uncertainty
-   Demand relationship
-   Battery availability
-   Backup availability

Thresholds must be centralized in configuration.

Do not duplicate thresholds across files.

Example configuration:

``` text
LOW
MEDIUM
HIGH
```

The exact numerical thresholds should be based on the demo/data and kept
configurable.

------------------------------------------------------------------------

# 15. Risk Output

``` json
{
  "site_id": "solar-01",
  "risk_level": "HIGH",
  "event_type": "SHORTFALL",
  "start_time": "2026-01-01T18:00:00",
  "end_time": "2026-01-01T20:00:00",
  "expected_deficit_mw": 8
}
```

------------------------------------------------------------------------

# 16. Decision Engine

The decision engine is deterministic.

It receives:

-   Forecast
-   Demand
-   Risk
-   Battery state
-   Backup availability
-   Available grid import/export
-   Operational constraints

It produces:

-   Candidate actions
-   Feasibility
-   Recommended action
-   Reason
-   Expected impact

Example:

``` text
SHORTFALL
   ↓
Battery sufficient?
   ├── YES → DISCHARGE_STORAGE
   └── NO
        ↓
Grid import available?
   ├── YES → IMPORT_ENERGY
   └── NO
        ↓
Backup available?
   ├── YES → ACTIVATE_BACKUP
   └── NO → CRITICAL_SHORTFALL
```

------------------------------------------------------------------------

# 17. Recommendation Contract

Every recommendation must contain:

``` json
{
  "action": "DISCHARGE_STORAGE",
  "reason": "Expected renewable generation is below anticipated requirement during the evening period.",
  "expected_impact": "Reduce the potential shortfall using available battery energy.",
  "risk_level": "HIGH"
}
```

The frontend must consume this response.

Do not hard-code recommendation text in React.

------------------------------------------------------------------------

# 18. LLM Integration

LLM is optional.

If implemented, it sits AFTER the deterministic recommendation:

``` text
Forecast
   ↓
Risk
   ↓
Decision Engine
   ↓
Recommendation
   ↓
LLM Explanation
```

The LLM may:

-   Rewrite technical reasoning in operator-friendly language
-   Summarize why an action was recommended
-   Explain scenario changes

The LLM must NOT:

-   Generate the forecast
-   Calculate risk
-   Choose the action
-   Override the decision engine
-   Control grid assets

The deterministic system remains the source of truth.

------------------------------------------------------------------------

# 19. Scenario Simulator

The simulator must perform real recalculation.

Inputs:

``` json
{
  "site_id": "solar-01",
  "cloud_cover_change": 20,
  "demand_change_percent": 10,
  "battery_available": true,
  "backup_available": true
}
```

Flow:

``` text
Baseline
   ↓
Apply Scenario Inputs
   ↓
Recalculate Generation
   ↓
Recalculate Demand
   ↓
Recalculate Risk
   ↓
Recalculate Available Actions
   ↓
Generate New Recommendation
   ↓
Compare Baseline vs Scenario
```

The scenario must change actual calculations.

Do not fake scenario results by changing only UI labels.

------------------------------------------------------------------------

# 20. Scenario Response

``` json
{
  "baseline": {
    "generation_mw": 52,
    "risk_level": "MEDIUM",
    "recommendation": "NO_ACTION"
  },
  "scenario": {
    "generation_mw": 43,
    "risk_level": "HIGH",
    "recommendation": "DISCHARGE_STORAGE"
  },
  "explanation": "Higher cloud cover reduces expected solar generation and creates a larger evening shortfall."
}
```

Values are illustrative only.

------------------------------------------------------------------------

# 21. FastAPI API Structure

## Health

``` http
GET /api/health
```

## Sites

``` http
GET /api/sites
GET /api/sites/{site_id}
```

## Forecast

``` http
GET /api/forecast/{site_id}
GET /api/forecast/{site_id}?hours=24
GET /api/forecast/{site_id}?hours=48
GET /api/forecast/{site_id}?hours=72
```

## Risk

``` http
GET /api/risk/{site_id}
```

## Events

``` http
GET /api/events/{site_id}
```

## Recommendations

``` http
GET /api/recommendations/{site_id}
```

## Simulation

``` http
POST /api/simulate
```

## System

``` http
GET /api/system/status
```

------------------------------------------------------------------------

# 22. Dashboard API Strategy

The dashboard should not make many unnecessary requests.

Create an aggregate endpoint if useful:

``` http
GET /api/dashboard/{site_id}
```

Response can contain:

``` text
current generation
forecast summary
current risk
battery status
risk events
recommendation
system status
```

This makes the dashboard fast and keeps orchestration out of React.

------------------------------------------------------------------------

# 23. Frontend Integration

React should communicate with FastAPI through a single API client:

``` text
frontend/src/services/api.ts
```

Example responsibility:

``` text
getSites()
getForecast()
getRisk()
getEvents()
getRecommendation()
runSimulation()
getSystemStatus()
```

Types should mirror Pydantic API contracts.

Avoid duplicating business logic in TypeScript.

------------------------------------------------------------------------

# 24. Node.js Boundary

Node.js should NOT duplicate Python logic.

Never put these in Node.js:

-   XGBoost inference
-   Feature engineering
-   Risk thresholds
-   Shortfall logic
-   Surplus logic
-   Battery calculations
-   Decision rules

If a Node.js gateway exists, its responsibility is:

``` text
HTTP Request
    ↓
Validate/Route
    ↓
Call FastAPI
    ↓
Return Response
```

This boundary keeps the AI/ML system independent from the frontend
stack.

------------------------------------------------------------------------

# 25. Optional Node.js Gateway

Only introduce this if the project later requires it.

``` text
React
  ↓
Node.js Gateway
  ↓
FastAPI
  ↓
Python Intelligence
```

Possible Node packages:

-   Express or Fastify
-   Zod for request validation
-   Axios/fetch for FastAPI communication

Do not introduce Node.js gateway complexity during the first MVP
iteration unless required.

------------------------------------------------------------------------

# 26. Database

PostgreSQL is the preferred persistent database.

Suggested tables:

``` text
sites
generation_records
weather_records
forecasts
risk_events
recommendations
scenarios
```

For the first working MVP:

``` text
CSV/JSON → Python services
```

Then migrate to PostgreSQL.

Services should hide the data source so the API does not care whether
data came from CSV or PostgreSQL.

------------------------------------------------------------------------

# 27. Database Responsibilities

The database stores:

-   Site configuration
-   Historical generation
-   Weather observations
-   Operational state
-   Generated forecasts
-   Risk events
-   Recommendations
-   Scenario history if needed

The database does NOT run the ML model.

------------------------------------------------------------------------

# 28. Model Storage

Save trained models under:

``` text
backend/models/xgboost/
```

Example:

``` text
solar_forecast_v1.joblib
```

Store metadata separately:

``` text
model name
training period
feature version
model version
evaluation metrics
```

Never expose model files directly to the frontend.

------------------------------------------------------------------------

# 29. Configuration

Use environment variables for:

``` text
BACKEND_PORT
DATABASE_URL
WEATHER_API_KEY
LLM_API_KEY
```

Only define variables that are actually used.

Never commit secrets.

Add:

``` text
.env
```

to `.gitignore`.

Provide:

``` text
.env.example
```

------------------------------------------------------------------------

# 30. Error Handling

Backend must handle:

-   Invalid site ID
-   Invalid forecast horizon
-   Missing data
-   Invalid timestamps
-   Model unavailable
-   Simulation validation errors
-   External weather failure
-   Database failure

Return structured API errors.

Never return Python stack traces to users.

------------------------------------------------------------------------

# 31. Demo Fallback

The MVP must survive external failures.

``` text
Live Weather
     ↓
Failure
     ↓
Demo Data
     ↓
Forecast continues
```

The hackathon demo must not depend on internet availability.

------------------------------------------------------------------------

# 32. System Status

The backend should expose health/status for:

``` text
Data Pipeline
Forecast Engine
Risk Engine
Decision Engine
```

Example:

``` json
{
  "data_pipeline": "operational",
  "forecast_engine": "operational",
  "risk_engine": "operational",
  "decision_engine": "operational"
}
```

------------------------------------------------------------------------

# 33. Logging

Log:

-   API errors
-   Model loading
-   Forecast generation
-   Simulation requests
-   Decision generation
-   External API failures

Do not log:

-   API keys
-   Secrets
-   Sensitive user information

------------------------------------------------------------------------

# 34. Testing Strategy

## Unit tests

Test independently:

-   Feature generation
-   Forecast response validation
-   Uncertainty calculation
-   Surplus detection
-   Shortfall detection
-   Risk classification
-   Decision rules
-   Scenario calculations

## Integration tests

Test:

``` text
API
 ↓
Service
 ↓
Engine
 ↓
Response
```

## End-to-end test

Test:

``` text
Data
 ↓
Forecast
 ↓
Risk
 ↓
Decision
 ↓
Simulation
 ↓
API
 ↓
Frontend
```

------------------------------------------------------------------------

# 35. Required Decision Test Cases

## Normal

``` text
Generation >= Requirement
Risk = LOW
Recommendation = NO_ACTION
```

## Shortfall + Battery

``` text
Generation < Requirement
Battery available
Recommendation = DISCHARGE_STORAGE
```

## Shortfall + No Battery + Backup

``` text
Battery unavailable
Backup available
Recommendation = ACTIVATE_BACKUP
```

## Surplus + Battery Capacity

``` text
Generation > Requirement
Battery has capacity
Recommendation = CHARGE_STORAGE
```

## Surplus + Full Battery

``` text
Battery full
Export available
Recommendation = EXPORT_ENERGY
```

## No Available Response

``` text
Shortfall
No battery
No import
No backup
Risk = HIGH/CRITICAL
Recommendation = CRITICAL_SHORTFALL
```

------------------------------------------------------------------------

# 36. Implementation Order

Build backend vertically.

## Phase 1 --- Setup

-   FastAPI
-   Folder structure
-   Configuration
-   Health endpoint
-   Logging

## Phase 2 --- Data

-   Demo datasets
-   Loaders
-   Validation
-   Data service

## Phase 3 --- ML

-   Feature engineering
-   XGBoost training
-   Model persistence
-   Forecast inference
-   Evaluation

## Phase 4 --- Intelligence

-   Uncertainty
-   Surplus
-   Shortfall
-   Risk

## Phase 5 --- Decisions

-   Candidate actions
-   Constraints
-   Recommendation engine

## Phase 6 --- Simulator

-   Scenario inputs
-   Recalculation
-   Baseline/scenario comparison

## Phase 7 --- APIs

-   Forecast
-   Risk
-   Decisions
-   Simulation
-   Sites
-   Dashboard
-   System status

## Phase 8 --- Frontend Integration

Replace mock frontend data with API responses.

## Phase 9 --- Demo Hardening

Run the exact demo scenario repeatedly.

------------------------------------------------------------------------

# 37. Recommended Build Sequence for Codex

Codex should work in small milestones:

``` text
1. Backend scaffold
2. Demo data loader
3. Data validation
4. Feature engineering
5. XGBoost training
6. Forecast service
7. Uncertainty service
8. Risk engine
9. Decision engine
10. Simulation engine
11. FastAPI routes
12. API tests
13. React API integration
14. End-to-end testing
```

After every milestone:

-   Run tests
-   Start the backend
-   Verify affected API endpoints
-   Avoid breaking previous functionality

------------------------------------------------------------------------

# 38. Important Architecture Rules

1.  Python owns AI/ML.
2.  FastAPI owns the backend API.
3.  Node.js is optional and should remain thin.
4.  React owns presentation only.
5.  Business logic must not be duplicated in React.
6.  Recommendations must come from the backend.
7.  Scenario changes must affect actual calculations.
8.  ML metrics must come from real experiments.
9.  Thresholds must be configurable.
10. Demo mode must work without external APIs.
11. No autonomous grid control.
12. Keep the system modular.
13. Prefer simple working code over unnecessary abstraction.
14. Do not introduce microservices for the MVP.
15. Do not introduce deep learning without a demonstrated need.

------------------------------------------------------------------------

# 39. Final Architecture

``` text
                    ┌──────────────────────┐
                    │      React UI        │
                    │ Dashboard / Forecast │
                    │ Simulator / Decisions│
                    └──────────┬───────────┘
                               │
                         REST / JSON
                               │
                    ┌──────────▼───────────┐
                    │      FastAPI         │
                    │    API Layer         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
       │ Forecasting │ │ Risk Engine │ │  Decision   │
       │   Service   │ │             │ │   Engine    │
       └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ XGBoost ML │   │ Surplus /  │   │ Candidate  │
       │ + Features │   │ Shortfall  │   │  Actions   │
       └──────┬─────┘   └────────────┘   └────────────┘
              │
              ▼
       ┌────────────┐
       │ Data Layer │
       │ CSV / DB   │
       └────────────┘
```

Optional future layer:

``` text
React
  ↓
Node.js Gateway
  ↓
FastAPI
  ↓
Python Intelligence
```

------------------------------------------------------------------------

# 40. Definition of Done

Backend MVP is complete when:

-   [ ] FastAPI starts successfully
-   [ ] `/api/health` works
-   [ ] Demo data loads
-   [ ] Data validation works
-   [ ] Features can be generated
-   [ ] XGBoost model can be trained
-   [ ] Model can be loaded
-   [ ] 24-hour forecast works
-   [ ] 48-hour forecast works
-   [ ] 72-hour forecast works
-   [ ] Forecast uncertainty is returned
-   [ ] Surplus detection works
-   [ ] Shortfall detection works
-   [ ] Risk classification works
-   [ ] Battery availability affects decisions
-   [ ] Backup availability affects decisions
-   [ ] Decision engine generates recommendations
-   [ ] Recommendations contain action, reason, and impact
-   [ ] Scenario simulation recalculates results
-   [ ] Scenario inputs actually affect results
-   [ ] Forecast API works
-   [ ] Risk API works
-   [ ] Decision API works
-   [ ] Simulation API works
-   [ ] Site API works
-   [ ] Dashboard API works
-   [ ] System status API works
-   [ ] Frontend consumes backend data
-   [ ] External API failure does not break demo mode
-   [ ] No secrets are committed
-   [ ] No fabricated ML metrics exist
-   [ ] Core backend tests pass
-   [ ] Complete demo scenario works from clean startup

------------------------------------------------------------------------

# 41. Core Principle

The backend must transform:

``` text
RAW DATA
   ↓
FORECAST
   ↓
UNCERTAINTY
   ↓
RISK
   ↓
SCENARIO
   ↓
DECISION
   ↓
EXPLAINABLE RECOMMENDATION
```

The frontend only presents the result.

The intelligence belongs in the backend.
