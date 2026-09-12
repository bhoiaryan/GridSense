from typing import List
from ..schemas import RecommendationSchema, ScenarioInputSchema, ScenarioResultSchema, SystemStatusItemSchema

def get_recommendation(site_id: str) -> RecommendationSchema:
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
    return [
        SystemStatusItemSchema(label="Data Pipeline", status="Operational", detail="Telemetry streaming from demo data pack"),
        SystemStatusItemSchema(label="Forecast Engine (XGBoost)", status="Operational", detail="XGBoost inference pipeline ready (latency 12ms)"),
        SystemStatusItemSchema(label="Risk Engine", status="Operational", detail="Shortfall & surplus thresholds monitoring active"),
        SystemStatusItemSchema(label="Decision Engine", status="Operational", detail="Rule-based recommendation synthesizer online"),
    ]

