"""Load the unified GridSense data pack and build XGBoost-compatible features."""

from pathlib import Path

import pandas as pd

from app.ml.features import FEATURE_COLUMNS


DATASET_DIR = Path(__file__).resolve().parents[4] / "dataset" / "gridsense_data"


def load_sites() -> pd.DataFrame:
    return pd.read_csv(DATASET_DIR / "demo" / "sites.csv")


def load_operations() -> pd.DataFrame:
    operations = pd.read_csv(DATASET_DIR / "demo" / "operations.csv")
    operations["timestamp"] = pd.to_datetime(operations["timestamp"])
    return operations


def build_site_features(site_id: str) -> pd.DataFrame:
    """Build the model's canonical feature set from unified raw telemetry.

    Lag and rolling values only use prior generation measurements, matching the
    feature-engineering rules used to train ``solar_forecast_v1``.
    """
    raw = pd.read_csv(DATASET_DIR / "raw" / "generation_weather.csv")
    sites = load_sites().set_index("site_id")
    if site_id not in sites.index:
        raise ValueError(f"Site '{site_id}' is not present in the GridSense data pack.")

    frame = raw[raw["site_id"] == site_id].copy()
    if frame.empty:
        raise ValueError(f"No telemetry records are available for site '{site_id}'.")

    frame["timestamp"] = pd.to_datetime(frame["timestamp"])
    frame = frame.sort_values("timestamp").reset_index(drop=True)
    prior_generation = frame["generation_mw"].shift(1)

    frame["generation_lag_1"] = frame["generation_mw"].shift(1)
    frame["generation_lag_2"] = frame["generation_mw"].shift(2)
    frame["generation_lag_3"] = frame["generation_mw"].shift(3)
    frame["generation_lag_24"] = frame["generation_mw"].shift(24)
    frame["generation_rolling_mean_3"] = prior_generation.rolling(3).mean()
    frame["generation_rolling_mean_6"] = prior_generation.rolling(6).mean()
    frame["generation_rolling_mean_24"] = prior_generation.rolling(24).mean()
    frame["generation_trend_3"] = frame["generation_lag_1"] - frame["generation_lag_3"]

    frame["hour"] = frame["timestamp"].dt.hour
    frame["day_of_week"] = frame["timestamp"].dt.dayofweek
    frame["month"] = frame["timestamp"].dt.month
    frame["day_of_year"] = frame["timestamp"].dt.dayofyear
    frame["is_daytime"] = ((frame["hour"] >= 6) & (frame["hour"] <= 18)).astype(int)
    frame["irradiance"] = frame["irradiance_w_m2"]
    frame["cloud_cover"] = frame["cloud_cover_pct"]
    frame["temperature"] = frame["temperature_c"]
    frame["installed_capacity_mw"] = float(sites.loc[site_id, "capacity_mw"])

    required_columns = ["timestamp", "site_id", "generation_mw", "demand_mw", "humidity_pct", "wind_speed_m_s"] + FEATURE_COLUMNS
    return frame.dropna(subset=FEATURE_COLUMNS)[required_columns].reset_index(drop=True)
