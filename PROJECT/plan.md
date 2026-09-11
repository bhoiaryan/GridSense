# GridSense AI — MVP Development Plan

HackOut'26 | Renewable Energy Intelligence

Project:
GridSense AI

Tagline:
From Renewable Energy Forecasts to Intelligent Grid Decisions

Purpose:
This file is the single source of truth for the GridSense AI MVP.

Any AI coding agent working on this project MUST read this file before making architectural or implementation decisions.

---

# 1. PROJECT OVERVIEW

GridSense AI is an AI-powered renewable energy intelligence and decision-support platform.

The platform forecasts renewable generation for the next 24–72 hours using:

- Historical generation data
- Weather information
- Site-level parameters

It then goes beyond forecasting by:

- Estimating forecast uncertainty
- Detecting renewable surplus and shortfall
- Identifying operational risk
- Running what-if scenarios
- Evaluating possible responses
- Generating explainable recommendations
- Presenting results through an operator dashboard

Core philosophy:

FORECAST
→ UNDERSTAND
→ SIMULATE
→ OPTIMIZE
→ ACT

GridSense AI is a decision-support system.

It does NOT autonomously control the electrical grid.

The operator remains responsible for the final decision.

---

# 2. PRIMARY MVP OBJECTIVE

The MVP must demonstrate one complete end-to-end operational scenario.

Primary scenario:

Solar generation forecasting
→ Evening shortfall detection
→ Risk assessment
→ Battery/backup evaluation
→ What-if simulation
→ Action recommendation
→ Operator dashboard

The MVP should make this statement believable:

"GridSense AI predicts renewable generation, identifies operational risk, allows the operator to explore possible scenarios, and recommends an appropriate response."

---

# 3. MVP SCOPE

## 3.1 MUST HAVE

The following features are mandatory:

1. Solar generation forecasting
2. 24–72 hour forecast
3. Historical generation data
4. Weather data/features
5. Site parameters
6. Forecast uncertainty
7. Surplus detection
8. Shortfall detection
9. Risk classification
10. What-if scenario simulation
11. Battery/storage consideration
12. Backup generation consideration
13. Curtailment consideration
14. Action recommendation
15. Explainable recommendation
16. Operator dashboard
17. Forecast visualization
18. Risk alerts
19. Scenario result visualization
20. End-to-end working demo

---

## 3.2 SHOULD HAVE

Only implement after the core MVP works:

- Cost estimation
- Carbon impact estimation
- Battery SOC visualization
- Multiple scenario comparison
- Wind forecasting
- Multiple renewable sites
- AI Copilot for explanations

---

## 3.3 NICE TO HAVE

Only implement if the complete MVP is already stable:

- Live weather API
- Real-time streaming
- Energy trading intelligence
- Advanced mathematical optimization
- Multi-region support
- Automated reporting
- User authentication
- Advanced analytics

Optional features must NEVER delay the core MVP.

---

# 4. NON-GOALS

Do NOT build these for the initial MVP:

- Autonomous grid control
- Automatic battery control
- Automatic generator control
- Automatic curtailment execution
- Production-grade SCADA integration
- Kubernetes
- Complex microservice architecture
- Complex authentication
- Large-scale distributed infrastructure
- Multiple ML models without a clear need
- Deep-learning architecture without a clear need
- Full energy-market trading system

The goal is:

ONE COMPLETE, CONVINCING, TECHNICALLY CREDIBLE WORKFLOW.

---

# 5. PRIMARY USER

The primary MVP user is:

GRID OPERATOR

The operator needs to:

- Understand future renewable generation
- Identify potential problems
- Understand forecast uncertainty
- Test possible scenarios
- See available response options
- Review an explainable recommendation
- Make the final decision

Other users may be supported conceptually but do not require separate MVP interfaces.

---

# 6. PRIMARY DEMO SCENARIO

Use a solar plant with:

- Installed solar capacity
- Historical solar generation
- Weather conditions
- Expected demand
- Battery/storage availability
- Backup availability

The demonstration should contain a future period where solar generation decreases and creates a potential evening shortfall.

Conceptual flow:

Morning
↓
High Solar Generation
↓
Forecast Looks Normal
↓
Afternoon
↓
Changing Weather Conditions
↓
Expected Solar Output Decreases
↓
Evening
↓
Potential Shortfall
↓
Risk = HIGH
↓
Battery Available
↓
GridSense Recommends Battery Discharge

The exact numerical values must come from the actual dataset or simulation.

Do not fabricate model performance.

---

# 7. CORE SYSTEM FLOW

The complete system must follow:

DATA SOURCES
↓
DATA INGESTION & VALIDATION
↓
FEATURE ENGINEERING
↓
FORECASTING ENGINE
↓
UNCERTAINTY ENGINE
↓
RISK ENGINE
↓
SCENARIO ENGINE
↓
DECISION ENGINE
↓
RECOMMENDATION ENGINE
↓
OPERATOR DASHBOARD

Detailed flow:

Historical Generation
+
Weather Data
+
Site Parameters
+
Operational Data
↓
Data Processing
↓
Forecast
↓
Uncertainty
↓
Risk
↓
Scenario Simulation
↓
Action Evaluation
↓
Recommendation
↓
Dashboard
↓
Operator Decision

---

# 8. TECHNOLOGY STACK

## 8.1 Frontend

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React

Purpose:

- Dashboard
- Charts
- Alerts
- Scenario controls
- Recommendation display
- Navigation

---

## 8.2 Backend

Use:

- Python
- FastAPI
- Pydantic

Responsibilities:

- Data APIs
- Forecast APIs
- Risk calculations
- Scenario simulation
- Decision engine
- Recommendation generation

---

## 8.3 Machine Learning

Primary forecasting model:

XGBoost

Use XGBoost because it is:

- Fast
- Practical
- Suitable for tabular features
- Easy to train
- Easy to integrate with Python
- Suitable for a hackathon MVP

Do not unnecessarily introduce LSTM, Transformer, or other deep-learning models.

---

## 8.4 Data Processing

Use:

- Pandas
- NumPy
- Scikit-learn

Responsibilities:

- Data cleaning
- Feature engineering
- Data splitting
- Preprocessing
- Model evaluation

---

## 8.5 Database

Preferred:

PostgreSQL

For the initial prototype, CSV/JSON/local data is acceptable.

The architecture should allow migration to PostgreSQL without major changes.

---

## 8.6 Visualization

Use Recharts for:

- Generation forecast
- Forecast range
- Risk timeline
- Scenario comparison
- Battery status

---

# 9. LLM ROLE

If an LLM is included, it must NOT be responsible for:

- Forecasting
- Risk calculations
- Optimization
- Autonomous decisions

Correct architecture:

Forecast Model
↓
Risk Engine
↓
Decision Engine
↓
Recommendation
↓
LLM
↓
Human-readable Explanation

The deterministic ML/decision system produces the recommendation.

The LLM may explain the recommendation.

This distinction must remain clear throughout the application.

---

# 10. HIGH-LEVEL ARCHITECTURE

The system contains six major layers.

## Layer 1 — Data Layer

Inputs:

- Historical generation
- Weather
- Site information
- Demand
- Battery status
- Backup availability

↓

## Layer 2 — Forecasting Layer

Responsibilities:

- Feature preparation
- Model inference
- 24–72 hour forecast

↓

## Layer 3 — Intelligence Layer

Responsibilities:

- Forecast uncertainty
- Surplus detection
- Shortfall detection
- Risk classification

↓

## Layer 4 — Simulation Layer

Responsibilities:

- What-if scenarios
- Weather changes
- Demand changes
- Battery changes
- Backup availability changes

↓

## Layer 5 — Decision Layer

Responsibilities:

- Generate possible actions
- Check constraints
- Compare actions
- Generate recommendation

↓

## Layer 6 — Presentation Layer

Responsibilities:

- Dashboard
- Charts
- Alerts
- Recommendations
- Scenario results

---

# 11. DATA STRATEGY

The MVP should support two modes.

## Mode A — Demo Mode

Use prepared historical/simulated data.

This is the primary hackathon mode.

The demo must remain functional without depending on external services.

---

## Mode B — Live Weather Mode

If time permits, integrate a weather API.

Live APIs must be optional.

If an external API fails, the application must fall back to demo data.

External API failure must NEVER break the demo.

---

# 12. DATA MODEL

## 12.1 Generation Data

Conceptual fields:

- timestamp
- site_id
- generation_mw
- installed_capacity_mw

---

## 12.2 Weather Data

Potential fields:

- timestamp
- temperature
- cloud_cover
- irradiance
- wind_speed
- humidity

Only use fields that are actually available.

---

## 12.3 Site Data

Potential fields:

- site_id
- site_name
- location
- technology
- capacity_mw

---

## 12.4 Operational Data

Potential fields:

- timestamp
- demand_mw
- battery_soc
- battery_capacity_mwh
- battery_max_charge_mw
- battery_max_discharge_mw
- backup_available
- backup_capacity_mw

---

# 13. FORECASTING ENGINE

## 13.1 Objective

Predict solar generation for the next:

- 24 hours
- 48 hours
- 72 hours

---

## 13.2 Features

Potential historical features:

- Previous generation
- Lag generation
- Rolling averages
- Recent trends

Potential time features:

- Hour of day
- Day of week
- Month
- Day of year

Potential weather features:

- Irradiance
- Cloud cover
- Temperature

Site features:

- Installed capacity

Only use features supported by the actual data.

---

# 14. MODEL TRAINING

Use time-aware splitting.

Do NOT randomly shuffle the primary time-series data.

Conceptually:

TRAIN
→ VALIDATION
→ TEST

All training information must come from earlier time periods than the validation/test information.

Avoid data leakage.

---

# 15. FORECAST OUTPUT

The forecasting service should return:

- Timestamp
- Expected generation
- Lower bound
- Upper bound

Example:

{
  "timestamp": "2026-01-01T18:00:00",
  "expected_generation_mw": 80,
  "lower_bound_mw": 72,
  "upper_bound_mw": 88
}

These values are illustrative.

The actual application must generate real values.

---

# 16. UNCERTAINTY ENGINE

The forecast should not be treated as perfectly certain.

Output:

Expected Generation
+
Forecast Range
+
Confidence/Risk Indicator

Example:

Expected:
80 MW

Range:
72–88 MW

Confidence:
Medium

Do not claim a specific uncertainty methodology unless it is actually implemented.

---

# 17. RISK ENGINE

Risk levels:

- LOW
- MEDIUM
- HIGH

Potential risk factors:

- Forecast uncertainty
- Expected shortfall
- Expected surplus
- Demand relationship
- Battery availability
- Backup availability

Risk thresholds must be configurable.

Do not scatter hard-coded thresholds throughout the codebase.

---

# 18. SURPLUS DETECTION

Conceptually:

Forecast Generation > Expected Requirement

Possible actions:

1. Charge storage
2. Export energy
3. Curtail if required

The system should consider storage and export availability before recommending curtailment.

---

# 19. SHORTFALL DETECTION

Conceptually:

Forecast Generation < Expected Requirement

Possible actions:

1. Discharge storage
2. Import energy
3. Activate backup

The decision engine should consider available resources and constraints.

---

# 20. DECISION ENGINE

Possible actions:

- CHARGE_STORAGE
- DISCHARGE_STORAGE
- IMPORT_ENERGY
- EXPORT_ENERGY
- ACTIVATE_BACKUP
- CURTAIL_GENERATION
- NO_ACTION

Not every action is available in every situation.

---

# 21. DECISION LOGIC

Initially use transparent rule-based logic.

Shortfall example:

IF shortfall exists:

    IF battery has sufficient energy:
        recommend battery discharge

    ELSE IF grid import is available:
        recommend energy import

    ELSE IF backup is available:
        recommend backup activation

    ELSE:
        flag critical shortfall

Surplus example:

IF surplus exists:

    IF battery has available capacity:
        recommend battery charging

    ELSE IF export is available:
        recommend energy export

    ELSE:
        consider curtailment

Keep the logic transparent and explainable.

Do not build complex optimization before the basic decision engine works.

---

# 22. WHAT-IF SIMULATOR

The simulator is a key differentiating feature.

Allow the operator to modify:

## Weather

- Cloud cover

## Demand

- Demand adjustment

## Battery

- Battery availability

## Backup

- Available/unavailable

---

# 23. SIMULATION FLOW

Baseline Forecast
↓
User Changes Scenario
↓
Modify Relevant Inputs
↓
Recalculate Forecast/Risk
↓
Recalculate Available Actions
↓
Generate New Recommendation
↓
Compare With Baseline

Scenario changes must actually affect the resulting calculations.

Do not simply change text in the UI.

---

# 24. RECOMMENDATION ENGINE

Every recommendation should contain:

ACTION
+
REASON
+
EXPECTED IMPACT

Example:

RECOMMENDED ACTION:
Discharge Battery

REASON:
Expected renewable generation is below the anticipated requirement during the evening period.

EXPECTED IMPACT:
Reduce the potential shortfall before backup generation is considered.

---

# 25. FRONTEND SCREENS

The MVP should contain only these main screens:

1. Dashboard
2. Forecast
3. Scenario Simulator
4. Decision Center
5. Site Overview

Do not create unnecessary pages.

---

# 26. SCREEN 1 — DASHBOARD

Route:

/

Purpose:

Give the operator an immediate overview.

Components:

## Header

- GridSense AI
- Renewable Energy Intelligence
- Site selector
- Time range

## KPI Cards

- Current Generation
- Forecasted Generation
- Current Risk
- Battery Status

## Main Forecast Chart

Display:

- Historical generation
- Forecast
- Forecast range
- Current time
- Risk periods

## Risk Alert

Example:

HIGH RISK

Potential renewable shortfall

18:00–20:00

Expected deficit:
XX MW

## Recommendation Card

Display:

Recommended Action

Discharge Battery

Why?

Expected renewable generation is below the anticipated requirement.

Button:

View Details

## Quick Action

Button:

Run What-If Scenario

---

# 27. SCREEN 2 — FORECAST

Route:

/forecast

Purpose:

Detailed renewable generation forecast.

Components:

## Time Range

- 24 Hours
- 48 Hours
- 72 Hours

## Forecast Chart

Display:

- Expected generation
- Forecast range
- Historical generation
- Risk periods

## Forecast Details

For selected timestamp:

- Expected Generation
- Forecast Range
- Confidence
- Weather Factors
- Risk

## Explanation

Example:

Why is generation changing?

Increased cloud cover is contributing to lower expected solar generation.

---

# 28. SCREEN 3 — SCENARIO SIMULATOR

Route:

/simulator

Purpose:

Allow operators to test hypothetical conditions.

## Left Panel

Scenario Controls:

Cloud Cover

Demand Adjustment

Battery Availability

Backup Availability

Button:

RUN SIMULATION

## Right Panel

Scenario Results:

BASELINE vs SCENARIO

Show:

- Generation
- Risk
- Shortfall/Surplus
- Recommendation

Also show:

WHY DID THE RECOMMENDATION CHANGE?

Provide a concise explanation.

---

# 29. SCREEN 4 — DECISION CENTER

Route:

/decisions

Purpose:

Show detected events and recommendations.

## Event List

Example:

HIGH RISK
18:00–20:00
Potential Shortfall

MEDIUM RISK
13:00–15:00
Potential Surplus

## Selected Event

Show:

- Problem
- Possible Actions
- Resource Availability
- Recommended Action
- Reason
- Expected Impact

If cost information is unavailable, do not fabricate cost values.

---

# 30. SCREEN 5 — SITE OVERVIEW

Route:

/site

Purpose:

Show renewable plant information.

Display:

- Site Name
- Location
- Technology
- Installed Capacity
- Current Generation
- Battery SOC
- Battery Capacity
- Charge Limit
- Discharge Limit
- Backup Availability
- Backup Capacity

Keep this screen simple.

---

# 31. NAVIGATION

Use a simple sidebar or top navigation.

Recommended:

GridSense AI

Dashboard
Forecast
Simulator
Decision Center
Site

System Status

Do not add unnecessary navigation items.

---

# 32. UI DESIGN PRINCIPLES

The UI should feel like an operational energy platform.

Characteristics:

- Professional
- Clean
- Information-dense
- Easy to scan
- Clear risk states
- Clear charts
- Minimal decoration
- Strong hierarchy

Avoid:

- Generic SaaS landing-page design
- Huge hero sections
- Excessive gradients
- Excessive glassmorphism
- Decorative animations
- Stock photos
- AI robot graphics
- Unnecessary cards
- Unnecessary pages

---

# 33. COLOR SEMANTICS

Use color primarily to communicate meaning.

LOW RISK:
Safe/neutral

MEDIUM RISK:
Warning

HIGH RISK:
Critical

SURPLUS:
Positive/available energy

SHORTFALL:
Warning/critical

Do not rely only on color.

Always show textual status labels.

---

# 34. BACKEND API STRUCTURE

Suggested routes:

GET /api/health

GET /api/sites

GET /api/sites/{site_id}

GET /api/forecast/{site_id}

GET /api/forecast/{site_id}?hours=24

GET /api/risk/{site_id}

GET /api/events/{site_id}

GET /api/recommendations/{site_id}

POST /api/simulate

GET /api/system/status

Keep APIs simple and RESTful.

Do not over-engineer.

---

# 35. SIMULATION API

Conceptual request:

{
  "site_id": "solar-01",
  "cloud_cover_change": 20,
  "demand_change": 10,
  "battery_availability": 60,
  "backup_available": true
}

Conceptual response:

{
  "baseline": {
    "risk": "MEDIUM",
    "generation_mw": 50
  },
  "scenario": {
    "risk": "HIGH",
    "generation_mw": 42
  },
  "recommendation": {
    "action": "DISCHARGE_STORAGE",
    "reason": "Expected generation decreases under the scenario."
  }
}

Exact schemas may evolve, but frontend/backend contracts must remain synchronized.

---

# 36. BACKEND PROJECT STRUCTURE

Recommended:

backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── forecast.py
│   │   ├── risk.py
│   │   ├── simulation.py
│   │   ├── recommendations.py
│   │   └── sites.py
│   │
│   ├── services/
│   │   ├── forecasting.py
│   │   ├── uncertainty.py
│   │   ├── risk_engine.py
│   │   ├── simulation.py
│   │   └── decision_engine.py
│   │
│   ├── models/
│   │   ├── schemas.py
│   │   └── database.py
│   │
│   ├── ml/
│   │   ├── train.py
│   │   ├── predict.py
│   │   └── features.py
│   │
│   └── utils/
│       ├── data_loader.py
│       └── config.py
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── demo/
│
├── models/
│
├── requirements.txt
└── README.md

---

# 37. FRONTEND PROJECT STRUCTURE

Recommended:

frontend/
│
├── src/
│   │
│   ├── components/
│   │   ├── charts/
│   │   ├── cards/
│   │   ├── alerts/
│   │   ├── recommendations/
│   │   └── layout/
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Forecast.tsx
│   │   ├── Simulator.tsx
│   │   ├── Decisions.tsx
│   │   └── Site.tsx
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── hooks/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
└── README.md

---

# 38. DATABASE STRUCTURE

If PostgreSQL is used, keep the schema simple.

Potential tables:

- sites
- generation_records
- weather_records
- forecasts
- risk_events
- recommendations
- scenarios

Do not build an enterprise database schema.

---

# 39. SITE TABLE

Fields:

- id
- name
- location
- technology
- capacity_mw

---

# 40. GENERATION TABLE

Fields:

- id
- site_id
- timestamp
- generation_mw

---

# 41. WEATHER TABLE

Fields:

- id
- site_id
- timestamp
- temperature
- cloud_cover
- irradiance
- wind_speed
- humidity

Only include fields supported by the actual data.

---

# 42. FORECAST TABLE

Fields:

- id
- site_id
- timestamp
- expected_generation_mw
- lower_bound_mw
- upper_bound_mw

---

# 43. RISK EVENT TABLE

Fields:

- id
- site_id
- start_time
- end_time
- event_type
- risk_level
- expected_impact

---

# 44. RECOMMENDATION TABLE

Fields:

- id
- site_id
- timestamp
- action
- reason
- expected_impact

---

# 45. MODEL EVALUATION

Use:

- MAE
- RMSE
- MAPE where appropriate

Do not display invented accuracy numbers.

If model training has not been completed, do not display an accuracy percentage.

Actual evaluation results may be displayed only after real experiments.

---

# 46. ERROR HANDLING

Handle:

- Missing data
- Invalid timestamps
- API failure
- Missing weather data
- Model failure
- Simulation failure

Frontend should show meaningful user-friendly errors.

Never expose backend stack traces to users.

---

# 47. DEMO FALLBACK

The application must support demo data fallback.

If external data fails:

External Data
↓
Unavailable
↓
Demo Dataset
↓
Application Continues

The hackathon demo must not depend entirely on an external API.

---

# 48. SYSTEM STATUS

Show a small system-status indicator.

Example:

Data Pipeline     Operational
Forecast Engine   Operational
Risk Engine       Operational
Decision Engine   Operational

This can initially be based on backend health checks.

Do not make this unnecessarily complex.

---

# 49. ENVIRONMENT VARIABLES

Use environment variables for secrets/configuration.

Example:

BACKEND_PORT=
DATABASE_URL=
WEATHER_API_KEY=
LLM_API_KEY=

Only include variables that are actually required.

Never hard-code API keys.

Add .env to .gitignore.

---

# 50. SECURITY

For MVP:

- Never expose API keys in frontend code.
- Use environment variables.
- Validate backend inputs.
- Keep secrets out of Git.
- Do not expose internal errors.
- Validate simulation parameters.

Authentication is NOT required unless explicitly needed.

---

# 51. IMPLEMENTATION ORDER

Build vertically rather than building the entire frontend first.

## STEP 1 — Repository Setup

Create:

frontend/
backend/
data/
models/
docs/

Make frontend and backend run independently.

---

## STEP 2 — Data Pipeline

Implement:

Load Data
↓
Validate
↓
Clean
↓
Feature Preparation

Verify the data before moving forward.

---

## STEP 3 — Forecasting

Implement:

Features
↓
XGBoost
↓
24–72 Hour Forecast

Save/load the trained model.

Verify predictions.

---

## STEP 4 — Uncertainty

Implement forecast range/confidence.

Verify output.

---

## STEP 5 — Risk Engine

Implement:

Forecast
+
Demand
+
Uncertainty
↓
Risk

Verify surplus and shortfall detection.

---

## STEP 6 — Decision Engine

Implement:

Risk
↓
Possible Actions
↓
Constraints
↓
Recommendation

Test multiple conditions.

---

## STEP 7 — Scenario Simulator

Implement:

Baseline
↓
Modified Inputs
↓
Recalculate
↓
Compare

Verify that changing inputs actually changes the result.

---

## STEP 8 — FastAPI

Expose the working backend through APIs.

---

## STEP 9 — Dashboard

Build the dashboard using actual backend responses.

Do not hard-code dashboard results once APIs exist.

---

## STEP 10 — Remaining Screens

Implement:

- Forecast
- Simulator
- Decision Center
- Site

---

## STEP 11 — Integration

Verify:

Frontend
↕
API
↕
Decision Engine
↕
Forecasting Engine
↕
Data

---

## STEP 12 — Demo Hardening

Test the exact demo scenario repeatedly.

The demo must work from a clean application startup.

---

# 52. TEST CASES

## Test 1 — Normal Generation

Expected:

Risk = LOW

Recommendation = NO ACTION

---

## Test 2 — Shortfall + Battery Available

Expected:

Risk = HIGH

Recommendation = DISCHARGE STORAGE

---

## Test 3 — Shortfall + Battery Unavailable

Expected:

Recommendation = IMPORT or BACKUP

depending on configured availability.

---

## Test 4 — Surplus + Battery Available

Expected:

Recommendation = CHARGE STORAGE

---

## Test 5 — Surplus + Battery Full

Expected:

Recommendation = EXPORT

or CURTAILMENT if export is unavailable.

---

## Test 6 — High Uncertainty

Expected:

Risk increases appropriately or the period receives an uncertainty warning.

---

## Test 7 — What-If Scenario

Change:

Cloud Cover +20%

Expected:

Forecast changes
Risk changes
Recommendation may change

The exact result depends on the actual model/data.

---

# 53. FINAL DEMO FLOW

Target demo length:

3–5 minutes.

## Step 1 — Dashboard

Show:

- Current generation
- Forecast
- Risk
- Battery

---

## Step 2 — Forecast

Show:

24–72 hour forecast

and uncertainty range.

---

## Step 3 — Risk

Show the predicted evening shortfall.

Explain:

"The system identifies this potential problem before it occurs."

---

## Step 4 — Decision Center

Show:

- Risk
- Possible actions
- Recommendation
- Reason

---

## Step 5 — Scenario Simulator

Change:

Cloud Cover +20%

---

## Step 6 — Run Simulation

Show:

Baseline
vs
Scenario

---

## Step 7 — Changed Recommendation

Explain:

"The operator can test the consequence of changing conditions before making the decision."

---

## Step 8 — Final Message

FORECAST
↓
UNCERTAINTY
↓
RISK
↓
SIMULATION
↓
DECISION
↓
RECOMMENDATION

---

# 54. DEVELOPMENT RULES FOR AI CODING AGENTS

Any AI coding agent working on this project MUST:

1. Read PLAN.md before coding.
2. Follow the architecture defined here.
3. Avoid introducing unnecessary technologies.
4. Avoid adding features outside MVP scope.
5. Reuse existing components.
6. Keep frontend/backend contracts synchronized.
7. Never fabricate data.
8. Never fabricate ML results.
9. Never hard-code recommendations into the UI.
10. Keep decision logic explainable.
11. Keep the system modular.
12. Preserve working functionality.
13. Test significant changes.
14. Never replace working functionality without a clear reason.
15. Update documentation when architecture changes.
16. Do not introduce a new framework without a strong reason.
17. Do not over-engineer.
18. Prefer the simplest working solution.

---

# 55. CORE ARCHITECTURAL PRINCIPLE

The core intelligence must remain independent of the UI.

Correct:

Dashboard
↓
API
↓
Decision Engine
↓
Forecast / Risk / Simulation

Incorrect:

Dashboard
↓
Hard-coded Recommendation

The UI must consume actual backend results.

---

# 56. DATA / MODEL PRINCIPLE

The application must support:

DEMO MODE

using prepared data.

This guarantees a reliable hackathon presentation.

The architecture should optionally support:

LIVE MODE

later.

Live external APIs must never be required for the basic demo.

---

# 57. WHAT MAKES GRIDSENSE AI UNIQUE

Do NOT present the project as:

"An AI dashboard that predicts solar generation."

Present it as:

"A decision-intelligence platform that predicts renewable generation, quantifies uncertainty, identifies operational risk, simulates possible conditions, and recommends an appropriate response."

Central differentiator:

PREDICTION
↓
CONSEQUENCE
↓
DECISION

Not:

PREDICTION
↓
CHART

---

# 58. RESPONSIBLE AI POSITIONING

Throughout the application:

GridSense AI = DECISION-SUPPORT PLATFORM

NOT:

GridSense AI = AUTONOMOUS GRID CONTROLLER

The final flow is:

AI Recommendation
↓
Operator Decision

The platform must not automatically control:

- Batteries
- Generators
- Grid infrastructure
- Curtailment systems

unless such functionality is explicitly implemented and authorized.

---

# 59. FINAL MVP DEFINITION

The MVP is complete when this complete pipeline works:

HISTORICAL DATA
+
WEATHER DATA
+
SITE PARAMETERS
↓
DATA PROCESSING
↓
XGBOOST
↓
24–72 HOUR FORECAST
↓
UNCERTAINTY
↓
RISK DETECTION
↓
SURPLUS / SHORTFALL
↓
WHAT-IF SCENARIO
↓
DECISION ENGINE
↓
EXPLAINABLE ACTION
↓
DASHBOARD
↓
OPERATOR DECISION

If this pipeline works reliably, the MVP is successful.

Everything else is secondary.

---

# 60. DEFINITION OF DONE

The MVP is considered complete when:

[ ] Frontend starts successfully

[ ] Backend starts successfully

[ ] Data loads successfully

[ ] Forecast can be generated

[ ] 24-hour forecast works

[ ] 48-hour forecast works

[ ] 72-hour forecast works

[ ] Forecast uncertainty is displayed

[ ] Shortfall detection works

[ ] Surplus detection works

[ ] Risk levels are displayed

[ ] Battery availability affects decisions

[ ] Backup availability affects decisions

[ ] What-if simulation works

[ ] Scenario results change when inputs change

[ ] Decision engine produces recommendations

[ ] Recommendations contain reasons

[ ] Dashboard displays real backend data

[ ] Forecast screen works

[ ] Simulator works

[ ] Decision Center works

[ ] Site screen works

[ ] Demo scenario works from clean startup

[ ] No secrets are committed

[ ] No fabricated metrics are displayed

[ ] No critical console errors remain

[ ] No critical backend errors remain

[ ] Complete end-to-end workflow has been tested

---

# 61. PRIORITY ORDER

When time is limited, prioritize exactly in this order:

PRIORITY 1:
Forecasting

PRIORITY 2:
Risk / Surplus / Shortfall

PRIORITY 3:
Decision Recommendation

PRIORITY 4:
What-If Simulation

PRIORITY 5:
Dashboard

PRIORITY 6:
Explainability

PRIORITY 7:
Cost / Carbon Intelligence

PRIORITY 8:
Extra Features

Never sacrifice the core pipeline for optional features.

---

# 62. PRODUCT PHILOSOPHY

GridSense AI should always answer four questions:

WHAT WILL HAPPEN?
↓
HOW CERTAIN ARE WE?
↓
WHAT COULD GO WRONG?
↓
WHAT SHOULD THE OPERATOR CONSIDER DOING?

The system transforms:

RAW DATA
↓
FORECAST
↓
INTELLIGENCE
↓
ACTIONABLE DECISION SUPPORT

---

# 63. FINAL PRODUCT STORY

The entire product should communicate one simple story:

PROBLEM

Renewable generation is variable and difficult to plan.

↓

SOLUTION

GridSense AI forecasts renewable generation and turns forecasts into decision support.

↓

INTELLIGENCE

The system understands uncertainty and operational risk.

↓

SIMULATION

The operator can test what-if conditions.

↓

DECISION

The system evaluates possible responses.

↓

RECOMMENDATION

The operator receives an explainable recommended action.

↓

ACTION

The operator makes the final decision.

---

# 64. FINAL RULE

DO NOT BUILD EVERYTHING.

BUILD THE MOST IMPORTANT THING WELL.

The MVP must prioritize:

WORKING FORECAST
+
WORKING RISK ENGINE
+
WORKING DECISION ENGINE
+
WORKING SIMULATOR
+
WORKING DASHBOARD

A smaller fully working system is better than a large system with incomplete functionality.

============================================================
END OF PLAN.md
============================================================