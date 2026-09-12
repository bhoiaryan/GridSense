"""XGBoost-backed scenario calculations for the simplified frontend contract."""

from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loaders.gridsense_loader import build_site_features, load_operations, load_sites
from app.ml.predict import predict_generation_with_uncertainty

router = APIRouter(tags=["Scenario simulation"])


class FrontendScenarioRequest(BaseModel):
    cloudCoverChange: float = Field(default=0.0, ge=-100.0, le=100.0)
    demandChange: float = Field(default=0.0, ge=-100.0, le=500.0)
    batteryAvailable: bool = True
    backupAvailable: bool = True
    siteId: str = "SITE_001"


def _risk(total_shortfall: float, peak_shortfall: float) -> str:
    if peak_shortfall >= 20.0:
        return "HIGH"
    if total_shortfall > 0:
        return "MEDIUM"
    return "LOW"


@router.post("/scenario")
def simulate_frontend_scenario(request: FrontendScenarioRequest) -> dict[str, Any]:
    """Evaluate 24 hours of XGBoost predictions under requested assumptions.

    The prediction features are copied in memory. Cloud-cover changes alter
    irradiance before inference; demand and asset availability feed dispatch
    selection. No training or telemetry files are modified.
    """
    try:
        site_features = build_site_features(request.siteId).tail(24).copy()
        sites = load_sites().set_index("site_id")
        site = sites.loc[request.siteId]
        operation = load_operations().query("site_id == @request.siteId").iloc[-1]
    except (ValueError, KeyError, IndexError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    baseline_predictions = predict_generation_with_uncertainty(site_features)
    scenario_features = site_features.copy()
    original_cloud_cover = scenario_features["cloud_cover"].to_numpy(dtype=float)
    changed_cloud_cover = np.clip(original_cloud_cover + request.cloudCoverChange, 0.0, 100.0)
    scenario_features["cloud_cover"] = changed_cloud_cover
    cloud_delta = changed_cloud_cover - original_cloud_cover
    irradiance_factor = np.maximum(0.05, 1.0 - (cloud_delta / 100.0) * 0.75)
    scenario_features["irradiance"] = np.where(
        scenario_features["is_daytime"].to_numpy() == 1,
        scenario_features["irradiance"].to_numpy(dtype=float) * irradiance_factor,
        0.0,
    )
    scenario_predictions = predict_generation_with_uncertainty(scenario_features)

    demand = site_features["demand_mw"].to_numpy(dtype=float) * max(0.0, 1.0 + request.demandChange / 100.0)
    generation = scenario_predictions["expected_generation_mw"].to_numpy(dtype=float)
    deficits = np.maximum(0.0, demand - generation)
    total_shortfall = float(deficits.sum())
    peak_shortfall = float(deficits.max(initial=0.0))
    risk = _risk(total_shortfall, peak_shortfall)

    battery_soc = float(operation["battery_soc_pct"])
    battery_limit = float(site["battery_max_power_mw"])
    backup_capacity = float(operation["backup_available_mw"])
    recorded_backup_available = str(operation["backup_status"]).lower() == "available" and backup_capacity > 0

    if total_shortfall == 0:
        recommendation = "NO_ACTION"
        explanation = "XGBoost generation predictions meet adjusted demand across the 24-hour telemetry replay window."
    elif request.batteryAvailable and battery_soc > 15 and peak_shortfall <= battery_limit:
        recommendation = "DISCHARGE_STORAGE"
        explanation = f"The XGBoost scenario has a {peak_shortfall:.1f} MW peak deficit; battery dispatch is feasible within the {battery_limit:.1f} MW limit."
    elif request.backupAvailable and recorded_backup_available:
        recommendation = "ACTIVATE_BACKUP"
        explanation = f"The XGBoost scenario produces {total_shortfall:.1f} MWh of shortfall. Battery SOC is {battery_soc:.1f}%, so recorded {backup_capacity:.1f} MW backup is the available dispatch option."
    else:
        recommendation = "CRITICAL_SHORTFALL_GRID_IMPORT"
        explanation = f"The XGBoost scenario produces {total_shortfall:.1f} MWh of shortfall, with no eligible battery or backup dispatch under the selected assumptions."

    return {
        "generationMw": round(float(generation.mean()), 3),
        "shortfallMwh": round(total_shortfall, 3),
        "risk": risk,
        "recommendation": recommendation,
        "explanation": explanation,
        "meta": {
            "source": "xgboost_model_and_gridsense_telemetry",
            "siteId": request.siteId,
            "baselineGenerationMw": round(float(baseline_predictions["expected_generation_mw"].mean()), 3),
            "forecastContext": "24-hour historical telemetry replay",
        },
    }
