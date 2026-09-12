"""Data-backed risk events and recommendations derived from model forecasts."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.forecast import get_model_forecast
from app.data.loaders.gridsense_loader import load_operations, load_sites

router = APIRouter(tags=["Operational intelligence"])


def _risk_events(points: list[dict[str, Any]]) -> list[dict[str, str]]:
    windows: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    for point in points:
        if float(point["demand"]) > float(point["expected"]):
            current.append(point)
        elif current:
            windows.append(current)
            current = []
    if current:
        windows.append(current)

    events: list[dict[str, str]] = []
    for index, window in enumerate(windows[:3], start=1):
        deficits = [max(0.0, float(point["demand"]) - float(point["expected"])) for point in window]
        peak_point = max(window, key=lambda point: float(point["demand"]) - float(point["expected"]))
        risk = "HIGH" if max(deficits) >= 20 else "MEDIUM"
        events.append({
            "id": f"model-risk-{index}",
            "risk": risk,
            "type": "SHORTFALL",
            "window": f"{window[0]['fullTimeLabel']} - {window[-1]['fullTimeLabel']}",
            "expectedImpact": f"Projected {sum(deficits):.1f} MWh shortfall across {len(window)} hourly intervals.",
            "problem": f"XGBoost forecast remains below demand; peak deficit is {max(deficits):.1f} MW. {peak_point['weatherDriver']}",
        })
    return events


def _recommendation(site: dict[str, Any], operation: dict[str, Any], events: list[dict[str, str]]) -> dict[str, Any]:
    battery_soc = float(operation["battery_soc_pct"])
    battery_capacity = float(site["battery_capacity_mwh"])
    discharge_limit = float(site["battery_max_power_mw"])
    backup_capacity = float(operation["backup_available_mw"])
    backup_available = str(operation["backup_status"]).lower() == "available" and backup_capacity > 0

    if not events:
        return {
            "action": "NO_ACTION",
            "reason": "The XGBoost replay forecast does not identify a generation deficit in the evaluated horizon.",
            "expectedImpact": "No dispatch action is required under the evaluated data-replay conditions.",
            "constraints": ["Continue monitoring incoming telemetry and forecast updates."],
        }

    if battery_soc > 15:
        action = "DISCHARGE_STORAGE"
        reason = f"Forecast shortfall is present and the battery holds {battery_soc:.1f}% state of charge."
        impact = f"Battery dispatch can provide up to {discharge_limit:.1f} MW subject to available energy."
    elif backup_available:
        action = "ACTIVATE_BACKUP"
        reason = f"Forecast shortfall is present while battery state of charge is {battery_soc:.1f}%, below the 15% reserve floor."
        impact = f"Available backup capacity is {backup_capacity:.1f} MW; remaining deficit may require grid import."
    else:
        action = "CRITICAL_SHORTFALL_GRID_IMPORT"
        reason = "Forecast shortfall is present with no dispatchable battery reserve or available backup capacity."
        impact = "Grid import or demand response is required to avoid unserved load."

    return {
        "action": action,
        "reason": reason,
        "expectedImpact": impact,
        "constraints": [
            "Maintain a 15% battery state-of-charge reserve floor.",
            f"Battery discharge is limited to {discharge_limit:.1f} MW and {battery_capacity:.1f} MWh nameplate capacity.",
            f"Reported backup availability is {backup_capacity:.1f} MW.",
        ],
    }


def _kpis(site_info: dict[str, Any], points: list[dict[str, Any]], events: list[dict[str, str]]) -> list[dict[str, str]]:
    current = points[-1]
    peak = max(points, key=lambda point: float(point["expected"]))
    deficits = [max(0.0, float(point["demand"]) - float(point["expected"])) for point in points]
    total_shortfall = sum(deficits)
    maximum_deficit = max(deficits, default=0.0)
    battery_soc = float(site_info["batterySoc"])
    battery_capacity = float(site_info["batteryCapacityMwh"])
    usable_storage = battery_capacity * battery_soc / 100
    shortfall_status = "HIGH" if maximum_deficit >= 20 else "MEDIUM" if total_shortfall > 0 else "OK"
    battery_status = "HIGH" if battery_soc <= 15 else "MEDIUM" if battery_soc <= 40 else "OK"

    return [
        {
            "label": "Current Generation",
            "value": f"{float(current['historical']):.1f} MW",
            "detail": f"{(float(current['historical']) / float(site_info['capacityMw']) * 100):.1f}% of {float(site_info['capacityMw']):.0f} MW rated capacity",
            "trend": f"Telemetry replay at {current['fullTimeLabel']}",
            "status": "OK",
        },
        {
            "label": "Forecast Peak Output",
            "value": f"{float(peak['expected']):.1f} MW",
            "detail": f"Expected at {peak['fullTimeLabel']}",
            "trend": f"Prediction interval: {float(peak['lower']):.1f}–{float(peak['upper']):.1f} MW",
            "status": "OK",
        },
        {
            "label": "Projected Shortfall",
            "value": f"{total_shortfall:.1f} MWh",
            "detail": events[0]["window"] if events else "No forecast shortfall in the evaluated horizon",
            "trend": f"Peak deficit: {maximum_deficit:.1f} MW",
            "status": shortfall_status,
        },
        {
            "label": "Battery Readiness",
            "value": f"{battery_soc:.0f}% SoC",
            "detail": f"{usable_storage:.1f} MWh stored of {battery_capacity:.1f} MWh capacity",
            "trend": f"Discharge limit: {float(site_info['dischargeLimitMw']):.1f} MW",
            "status": battery_status,
        },
    ]


@router.get("/intelligence/{site_id}")
def get_operational_intelligence(site_id: str) -> dict[str, Any]:
    try:
        site_frame = load_sites().set_index("site_id")
        if site_id not in site_frame.index:
            raise ValueError(f"Site '{site_id}' is not present in the GridSense data pack.")
        site = site_frame.loc[site_id].to_dict()
        operations = load_operations()
        operation = operations[operations["site_id"] == site_id].iloc[-1].to_dict()
        forecast = get_model_forecast(site_id, hours=72)
    except (ValueError, IndexError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    points = forecast["forecast"]
    events = _risk_events(points)
    current_point = points[-1]
    backup_capacity = float(operation["backup_available_mw"])
    backup_available = str(operation["backup_status"]).lower() == "available" and backup_capacity > 0
    site_info = {
        "id": site_id,
        "name": site["site_name"],
        "location": f"{site['latitude']}, {site['longitude']}",
        "technology": "Utility-scale solar PV",
        "capacityMw": float(site["capacity_mw"]),
        "currentGenerationMw": round(float(current_point["historical"]), 3),
        "batterySoc": round(float(operation["battery_soc_pct"]), 2),
        "batteryCapacityMwh": float(site["battery_capacity_mwh"]),
        "chargeLimitMw": round(float(site["battery_max_power_mw"]) * 0.75, 2),
        "dischargeLimitMw": float(site["battery_max_power_mw"]),
        "backupAvailable": backup_available,
        "backupCapacityMw": backup_capacity,
    }
    return {
        "site": site_info,
        "kpis": _kpis(site_info, points, events),
        "riskEvents": events,
        "recommendation": _recommendation(site, operation, events),
        "meta": {"source": "xgboost_model_and_gridsense_telemetry", "timestamp": current_point["timestamp"]},
    }
