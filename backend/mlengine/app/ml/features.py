"""Feature engineering module for GridPilot solar power forecasting.

Transforms validated historical solar generation, weather, and site metadata
into an ML-ready time-series feature table for downstream XGBoost training.

Data Leakage Prevention:
------------------------
1. Shifted Historical Lags: Lag features (t-1, t-2, t-3, t-24) look strictly into
   prior hours relative to the current forecast timestamp t.
2. Shifted Rolling Windows: All rolling aggregations (3h, 6h, 24h) are computed
   on shifted historical values (generation_mw.shift(1)), ensuring the target
   observation at hour t is never included in its own historical features.
3. Target Isolation: 'generation_mw' serves strictly as the prediction target (y)
   and is excluded from the input feature set (X).
4. Chronological Integrity: Timestamps are sorted chronologically and never shuffled.
5. Missing Value Elimination: The initial rows lacking sufficient history (first 24 hours
   due to the 24-hour lag and rolling windows) are dropped rather than imputed with
   synthetic or future values.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd




# Canonical ML feature columns required for forecasting models
FEATURE_COLUMNS: List[str] = [
    "generation_lag_1",
    "generation_lag_2",
    "generation_lag_3",
    "generation_lag_24",
    "generation_rolling_mean_3",
    "generation_rolling_mean_6",
    "generation_rolling_mean_24",
    "generation_trend_3",
    "hour",
    "day_of_week",
    "month",
    "day_of_year",
    "is_daytime",
    "irradiance",
    "cloud_cover",
    "temperature",
    "installed_capacity_mw",
]

TARGET_COLUMN: str = "generation_mw"


def get_default_processed_dir() -> Path:
    """Resolve the default directory for processed ML features."""
    return Path(__file__).resolve().parent.parent.parent / "data" / "processed"


def build_features(
    data: Optional[Dict[str, Any]] = None,
    drop_na: bool = True,
) -> pd.DataFrame:
    """Construct an ML-ready feature DataFrame from validated datasets.

    Args:
        data: Optional dictionary containing 'sites', 'generation', and 'weather'.
              If None, data is loaded and validated via DataService.
        drop_na: If True, drops initial rows where historical lags/rolling windows
                 are undefined (specifically the first 24 observations).

    Returns:
        pd.DataFrame containing metadata ('timestamp', 'site_id'),
        the feature columns in FEATURE_COLUMNS, and the target 'generation_mw'.
    """
    if data is None:
        from app.services.data_service import DataService
        service = DataService()
        data = service.load_demo_data(validate=True)

    generation_df = data["generation"].copy()
    weather_df = data["weather"].copy()
    sites_info = data["sites"]

    # Extract installed capacity from site configuration
    if isinstance(sites_info, dict):
        installed_capacity_mw = float(sites_info.get("capacity_mw", 100.0))
    elif isinstance(sites_info, list) and len(sites_info) > 0:
        installed_capacity_mw = float(sites_info[0].get("capacity_mw", 100.0))
    else:
        installed_capacity_mw = 100.0

    # Ensure timestamps are parsed datetime objects
    generation_df["timestamp"] = pd.to_datetime(generation_df["timestamp"])
    weather_df["timestamp"] = pd.to_datetime(weather_df["timestamp"])

    # 1. Merge generation and weather datasets on timestamp
    merged = pd.merge(generation_df, weather_df, on="timestamp", how="inner")
    # Sort strictly chronologically
    merged = merged.sort_values("timestamp").reset_index(drop=True)

    # 2. Historical generation lag features
    # generation_lag_k represents the generation observed k hours prior to timestamp t
    merged["generation_lag_1"] = merged["generation_mw"].shift(1)
    merged["generation_lag_2"] = merged["generation_mw"].shift(2)
    merged["generation_lag_3"] = merged["generation_mw"].shift(3)
    merged["generation_lag_24"] = merged["generation_mw"].shift(24)

    # 3. Historical rolling statistics (shift(1) prevents target leakage)
    past_gen = merged["generation_mw"].shift(1)
    merged["generation_rolling_mean_3"] = past_gen.rolling(window=3).mean()
    merged["generation_rolling_mean_6"] = past_gen.rolling(window=6).mean()
    merged["generation_rolling_mean_24"] = past_gen.rolling(window=24).mean()

    # 4. Recent generation trend feature
    # Difference between generation at t-1 and generation at t-3 (2-hour ramp rate)
    merged["generation_trend_3"] = merged["generation_lag_1"] - merged["generation_lag_3"]

    # 5. Calendar and solar temporal features
    ts = merged["timestamp"]
    merged["hour"] = ts.dt.hour
    merged["day_of_week"] = ts.dt.dayofweek
    merged["month"] = ts.dt.month
    merged["day_of_year"] = ts.dt.dayofyear

    # Solar period indicator: daytime hours (06:00 to 18:00 inclusive)
    merged["is_daytime"] = ((merged["hour"] >= 6) & (merged["hour"] <= 18)).astype(int)

    # 6. Site metadata feature
    merged["installed_capacity_mw"] = installed_capacity_mw

    # 7. Select and order output columns
    ordered_cols = ["timestamp", "site_id"] + FEATURE_COLUMNS + [TARGET_COLUMN]
    feature_df = merged[ordered_cols].copy()

    # 8. Handling initial missing rows
    # The first 24 rows lack sufficient history for 24-hour lag and rolling features.
    # We drop these rows rather than imputing with future or zero values to avoid bias.
    if drop_na:
        feature_df = feature_df.dropna().reset_index(drop=True)

    return feature_df


def get_feature_target_split(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Split feature DataFrame into input feature matrix X and target vector y.

    Args:
        df: DataFrame containing FEATURE_COLUMNS and TARGET_COLUMN.

    Returns:
        Tuple (X, y) where X has columns FEATURE_COLUMNS and y is TARGET_COLUMN.
    """
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()
    return X, y


def save_features(
    df: pd.DataFrame,
    filepath: Optional[Union[str, Path]] = None,
) -> Path:
    """Persist processed feature dataset to CSV.

    Args:
        df: ML-ready feature DataFrame.
        filepath: Optional target path. Defaults to data/processed/solar_features.csv.

    Returns:
        Path to the saved CSV artifact.
    """
    if filepath is None:
        target_path = get_default_processed_dir() / "solar_features.csv"
    else:
        target_path = Path(filepath)

    target_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(target_path, index=False)
    return target_path


def load_processed_features(
    filepath: Optional[Union[str, Path]] = None,
) -> pd.DataFrame:
    """Load processed feature dataset, generating it on-the-fly if not found."""
    target_path = Path(filepath) if filepath else get_default_processed_dir() / "solar_features.csv"

    if target_path.exists():
        df = pd.read_csv(target_path)
    else:
        df = build_features(drop_na=True)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(target_path, index=False)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df

