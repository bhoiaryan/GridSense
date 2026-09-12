from typing import List
from ..schemas import RecommendationSchema, ScenarioInputSchema, ScenarioResultSchema, SystemStatusItemSchema
from .ml_engine_client import get_model_intelligence, run_model_scenario
from .data_loader import DATASET_DIR
from .ml_engine_client import get_model_forecast

def get_recommendation(site_id: str) -> RecommendationSchema:
    target_id = "SITE_001" if site_id == "solar-01" else site_id
    model_intelligence = get_model_intelligence(target_id)
    if model_intelligence and isinstance(model_intelligence.get("recommendation"), dict):
        try:
            return RecommendationSchema(**model_intelligence["recommendation"])
        except (TypeError, ValueError):
            pass

    return RecommendationSchema(
        action="DISCHARGE_STORAGE",
        reason="Anticipated solar generation drop below evening demand threshold (18:00–20:00). Battery state of charge is optimal at 68%.",
        expectedImpact="Discharging 20 MW over 2 hours covers 95% of the projected deficit, avoiding costly diesel backup activation and spot grid import penalties.",
        constraints=[
            "Maintain battery reserve floor above 15% SoC (minimum 6.0 MWh).",
            "Discharge rate clamped to max inverter limit (20 MW).",
            "Keep auxiliary backup on standby if shortfall exceeds 2 hours.",
        ],
    )

def run_simulation(input_data: ScenarioInputSchema) -> ScenarioResultSchema:
    model_result = run_model_scenario(input_data.model_dump())
    if model_result:
        try:
            return ScenarioResultSchema(**model_result)
        except (TypeError, ValueError):
            pass

    base_gen = 32.4
    cloud_attenuation = 1.0 - (input_data.cloudCoverChange / 100.0) * 0.7
    simulated_gen = round(max(5.0, base_gen * cloud_attenuation), 1)

    base_demand = 45.0
    simulated_demand = round(base_demand * (1.0 + input_data.demandChange / 100.0), 1)
    deficit = round(max(0.0, simulated_demand - simulated_gen), 1)

    if deficit == 0.0:
        risk = "LOW"
        recommendation = "NO_ACTION"
        explanation = f"Generation ({simulated_gen} MW) satisfies simulated demand ({simulated_demand} MW). Standard grid baseline maintained."
    elif input_data.batteryAvailable and deficit <= 20.0:
        risk = "HIGH" if deficit > 12.0 else "MEDIUM"
        recommendation = "DISCHARGE_STORAGE"
        explanation = f"Shortfall of {deficit} MW detected. Battery storage is available and sufficient (up to 20 MW discharge limit) to cover the deficit."
    elif input_data.batteryAvailable and deficit > 20.0 and input_data.backupAvailable:
        risk = "HIGH"
        recommendation = "DISCHARGE_STORAGE_AND_BACKUP"
        explanation = f"Shortfall of {deficit} MW exceeds single battery limit (20 MW). Recommended joint dispatch: maximum battery discharge plus auxiliary backup."
    elif not input_data.batteryAvailable and input_data.backupAvailable:
        risk = "HIGH"
        recommendation = "ACTIVATE_BACKUP"
        explanation = f"Battery storage is unavailable. Auxiliary backup generators can supply up to 15 MW to offset the {deficit} MW shortfall."
    else:
        risk = "HIGH"
        recommendation = "CRITICAL_SHORTFALL_GRID_IMPORT"
        explanation = f"Neither battery storage nor backup generation is available to meet the {deficit} MW deficit. Immediate grid import or demand response required."

    return ScenarioResultSchema(
        generationMw=simulated_gen,
        shortfallMwh=deficit,
        risk=risk,
        recommendation=recommendation,
        explanation=explanation,
    )

def get_system_status() -> List[SystemStatusItemSchema]:
    required_data_files = (
        DATASET_DIR / "demo" / "sites.csv",
        DATASET_DIR / "demo" / "operations.csv",
        DATASET_DIR / "raw" / "generation_weather.csv",
    )
    data_available = all(path.exists() and path.stat().st_size > 0 for path in required_data_files)
    forecast = get_model_forecast("SITE_001", 24) if data_available else None
    intelligence = get_model_intelligence("SITE_001") if data_available else None

    forecast_points = forecast.get("forecast", []) if isinstance(forecast, dict) else []
    risks = intelligence.get("riskEvents") if isinstance(intelligence, dict) else None
    recommendation = intelligence.get("recommendation") if isinstance(intelligence, dict) else None

    return [
        SystemStatusItemSchema(
            label="Data Pipeline",
            status="Operational" if data_available else "Unavailable",
            detail="GridSense telemetry files are readable." if data_available else "One or more required GridSense telemetry files are missing or empty.",
        ),
        SystemStatusItemSchema(
            label="Forecast Engine (XGBoost)",
            status="Operational" if len(forecast_points) == 24 else "Unavailable",
            detail=f"XGBoost returned {len(forecast_points)} forecast points for SITE_001." if len(forecast_points) == 24 else "No valid XGBoost forecast response was received.",
        ),
        SystemStatusItemSchema(
            label="Risk Engine",
            status="Operational" if isinstance(risks, list) else "Unavailable",
            detail=f"XGBoost risk evaluation returned {len(risks)} active event(s)." if isinstance(risks, list) else "No model-derived risk evaluation was received.",
        ),
        SystemStatusItemSchema(
            label="Decision Engine",
            status="Operational" if isinstance(recommendation, dict) else "Unavailable",
            detail=f"Model-derived recommendation: {recommendation.get('action', 'unknown')}." if isinstance(recommendation, dict) else "No model-derived recommendation was received.",
        ),
    ]

