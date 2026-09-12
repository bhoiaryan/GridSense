from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from .schemas import (
    SiteInfoSchema,
    ForecastResponseSchema,
    RiskEventSchema,
    RecommendationSchema,
    ScenarioInputSchema,
    ScenarioResultSchema,
    SystemStatusItemSchema,
)
from .services import data_loader, decision_engine

app = FastAPI(
    title="GridSense AI - Machine Learning & Intelligence Engine",
    description="Provides XGBoost forecasting, uncertainty bounds, risk assessment, and decision simulation.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "GridSense AI Python ML Engine",
        "version": "1.0.0",
        "engine": "XGBoost + Rule-Based Decision Engine",
    }

@app.get("/api/sites", response_model=List[SiteInfoSchema])
def get_sites():
    return data_loader.get_all_sites()

@app.get("/api/sites/{site_id}", response_model=SiteInfoSchema)
def get_site(site_id: str):
    site = data_loader.get_site_by_id(site_id)
    if not site:
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found")
    return site

@app.get("/api/forecast/{site_id}", response_model=ForecastResponseSchema)
def get_forecast(site_id: str, hours: int = Query(default=24, ge=24, le=72)):
    return data_loader.get_forecast_points(site_id, hours)

@app.get("/api/events/{site_id}", response_model=List[RiskEventSchema])
def get_events(site_id: str):
    return data_loader.get_risk_events(site_id)

@app.get("/api/recommendations/{site_id}", response_model=RecommendationSchema)
def get_recommendations(site_id: str):
    return decision_engine.get_recommendation(site_id)

@app.post("/api/simulate", response_model=ScenarioResultSchema)
def simulate(scenario: ScenarioInputSchema):
    return decision_engine.run_simulation(scenario)

@app.get("/api/system/status", response_model=List[SystemStatusItemSchema])
def system_status():
    return decision_engine.get_system_status()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

