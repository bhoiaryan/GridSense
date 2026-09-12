# GridSense AI — Backend API Contract & Schema Specification

**Step**: STEP 2 — Define the backend API contract  
**Status**: LOCKED  
**Participating Tiers**: React Frontend (5173) ↔ Node.js Gateway BFF (5000) ↔ Python FastAPI (8000)

---

## 1. Global Conventions

### 1.1 Field Casing & Translation
- **Frontend / Client Facing (Node Gateway output)**: Strict `camelCase` to match React TypeScript conventions.
- **Python ML Engine (FastAPI output)**: Supports both `camelCase` (via Pydantic aliases) or standard `snake_case`. The Node Gateway normalizes all inbound fields to `camelCase` before sending to the browser.

### 1.2 Site ID Alias Resolution
To bridge the frontend mock ID (`solar-01`) and the dataset IDs (`SITE_001`, `SITE_002`, `SITE_003`):
- Node Gateway accepts **both** `solar-01` and `SITE_001`.
- Inbound requests with `solar-01` are automatically resolved to `SITE_001` before querying data files or the ML engine.
- Outbound responses include `id: "SITE_001"` (or preserve `solar-01` when requested).

```text
Frontend request: /api/dashboard/solar-01
        │
   (Node Gateway normalizes solar-01 -> SITE_001)
        │
Python ML / Dataset: queries SITE_001
        │
Node returns aggregated payload with seamless fallback.
```

---

## 2. API Endpoint Specifications

### 2.1 Health Probe
- **Route**: `GET /api/health`
- **Purpose**: Liveness and dependency connectivity probe.
- **Response Format**:
```json
{
  "status": "ok",
  "gateway": "operational",
  "service": "GridSense AI Node.js Gateway",
  "timestamp": "2026-09-12T04:53:21.090Z",
  "ml_service": {
    "status": "connected",
    "details": "Connected to FastAPI ML Service"
  }
}
```

---

### 2.2 Sites List & Site Detail
- **Routes**:
  - `GET /api/sites`
  - `GET /api/sites/:id`
- **Response Format (`SiteInfo`)**:
```json
{
  "id": "SITE_001",
  "name": "Gujarat Solar Farm",
  "location": "Gujarat, India",
  "technology": "Utility-scale solar PV",
  "capacityMw": 50.0,
  "currentGenerationMw": 32.4,
  "batterySoc": 68,
  "batteryCapacityMwh": 40.0,
  "chargeLimitMw": 15.0,
  "dischargeLimitMw": 20.0,
  "backupAvailable": true,
  "backupCapacityMw": 15.0
}
```

---

### 2.3 Generation Forecast
- **Route**: `GET /api/forecast/:site_id?hours={24|48|72}`
- **Query Params**:
  - `hours`: integer, allowable values `[24, 48, 72]`. Default: `24`.
- **Response Format (`ForecastResponse`)**:
```json
{
  "site_id": "SITE_001",
  "horizon_hours": 24,
  "total_points": 24,
  "forecast": [
    {
      "hour": "15:00",
      "timestamp": "2026-09-12T15:00:00+05:30",
      "dayLabel": "Today",
      "fullTimeLabel": "Today 15:00",
      "historical": 32.4,
      "expected": 31.8,
      "lower": 27.9,
      "upper": 35.7,
      "demand": 42.0,
      "cloudCover": 76,
      "irradiance": 480,
      "temperature": 31.5,
      "windSpeed": 4.2,
      "humidity": 60,
      "confidenceScore": 88,
      "risk": "HIGH",
      "weatherDriver": "Cloud cover rising to 76%",
      "explanation": "Generation drops below evening demand threshold causing net deficit."
    }
  ]
}
```

---

### 2.4 Operational Risk & Events Queue
- **Routes**:
  - `GET /api/risk/:site_id`
  - `GET /api/events/:site_id`
- **Response Format (`RiskEvent[]`)**:
```json
[
  {
    "id": "risk-evt-01",
    "risk": "HIGH",
    "type": "SHORTFALL",
    "window": "Today 18:00 - 20:00",
    "expectedImpact": "Projected net energy shortfall of ~16.8 MWh during evening peak demand.",
    "problem": "Rapid solar ramp-down combined with 75% afternoon cloud cover creates generation deficit before base grid compensation."
  }
]
```

---

### 2.5 Operator Recommendation & Decision Engine
- **Route**: `GET /api/recommendations/:site_id`
- **Response Format (`Recommendation`)**:
```json
{
  "action": "DISCHARGE_STORAGE",
  "reason": "Anticipated solar generation drop below evening demand threshold (18:00–20:00). Battery state of charge is optimal at 68%.",
  "expectedImpact": "Discharging 20 MW over 2 hours covers 95% of the projected deficit, avoiding costly diesel backup activation and spot grid import penalties.",
  "constraints": [
    "Maintain battery reserve floor above 15% SoC (minimum 6.0 MWh).",
    "Discharge rate clamped to max inverter limit (20 MW).",
    "Keep auxiliary backup on standby if shortfall exceeds 2 hours."
  ]
}
```

---

### 2.6 What-If Scenario Simulator
- **Route**: `POST /api/simulate`
- **Request Body (`ScenarioInput`)**:
```json
{
  "cloudCoverChange": 20,
  "demandChange": 10,
  "batteryAvailable": true,
  "backupAvailable": true
}
```
- **Validation Rules (Zod / Pydantic)**:
  - `cloudCoverChange`: number between `-100` and `100` (default: 0).
  - `demandChange`: number between `-100` and `100` (default: 0).
  - `batteryAvailable`: boolean (default: true).
  - `backupAvailable`: boolean (default: true).
- **Response Format (`ScenarioResult`)**:
```json
{
  "generationMw": 44.7,
  "shortfallMwh": 43.3,
  "risk": "HIGH",
  "recommendation": "DISCHARGE_STORAGE_AND_BACKUP",
  "explanation": "Shortfall of 43.3 MW exceeds single battery discharge limit (20 MW). Recommended joint dispatch: maximum battery discharge plus secondary backup activation."
}
```

---

### 2.7 Aggregated Operations Dashboard
- **Route**: `GET /api/dashboard/:site_id`
- **Purpose**: Combines all above widgets into 1 single HTTP request for high-performance React mounting.
- **Response Format (`DashboardResponse`)**:
```json
{
  "site": { /* SiteInfo */ },
  "kpis": [
    {
      "label": "Current Generation",
      "value": "32.4 MW",
      "detail": "64.8% of 50 MW rated capacity",
      "trend": "+3.1 MW vs previous hour",
      "status": "OK"
    }
  ],
  "currentForecast": [ /* 24 ForecastPoints */ ],
  "riskEvents": [ /* RiskEvent[] */ ],
  "recommendation": { /* Recommendation */ },
  "systemStatus": [
    { "label": "Data Pipeline", "status": "Operational", "detail": "Telemetry polling active" },
    { "label": "Forecast Engine (XGBoost)", "status": "Operational", "detail": "Model v1.02 inference latency 12ms" },
    { "label": "Risk Engine", "status": "Operational", "detail": "Shortfall thresholds monitoring active" },
    { "label": "Decision Engine", "status": "Operational", "detail": "Rule-based synthesizer online" }
  ],
  "meta": {
    "source": "ml_service",
    "timestamp": "2026-09-12T08:35:00.000Z"
  }
}
```

---

## 3. Python Pydantic Models for STEP 3 (FastAPI)

When creating `backend/ml/app/schemas/` in Step 3, use these exact Pydantic models:

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class SiteInfoSchema(BaseModel):
    id: str
    name: str
    location: str
    technology: str
    capacityMw: float
    currentGenerationMw: float
    batterySoc: float
    batteryCapacityMwh: float
    chargeLimitMw: float
    dischargeLimitMw: float
    backupAvailable: bool
    backupCapacityMw: float

class ForecastPointSchema(BaseModel):
    hour: str
    timestamp: str
    dayLabel: Optional[str] = None
    fullTimeLabel: Optional[str] = None
    historical: Optional[float] = None
    expected: float
    lower: float
    upper: float
    demand: float
    cloudCover: int
    irradiance: int
    temperature: Optional[float] = None
    windSpeed: Optional[float] = None
    humidity: Optional[int] = None
    confidenceScore: Optional[int] = None
    risk: str
    weatherDriver: Optional[str] = None
    explanation: Optional[str] = None

class ForecastResponseSchema(BaseModel):
    site_id: str
    horizon_hours: int
    total_points: int
    forecast: List[ForecastPointSchema]

class RiskEventSchema(BaseModel):
    id: str
    risk: str
    type: str
    window: str
    expectedImpact: str
    problem: str

class RecommendationSchema(BaseModel):
    action: str
    reason: str
    expectedImpact: str
    constraints: List[str]

class ScenarioInputSchema(BaseModel):
    cloudCoverChange: float = 0.0
    demandChange: float = 0.0
    batteryAvailable: bool = True
    backupAvailable: bool = True

class ScenarioResultSchema(BaseModel):
    generationMw: float
    shortfallMwh: float
    risk: str
    recommendation: str
    explanation: str

class SystemStatusItemSchema(BaseModel):
    label: str
    status: str
    detail: str
```

---

## 4. Contract Verification Summary

1.  **Frontend Compatible**: Directly matches `src/types/index.ts` so zero React component changes are needed.
2.  **Gateway Compatible**: Directly matches `backend/node/src/types/index.ts`.
3.  **ML Engine Ready**: Python Pydantic definitions are defined and ready to drop into `backend/ml/app/main.py`.
4.  **Dataset Compatible**: Reconciles `solar-01` with `SITE_001` through the Node resolver.

