# GridSense AI — Technical Integration Audit & Architecture Roadmap

**Document Version**: 1.0.0  
**Project**: GridSense AI (Renewable Energy Intelligence & Decision-Support Platform)  
**Date**: September 12, 2026  
**Scope**: Complete repository audit across Frontend, Node.js Gateway, Python ML Engine, and Data Layer.

---

## 1. Current Architecture Overview

GridSense AI is structured as a **tri-tier decoupled architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     React 18 + Vite UI                      │
│   Dashboard | Forecast | Simulator | Decision Center | Site │
│                  (Port: 5173 / Client)                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (HTTP)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js Express Gateway (BFF)               │
│    Routes | Aggregator | Zod Validation | Resilient Cache   │
│                  (Port: 5000 / backend/node)                │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
        Proxy to ML (HTTP)            Direct Data Fallback
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│    Python ML Engine (FastAPI)│ │       Data Pack (CSV)       │
│  XGBoost | Uncertainty Model │ │  Raw | Processed | Demo     │
│  Risk Engine | Decisions     │ │  (backend/dataset/          │
│   (Port: 8000 / backend/ml)  │ │   gridsense_data/)          │
└──────────────┬───────────────┘ └─────────────────────────────┘
               │                               ▲
               └─────────── Trains on ─────────┘
```

### Key Architectural Boundaries
1. **Frontend (`src/`)**: Pure presentation layer using React 18, Tailwind CSS, Lucide icons, and Recharts. Must never read CSV files or call Python directly.
2. **Node.js Gateway (`backend/node/`)**: Backend-for-Frontend (BFF). Exposes unified REST endpoints, validates incoming payloads with Zod, aggregates dashboard telemetry into single roundtrip payloads, and implements offline fallback when ML is training.
3. **ML Engine (`backend/ml/`)**: Owns XGBoost inference, forecast uncertainty calculations, shortfall/surplus detection, and decision rule evaluation.
4. **Data Layer (`backend/dataset/gridsense_data/`)**: Ground truth synthetic and historical dataset covering 26,000+ hourly observations of generation, weather, battery state of charge, and grid demand.

---

## 2. Repository Structure

```text
GridPilot/
├── .gitignore                          # Comprehensive ignore rules (Node, Python, .venv, *.joblib)
├── package.json                        # Root frontend dependencies (React 18, Vite 6, Recharts, Tailwind)
├── tailwind.config.js                  # Custom color palette (grid-teal, grid-red, grid-sidebar, etc.)
├── vite.config.ts                      # Vite build configuration
├── PROJECT/
│   ├── plan.md                         # Product-level single source of truth for MVP
│   └── backend.md                      # Backend service boundaries & data contracts
├── REPORT/                             # Project academic report & LaTeX documentation
├── src/                                # Frontend application source
│   ├── App.tsx                         # Router with AppLayout and route definitions
│   ├── main.tsx                        # React DOM root mounting
│   ├── styles.css                      # Global styles and Tailwind directives
│   ├── components/
│   │   ├── alerts/RiskBadge.tsx        # Risk level indicator (LOW, MEDIUM, HIGH)
│   │   ├── cards/KpiCard.tsx           # KPI summary card with trend indicators
│   │   ├── charts/ForecastChart.tsx    # Recharts multi-layer forecast visualization
│   │   ├── layout/SystemStatus.tsx     # Subsystem health indicators
│   │   └── recommendations/RecommendationCard.tsx
│   ├── data/
│   │   └── mockData.ts                 # 1,100 lines of static demo data & simulation math
│   ├── hooks/
│   │   └── useScenario.ts              # Scenario state hook calling mockData.runScenario
│   ├── layouts/
│   │   └── AppLayout.tsx               # Persistent sidebar navigation and header
│   ├── lib/
│   │   └── utils.ts                    # cn (clsx + twMerge) helper
│   ├── pages/
│   │   ├── Dashboard.tsx               # Main operational overview
│   │   ├── Decisions.tsx               # Risk queue & actionable recommendations
│   │   ├── Forecast.tsx                # 24h/48h/72h generation & weather inspector
│   │   ├── Simulator.tsx               # What-if scenario sliders & recalculations
│   │   └── Site.tsx                    # Site asset metadata & operating limits
│   └── types/
│       └── index.ts                    # TypeScript interfaces for all frontend contracts
└── backend/
    ├── dataset/gridsense_data/         # Prepared dataset pack
    │   ├── README.md                   # Data documentation and column definitions
    │   ├── demo/
    │   │   ├── forecast_72h.csv        # 72-hour pre-generated forecast slice (SITE_001)
    │   │   ├── operations.csv          # 26,281 rows of battery & backup telemetry
    │   │   └── sites.csv               # 3 solar sites (SITE_001, SITE_002, SITE_003)
    │   ├── processed/
    │   │   ├── grid_features.csv       # 26,281 rows with engineered features & risk labels
    │   │   └── training_data.csv       # 26,278 rows ready for model training
    │   └── raw/
    │       └── generation_weather.csv  # 26,281 hourly rows of generation, irradiance, temp
    ├── ml/                             # Python ML service
    │   └── requirements.txt            # FastAPI, Uvicorn, XGBoost, Pandas, Scikit-learn
    └── node/                           # Node.js API Gateway (BFF)
        ├── package.json                # Express, Axios, Cors, Dotenv, Zod, TSX
        ├── tsconfig.json               # Modern NodeNext TypeScript setup
        ├── .env.example                # PORT=5000, ML_SERVICE_URL=http://localhost:8000
        ├── .env                        # Local gateway environment file
        └── src/
            ├── app.ts                  # Express application setup & middleware pipeline
            ├── index.ts                # Server boot on PORT 5000
            ├── config/env.ts           # Typed environment variable validation
            ├── types/index.ts          # Backend TypeScript interfaces
            ├── services/
            │   ├── mlClient.ts         # Axios client with fallback to MockDataService
            │   └── mockDataService.ts  # Gateway-level realistic demo data provider
            └── routes/
                ├── dashboard.ts        # GET /api/dashboard/:site_id
                ├── decisions.ts        # GET /api/recommendations/:site_id
                ├── forecast.ts         # GET /api/forecast/:site_id?hours=24|48|72
                ├── health.ts           # GET /api/health
                ├── risk.ts             # GET /api/risk/:site_id & /api/events/:site_id
                ├── simulation.ts       # POST /api/simulate
                ├── sites.ts            # GET /api/sites & GET /api/sites/:id
                └── system.ts           # GET /api/system/status
```

---

## 3. Frontend Page Inventory

| Page Route | Page Title | Current Data Source | Required Backend Endpoints | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Operations Dashboard | Static imports from `src/data/mockData.ts` (`site`, `forecastData`, `kpis`, `riskEvents`, `recommendation`, `systemStatus`) | `GET /api/dashboard/:site_id` | Hardcoded / Mock |
| `/forecast` | Generation Forecast | Static imports from `src/data/mockData.ts` (`getForecastForHorizon`, `getHorizonSummary`, `riskPeriodsList`, `site`) | `GET /api/forecast/:site_id?hours={24\|48\|72}`<br>`GET /api/risk/:site_id` | Hardcoded / Mock |
| `/simulator` | Scenario Simulator | `useScenario` hook calling static `runScenario()` in `src/data/mockData.ts` | `POST /api/simulate`<br>`GET /api/sites/:site_id` | Hardcoded in-memory calculation |
| `/decisions` | Decision Center | Static imports from `src/data/mockData.ts` (`recommendation`, `riskEvents`, `site`) | `GET /api/events/:site_id`<br>`GET /api/recommendations/:site_id`<br>`GET /api/sites/:site_id` | Hardcoded / Mock |
| `/site` | Site Overview | Static imports from `src/data/mockData.ts` (`site`, `systemStatus`) | `GET /api/sites/:site_id`<br>`GET /api/system/status` | Hardcoded / Mock |

### Detailed Page Analysis & User Interactions

#### 1. Operations Dashboard (`/`)
- **Visual Components**:
  - Site Header banner (`site.name`, current interval marker).
  - KPI row: Current Generation, Day-Ahead Peak, Projected Shortfall, Battery Readiness (`KpiCard`).
  - Forecast vs. Demand Chart with Uncertainty Interval Band (`ForecastChart`).
  - High-Risk Shortfall Banner (`RiskBadge`, peak deficit, cloud cover).
  - AI Operator Recommendation Card (`RecommendationCard`).
  - Subsystem Status Sidebar (`SystemStatus`).
- **User Interactions**:
  - Site selector dropdown (switches operating site).
  - Horizon selector dropdown (24h / 48h / 72h).
  - "Run Scenario" button navigating to `/simulator`.

#### 2. Forecast Inspector (`/forecast`)
- **Visual Components**:
  - Horizon tabs (24h, 48h, 72h).
  - Horizon KPI Summary (Peak Generation, Total Forecast Generation, Peak Deficit, Average Spread).
  - Multi-layer Recharts canvas with layer visibility toggles: Uncertainty Band, Demand Curve, Irradiance Overlay, High-Risk Windows.
  - Interactive Hourly Point Inspector with previous/next hour stepping.
  - Risk periods list linking directly to specific deficit hours.
  - Detailed Data Table view toggle.
- **User Interactions**:
  - Changing forecast horizon (triggers recalculation of horizon slices).
  - Clicking hours or risk items (updates inspector details).
  - Layer toggles (updates chart rendering in real time).

#### 3. Scenario Simulator (`/simulator`)
- **Visual Components**:
  - Sliders for Cloud Cover change (0% to +50%) and Demand adjustment (-10% to +25%).
  - Toggles for Battery Storage availability and Auxiliary Backup availability.
  - Side-by-side comparison cards: Baseline vs. Simulated Scenario (Avg generation, Shortfall, Risk level, Recommendation).
  - Explanation box detailing why the recommendation and risk changed.
- **User Interactions**:
  - Moving sliders and toggles.
  - Clicking "Run Simulation" (triggers recalculation).

#### 4. Decision Center (`/decisions`)
- **Visual Components**:
  - Operational Risk Queue (list of detected events with severity badges and time windows).
  - Selected Event Detail view.
  - Feasible Actions list (Discharge storage, Import energy, Activate backup, Curtail).
  - Resource Availability monitor (Battery SOC, Discharge limit, Backup capacity).
  - Synthesized Recommendation banner with operator rationales.
- **User Interactions**:
  - Clicking queue items to inspect different risk events.
  - Operator Action buttons: "Mark Reviewed" and "Send to Operator Log".

#### 5. Site Overview (`/site`)
- **Visual Components**:
  - Site metadata grid (Location, Technology, Installed Capacity, Current Generation, Battery SOC, Backup availability).
  - Operating limits card (Battery Capacity MWh, Charge limit MW, Discharge limit MW, Backup capacity MW).
  - System Status panel.
- **User Interactions**:
  - Site selection dropdown.

---

## 4. Node.js Backend API Inventory

The Node.js Gateway (`backend/node`) has been fully implemented with Express and TypeScript, configured on **Port 5000**, and compiles with **0 errors**.

| Method | Path | Request Format | Response Format | Purpose | Gateway Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | `{ status, gateway, service, timestamp, ml_service: { status, details } }` | Probes Gateway health and checks connectivity to Python ML service. |  Implemented (Live) |
| `GET` | `/api/sites` | None | `SiteInfo[]` | Returns all available renewable generation sites. |  Implemented (Live) |
| `GET` | `/api/sites/:id` | Route param: `:id` | `SiteInfo` | Returns configuration and operating limits for a specific site. |  Implemented (Live) |
| `GET` | `/api/forecast/:site_id` | Route param: `:site_id`<br>Query: `?hours=24\|48\|72` | `ForecastResponse` (`site_id`, `horizon_hours`, `forecast: ForecastPoint[]`) | Returns hourly expected generation, lower/upper uncertainty bounds, demand, and weather drivers. |  Implemented (Live) |
| `GET` | `/api/risk/:site_id` | Route param: `:site_id` | `{ site_id, overall_risk, active_events_count, events: RiskEvent[] }` | Evaluates site risk and provides list of active risk windows. |  Implemented (Live) |
| `GET` | `/api/events/:site_id` | Route param: `:site_id` | `RiskEvent[]` | Retrieves operational risk queue items. |  Implemented (Live) |
| `GET` | `/api/recommendations/:site_id` | Route param: `:site_id` | `Recommendation` (`action`, `reason`, `expectedImpact`, `constraints`) | Returns explainable operator decision guidance. |  Implemented (Live) |
| `POST` | `/api/simulate` | JSON: `{ cloudCoverChange, demandChange, batteryAvailable, backupAvailable }` | `ScenarioResult` (`generationMw`, `shortfallMwh`, `risk`, `recommendation`, `explanation`) | Executes deterministic what-if stress tests against operating assumptions. |  Implemented (Live) |
| `GET` | `/api/dashboard/:site_id` | Route param: `:site_id` | `DashboardResponse` (`site`, `kpis`, `currentForecast`, `riskEvents`, `recommendation`, `systemStatus`, `meta`) | High-performance aggregated payload for the dashboard overview. |  Implemented (Live) |
| `GET` | `/api/system/status` | None | `SystemStatusItem[]` | Returns health status for data pipeline, forecast model, risk engine, and decision engine. |  Implemented (Live) |

---

## 5. ML Engine Inventory

### Current State (`backend/ml`)
- **Dependencies**: Specified in `backend/ml/requirements.txt`:
  - `fastapi==0.141.1`, `uvicorn==0.52.4`, `pydantic==2.13.5`
  - `xgboost==3.4.1`, `scikit-learn==1.9.1`, `pandas==3.0.5`, `numpy==2.5.3`
- **Application Code**: The Python service scaffold (`app/main.py`) needs to be linked to the data pipeline and exposed via FastAPI.

### Required ML Model Architecture
1. **Target**: Hourly solar generation forecast ($t+1$ to $t+72$).
2. **Model Type**: XGBoost Regressor (`XGBRegressor`) operating on tabular time-series features.
3. **Features Available in Data**:
   - Temporal: `hour`, `dayofweek`, `month`, `dayofyear`.
   - Weather: `irradiance_w_m2`, `cloud_cover_pct`, `temperature_c`, `humidity_pct`, `wind_speed_m_s`.
   - Historical: Lags ($t-1, t-2, t-24$), rolling 6-hour mean generation.
   - Site Parameters: Installed solar capacity MW.
4. **Uncertainty Formulation**:
   - Lower Bound: $max(0, \hat{y} - 1.96 \cdot \sigma_{error})$
   - Upper Bound: $min(Capacity, \hat{y} + 1.96 \cdot \sigma_{error})$
5. **FastAPI Service Interface**:
   - Host: `0.0.0.0`, Port: `8000`.
   - Swagger Documentation: Automatically available at `http://localhost:8000/docs`.

---

## 6. Data Layer Inventory

The data layer is located in `backend/dataset/gridsense_data/`:

| Dataset File | Rows | Columns | Description & Role |
| :--- | :--- | :--- | :--- |
| `demo/sites.csv` | 3 sites | `site_id`, `site_name`, `latitude`, `longitude`, `capacity_mw`, `battery_capacity_mwh`, `battery_max_power_mw`, `backup_capacity_mw` | Site parameters for SITE_001 (50 MW), SITE_002 (75 MW), SITE_003 (40 MW). |
| `demo/forecast_72h.csv` | 72 rows | `site_id`, `timestamp`, `generation_mw`, `forecast_generation_mw`, `forecast_lower_mw`, `forecast_upper_mw`, `demand_mw`, `battery_soc_pct`, `surplus_mw`, `shortfall_mw`, `risk_level` | 72-hour slice for immediate UI inspection & verification. |
| `demo/operations.csv` | 26,281 rows | `site_id`, `timestamp`, `battery_soc_mwh`, `battery_soc_pct`, `backup_available_mw`, `estimated_unserved_mw` | Hourly operational state of energy storage and backup generators. |
| `raw/generation_weather.csv` | 26,281 rows | `site_id`, `timestamp`, `generation_mw`, `demand_mw`, `irradiance_w_m2`, `temperature_c`, `humidity_pct`, `wind_speed_m_s`, `cloud_cover_pct` | 3 years of hourly historical solar generation matched with atmospheric weather. |
| `processed/training_data.csv` | 26,278 rows | Above features + `target_generation_next_hour_mw` | Feature matrix ready for XGBoost model training without data leakage. |
| `processed/grid_features.csv` | 26,281 rows | All features + `surplus_mw`, `shortfall_mw`, `risk_level` | Fully integrated dataset for evaluation and scenario simulation. |

---

## 7. Current Request / Response Flow & Trace

### Scenario 1: Operator Loads the Operations Dashboard
```
1. Operator navigates to http://localhost:5173/
2. [Current]: Dashboard.tsx reads static variables from src/data/mockData.ts.
3. [Intended]:
   React Dashboard -> calls api.getDashboard("SITE_001")
   -> HTTP GET http://localhost:5000/api/dashboard/SITE_001
   -> Node Gateway queries Python ML Service (or fallback service)
   -> Aggregates Site + Forecast + KPIs + Risks + Recommendation into single JSON
   -> React Dashboard renders KpiCard, ForecastChart, RiskBadge, and RecommendationCard.
```

### Scenario 2: Operator Inspects Forecast Horizons (24h / 48h / 72h)
```
1. Operator clicks "Next 48 hours" tab on /forecast.
2. [Current]: Forecast.tsx filters local 72-hour array in mockData.ts.
3. [Intended]:
   React Forecast -> calls api.getForecast("SITE_001", 48)
   -> HTTP GET http://localhost:5000/api/forecast/SITE_001?hours=48
   -> Node Gateway proxies to ML Service GET /api/forecast/SITE_001?hours=48
   -> ML Engine runs XGBoost inference on 48-hour feature window
   -> Returns expected MW with lower/upper uncertainty intervals
   -> Recharts ForecastChart updates uncertainty band and deficit highlights.
```

### Scenario 3: Operator Tests a What-If Scenario
```
1. Operator adjusts Cloud Cover slider to +25% and Demand to +15%, then clicks "Run Simulation".
2. [Current]: useScenario hook executes client-side runScenario() in mockData.ts.
3. [Intended]:
   React Simulator -> calls api.runSimulation({ cloudCoverChange: 25, demandChange: 15, batteryAvailable: true, backupAvailable: true })
   -> HTTP POST http://localhost:5000/api/simulate
   -> Node Gateway validates payload using Zod schema
   -> Forwards to Python Decision Engine / Simulator
   -> Recalculates generation attenuation, net deficit, battery dispatch limits, and backup options
   -> Returns Baseline vs. Scenario comparison with dynamic explanation
   -> Simulator page displays ResultCard and explanation.
```

---

## 8. Missing Connections & Discrepancies Found

1. **Frontend API Client Missing**:
   - `src/services/api.ts` does not exist yet.
   - Frontend pages (`Dashboard.tsx`, `Forecast.tsx`, `Decisions.tsx`, `Simulator.tsx`, `Site.tsx`) import directly from `src/data/mockData.ts`.
2. **Site ID Discrepancy**:
   - Frontend mock data uses `id: "solar-01"` ("Dharampur Solar Park", 120 MW).
   - Dataset files use `site_id: "SITE_001"` ("Gujarat Solar Farm", 50 MW).
   - *Resolution*: Node Gateway should support both `solar-01` and `SITE_001` (with alias mapping) so that existing frontend components and real dataset IDs both resolve cleanly without breaking.
3. **Python ML Service Boot**:
   - `backend/ml` currently contains `requirements.txt`. The FastAPI service entrypoint `backend/ml/app/main.py` needs to load the dataset and expose the endpoints expected by `backend/node/src/services/mlClient.ts`.
4. **Frontend Async State Handling**:
   - Pages currently assume synchronous data access (`const data = forecastData;`).
   - Need simple, clean React `useEffect` + `useState` loading/error patterns so pages display loading indicators while fetching and graceful empty/error states if the backend is unreachable.

---

## 9. Mock Data Replacement Plan

The following objects in [src/data/mockData.ts](file:///c:/Users/parth/Desktop/GridPilot/src/data/mockData.ts) will be progressively replaced with live API calls:

| Mock Variable in `mockData.ts` | Replaced By Live Endpoint | Target Page / Component |
| :--- | :--- | :--- |
| `site` | `GET /api/sites/:site_id` | `AppLayout.tsx`, `Site.tsx`, `Dashboard.tsx` |
| `kpis` | `GET /api/dashboard/:site_id` (`response.kpis`) | `Dashboard.tsx` (`KpiCard`) |
| `forecastData` / `forecast72hData` | `GET /api/forecast/:site_id?hours=...` | `Dashboard.tsx`, `Forecast.tsx` (`ForecastChart`) |
| `riskEvents` / `riskPeriodsList` | `GET /api/events/:site_id` | `Dashboard.tsx`, `Decisions.tsx`, `Forecast.tsx` |
| `recommendation` | `GET /api/recommendations/:site_id` | `Dashboard.tsx`, `Decisions.tsx` |
| `systemStatus` | `GET /api/system/status` | `AppLayout.tsx`, `Dashboard.tsx`, `Site.tsx` |
| `runScenario()` | `POST /api/simulate` | `hooks/useScenario.ts`, `Simulator.tsx` |

*Note*: `src/data/mockData.ts` will be retained as a local development fallback in case of complete network disconnection.

---

## 10. Required Environment Configuration

### Root Frontend (`.env` or `.env.development`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Node.js Gateway (`backend/node/.env`)
```env
PORT=5000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
USE_MOCK_FALLBACK=true
CORS_ORIGIN=http://localhost:5173
```

### Python ML Service (`backend/ml/.env`)
```env
PORT=8000
HOST=0.0.0.0
DATASET_PATH=../dataset/gridsense_data
```

---

## 11. Local Development Startup Flow

```text
Terminal 1: Python ML Engine (FastAPI)
cd backend/ml
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

Terminal 2: Node.js API Gateway (Express)
cd backend/node
npm run dev
(Running on http://localhost:5000)

Terminal 3: React Frontend (Vite)
npm run dev
(Running on http://localhost:5173)
```

---

## 12. Integration Risks & Mitigation Strategies

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Port Conflicts** | Services fail to bind to ports. | Fixed allocation: 5173 (React), 5000 (Node Gateway), 8000 (Python ML). Centralized in `.env` files. |
| **ML Inference Latency** | Slow UI rendering on 72h forecasts. | Aggregated `/api/dashboard/:site_id` endpoint pre-fetches summary data. Node Gateway implements lightweight in-memory caching for repeated horizons. |
| **Python Offline During Demo** | Broken UI / 500 errors. | Node Gateway's `MockDataService` automatically catches `ECONNREFUSED` and serves demo data with zero crashes. |
| **CORS Blocking** | Browser blocks frontend API requests. | Node Gateway has `cors` configured with `credentials: true` and origin whitelisting for `http://localhost:5173`. |
| **Data Shape Mismatches** | Recharts crashes on undefined fields. | TypeScript interfaces in `src/types/index.ts` and `backend/node/src/types/index.ts` strictly mirror each other. |

---

## 13. Recommended Integration Order

Following our agreed disciplined, one-step-at-a-time approach:

- [x] **STEP 1 → Audit the existing frontend + backend** *(Completed in this document)*
- [ ] **STEP 2 → Define the backend API contract**
  - Lock in OpenAPI / TypeScript contract interfaces between Frontend, Node, and Python.
  - Finalize site ID mapping (`solar-01` <-> `SITE_001`).
- [ ] **STEP 3 → Connect Node.js ↔ ML Engine**
  - Implement minimal FastAPI service in `backend/ml/app/main.py`.
  - Wire `mlClient.ts` to verify live ping and JSON responses between port 5000 and port 8000.
- [ ] **STEP 4 → Connect Node.js ↔ Data Layer**
  - Load `backend/dataset/gridsense_data/` into the ML/data pipeline.
  - Expose 72h forecast and operational records.
- [ ] **STEP 5 → Build unified backend startup**
  - Create simple npm/powershell scripts to launch both backend services reliably.
- [ ] **STEP 6 → Connect React frontend ↔ Node API**
  - Create `src/services/api.ts` in the React app using `fetch` / `axios`.
  - Add API connection health check indicator.
- [ ] **STEP 7 → Make Dashboard live**
  - Wire `Dashboard.tsx` to `GET /api/dashboard/:site_id`.
  - Verify KPIs, 24h chart, risk badges, and recommendation cards update dynamically.
- [ ] **STEP 8 → Make Forecast page live**
  - Wire `Forecast.tsx` to `GET /api/forecast/:site_id?hours={24|48|72}`.
  - Verify horizon switching and layer toggles.
- [ ] **STEP 9 → Make Simulator live**
  - Wire `useScenario.ts` to `POST /api/simulate`.
  - Verify slider inputs trigger backend recalculations.
- [ ] **STEP 10 → Make Decisions & Site pages live**
  - Wire `Decisions.tsx` to `/api/events` and `/api/recommendations`.
  - Wire `Site.tsx` to `/api/sites/:site_id`.
- [ ] **STEP 11 → Loading, error, and empty states**
  - Add skeleton loaders and error toast notifications across all pages.
- [ ] **STEP 12 → End-to-end testing**
  - Run the complete hackathon operator workflow from clean startup.
- [ ] **STEP 13 → Production & deployment preparation**
  - Validate production build (`npm run build`), environment checks, and documentation.

