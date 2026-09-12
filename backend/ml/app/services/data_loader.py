import os
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Optional
from ..schemas import SiteInfoSchema, ForecastPointSchema, ForecastResponseSchema, KpiSchema, RiskEventSchema
from .ml_engine_client import get_model_forecast, get_model_intelligence

DATASET_DIR = Path(__file__).resolve().parent.parent.parent.parent / "dataset" / "gridsense_data"

def get_all_sites() -> List[SiteInfoSchema]:
    sites_path = DATASET_DIR / "demo" / "sites.csv"
    sites: List[SiteInfoSchema] = []
    
    if sites_path.exists():
        with open(sites_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cap = float(row.get("capacity_mw", 50))
                bat_cap = float(row.get("battery_capacity_mwh", 40))
                bat_power = float(row.get("battery_max_power_mw", 20))
                backup_cap = float(row.get("backup_capacity_mw", 15))
                site_id = row.get("site_id", "SITE_001")

                model_intelligence = get_model_intelligence(site_id)
                if model_intelligence and isinstance(model_intelligence.get("site"), dict):
                    try:
                        sites.append(SiteInfoSchema(**model_intelligence["site"]))
                        continue
                    except (TypeError, ValueError):
                        # Retain a data-pack fallback for a single malformed or
                        # unavailable engine response without hiding other sites.
                        pass
                
                sites.append(SiteInfoSchema(
                    id=site_id,
                    name=row.get("site_name", "Solar Plant"),
                    location=f"{row.get('latitude', '23.2')}, {row.get('longitude', '72.6')}",
                    technology="Utility-scale solar PV",
                    capacityMw=cap,
                    currentGenerationMw=round(cap * 0.648, 1),
                    batterySoc=68.0,
                    batteryCapacityMwh=bat_cap,
                    chargeLimitMw=round(bat_power * 0.75, 1),
                    dischargeLimitMw=bat_power,
                    backupAvailable=True,
                    backupCapacityMw=backup_cap,
                ))
    else:
        # Fallback default site
        sites.append(SiteInfoSchema(
            id="SITE_001",
            name="Gujarat Solar Farm",
            location="Gujarat, India",
            technology="Utility-scale solar PV",
            capacityMw=50.0,
            currentGenerationMw=32.4,
            batterySoc=68.0,
            batteryCapacityMwh=40.0,
            chargeLimitMw=15.0,
            dischargeLimitMw=20.0,
            backupAvailable=True,
            backupCapacityMw=15.0,
        ))
    return sites

def get_site_by_id(site_id: str) -> Optional[SiteInfoSchema]:
    # Alias handling
    target_id = "SITE_001" if site_id in ("solar-01", "SITE_001") else site_id
    model_intelligence = get_model_intelligence(target_id)
    if model_intelligence and isinstance(model_intelligence.get("site"), dict):
        return SiteInfoSchema(**model_intelligence["site"])

    sites = get_all_sites()
    for s in sites:
        if s.id == target_id:
            # If request used solar-01, preserve that ID for client compatibility
            if site_id == "solar-01":
                return s.model_copy(update={"id": "solar-01"})
            return s
    return None

def get_forecast_points(site_id: str, hours: int = 24) -> ForecastResponseSchema:
    forecast_path = DATASET_DIR / "demo" / "forecast_72h.csv"
    points: List[ForecastPointSchema] = []
    valid_hours = hours if hours in (24, 48, 72) else 24

    model_forecast = get_model_forecast(site_id, valid_hours)
    if model_forecast:
        try:
            model_points = [ForecastPointSchema(**point) for point in model_forecast.get("forecast", [])]
            if len(model_points) == valid_hours:
                return ForecastResponseSchema(
                    site_id=site_id,
                    horizon_hours=valid_hours,
                    total_points=len(model_points),
                    forecast=model_points,
                )
        except (TypeError, ValueError):
            # Preserve the demo CSV fallback when model output is malformed or unavailable.
            pass
    
    if forecast_path.exists():
        with open(forecast_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                if count >= valid_hours:
                    break
                
                ts_str = row.get("timestamp", "")
                try:
                    dt = datetime.fromisoformat(ts_str.replace(" ", "T"))
                except Exception:
                    dt = datetime.now()

                hour_str = f"{dt.hour:02d}:00"
                day_idx = count // 24
                day_label = "Today" if day_idx == 0 else "Tomorrow" if day_idx == 1 else "Day 3"
                full_time = f"{day_label} {hour_str}"

                exp = float(row.get("forecast_generation_mw", 0.0))
                lower = float(row.get("forecast_lower_mw", 0.0))
                upper = float(row.get("forecast_upper_mw", 0.0))
                demand = float(row.get("demand_mw", 20.0))
                gen_hist = float(row.get("generation_mw", 0.0)) if count < 6 else None
                risk = row.get("risk_level", "LOW").upper()

                # Synthesize weather drivers based on hour & risk
                cloud_cover = 76 if risk == "HIGH" else (30 if risk == "MEDIUM" else 15)
                irradiance = int(max(0, exp * 18))
                driver = "Cloud cover rising to 76%" if risk == "HIGH" else "Clear sky irradiance"
                explanation = "Generation drops below evening demand threshold causing net deficit." if risk == "HIGH" else "Stable operational margins."

                points.append(ForecastPointSchema(
                    hour=hour_str,
                    timestamp=dt.isoformat(),
                    dayLabel=day_label,
                    fullTimeLabel=full_time,
                    historical=round(gen_hist, 1) if gen_hist is not None else None,
                    expected=round(exp, 1),
                    lower=round(lower, 1),
                    upper=round(upper, 1),
                    demand=round(demand, 1),
                    cloudCover=cloud_cover,
                    irradiance=irradiance,
                    temperature=round(26.0 + (dt.hour % 6), 1),
                    windSpeed=3.5,
                    humidity=65,
                    confidenceScore=84 if risk == "HIGH" else 95,
                    risk=risk,
                    weatherDriver=driver,
                    explanation=explanation,
                ))
                count += 1

    return ForecastResponseSchema(
        site_id=site_id,
        horizon_hours=valid_hours,
        total_points=len(points),
        forecast=points,
    )

def get_risk_events(site_id: str) -> List[RiskEventSchema]:
    target_id = "SITE_001" if site_id == "solar-01" else site_id
    model_intelligence = get_model_intelligence(target_id)
    if model_intelligence:
        try:
            return [RiskEventSchema(**event) for event in model_intelligence.get("riskEvents", [])]
        except (TypeError, ValueError):
            pass

    return [
        RiskEventSchema(
            id="risk-evt-01",
            risk="HIGH",
            type="SHORTFALL",
            window="Today 18:00 - 20:00",
            expectedImpact="Projected net energy shortfall of ~16.8 MWh during evening peak demand.",
            problem="Rapid solar ramp-down combined with 75% afternoon cloud cover creates generation deficit before base grid compensation.",
        ),
        RiskEventSchema(
            id="risk-evt-02",
            risk="MEDIUM",
            type="UNCERTAINTY",
            window="Tomorrow 14:00 - 16:00",
            expectedImpact="Uncertainty spread expands to ±14 MW due to intermittent cumulus cloud formation.",
            problem="High variance in localized irradiance forecast requiring spinning reserve readiness.",
        ),
    ]

def get_dashboard_kpis(site_id: str) -> List[KpiSchema]:
    target_id = "SITE_001" if site_id == "solar-01" else site_id
    model_intelligence = get_model_intelligence(target_id)
    if model_intelligence:
        try:
            return [KpiSchema(**kpi) for kpi in model_intelligence.get("kpis", [])]
        except (TypeError, ValueError):
            pass
    return []

