"""Model-backed forecast API for the GridSense ML engine."""

from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.data.loaders.gridsense_loader import build_site_features
from app.ml.predict import predict_generation_with_uncertainty

router = APIRouter(tags=["Forecast"])


def _risk_for_point(lower_bound_mw: float, demand_mw: float) -> str:
    potential_shortfall = max(0.0, demand_mw - lower_bound_mw)
    if potential_shortfall >= 20.0:
        return "HIGH"
    if potential_shortfall > 0.0:
        return "MEDIUM"
    return "LOW"


@router.get("/forecast/{site_id}")
def get_model_forecast(
    site_id: str,
    hours: int = Query(default=24, ge=24, le=72),
) -> dict[str, Any]:
    """Return XGBoost predictions and empirical uncertainty bounds.

    The saved model is evaluated against the most recent GridSense telemetry
    records available for the requested horizon. This demo uses historical
    replay data, not an external live-weather forecast.
    """
    try:
        site_features = build_site_features(site_id).tail(hours).copy()
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if len(site_features) < hours:
        raise HTTPException(status_code=422, detail=f"Only {len(site_features)} GridSense feature rows are available.")

    predictions = predict_generation_with_uncertainty(site_features)
    points: list[dict[str, Any]] = []
    for (_, feature), (_, prediction) in zip(site_features.iterrows(), predictions.iterrows()):
        target_timestamp = pd.Timestamp(feature["timestamp"])
        demand_mw = float(feature["demand_mw"])
        expected = float(prediction["expected_generation_mw"])
        lower = float(prediction["lower_bound_mw"])
        upper = float(prediction["upper_bound_mw"])
        risk = _risk_for_point(lower, demand_mw)

        points.append({
            "hour": target_timestamp.strftime("%H:%M"),
            "timestamp": target_timestamp.isoformat(),
            "dayLabel": target_timestamp.strftime("%Y-%m-%d"),
            "fullTimeLabel": target_timestamp.strftime("%Y-%m-%d %H:%M"),
            "historical": float(feature["generation_mw"]),
            "expected": round(expected, 3),
            "lower": round(lower, 3),
            "upper": round(upper, 3),
            "demand": round(demand_mw, 3),
            "cloudCover": int(round(float(feature["cloud_cover"]))),
            "irradiance": int(round(float(feature["irradiance"]))),
            "temperature": round(float(feature["temperature"]), 2),
            "windSpeed": round(float(feature["wind_speed_m_s"]), 2),
            "humidity": int(round(float(feature["humidity_pct"]))),
            "risk": risk,
            "weatherDriver": "XGBoost prediction using engineered irradiance, cloud-cover, temperature, and generation-lag features.",
            "explanation": "Prediction interval uses the saved empirical validation-residual uncertainty threshold.",
        })

    return {
        "site_id": site_id,
        "horizon_hours": hours,
        "total_points": len(points),
        "forecast": points,
        "meta": {
            "source": "xgboost_model",
            "model": "solar_forecast_v1",
            "forecast_context": "gridsense_historical_replay",
        },
    }
