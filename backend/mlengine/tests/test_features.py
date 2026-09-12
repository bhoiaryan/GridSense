"""Unit tests for GridPilot feature engineering pipeline.

Verifies:
1. Feature generation returns a DataFrame.
2. Required feature columns exist.
3. generation_mw exists as the target.
4. No feature contains future generation information (leakage prevention).
5. Lag values are correct.
6. Rolling mean is calculated from historical observations.
7. Time features are correct.
8. Weather columns are present.
9. installed_capacity_mw is taken from site data.
10. Output timestamps remain chronological.
11. Initial rows caused by insufficient lag history are handled correctly.
12. Feature/target split function works correctly.
"""

from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import pytest

from app.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    build_features,
    get_feature_target_split,
)


@pytest.fixture
def synthetic_controlled_data():
    """Create 48 hours of known deterministic data for precise math verification."""
    base_time = datetime(2025, 6, 1, 0, 0, 0)
    hours = 48
    timestamps = [base_time + timedelta(hours=i) for i in range(hours)]

    # Deterministic generation series: 1.0, 2.0, 3.0, ..., 48.0
    gen_values = [float(i + 1) for i in range(hours)]

    generation_df = pd.DataFrame({
        "timestamp": timestamps,
        "site_id": ["solar-01"] * hours,
        "generation_mw": gen_values,
    })

    weather_df = pd.DataFrame({
        "timestamp": timestamps,
        "cloud_cover": [10.0 + (i % 50) for i in range(hours)],
        "temperature": [20.0 + (i % 15) for i in range(hours)],
        "irradiance": [100.0 + (i * 10) for i in range(hours)],
    })

    sites_data = {
        "id": "solar-01",
        "name": "Solar Plant 01",
        "location": "Test Facility",
        "technology": "solar",
        "capacity_mw": 125.0,
    }

    return {
        "sites": sites_data,
        "generation": generation_df,
        "weather": weather_df,
    }


def test_feature_generation_returns_dataframe():
    """Test 1: Feature generation returns a valid non-empty DataFrame."""
    df = build_features()
    assert isinstance(df, pd.DataFrame)
    assert not df.empty
    assert len(df) > 8000


def test_required_feature_columns_exist():
    """Test 2: All canonical ML feature columns are present."""
    df = build_features()
    for col in FEATURE_COLUMNS:
        assert col in df.columns, f"Expected feature column '{col}' not found in DataFrame."


def test_target_column_exists():
    """Test 3: generation_mw exists as target and is excluded from input features."""
    df = build_features()
    assert TARGET_COLUMN in df.columns
    assert TARGET_COLUMN == "generation_mw"
    assert TARGET_COLUMN not in FEATURE_COLUMNS, "Target must not be included in the input feature set!"


def test_no_future_information_leakage(synthetic_controlled_data):
    """Test 4: Verify lag and rolling features do not use current or future observations."""
    df = build_features(data=synthetic_controlled_data, drop_na=False)

    # For any index t, generation_lag_1 must equal generation_mw at t-1, NOT t or t+1
    for t in range(1, len(df)):
        assert df.loc[t, "generation_lag_1"] == synthetic_controlled_data["generation"].loc[t - 1, "generation_mw"]

    # Target at index t must NOT equal generation_lag_1 at index t
    # (since our synthetic series strictly increases: gen[t] = t + 1 != gen[t-1] = t)
    for t in range(1, len(df)):
        assert df.loc[t, "generation_lag_1"] != df.loc[t, "generation_mw"]


def test_lag_values_are_correct(synthetic_controlled_data):
    """Test 5: Lag calculations match exact historical observations."""
    df = build_features(data=synthetic_controlled_data, drop_na=False)

    # In synthetic data: generation at index t is float(t + 1)
    # At index 25:
    # current t=25 (generation_mw = 26.0)
    # lag_1 is at t=24 -> 25.0
    # lag_2 is at t=23 -> 24.0
    # lag_3 is at t=22 -> 23.0
    # lag_24 is at t=1 -> 2.0
    assert df.loc[25, "generation_lag_1"] == 25.0
    assert df.loc[25, "generation_lag_2"] == 24.0
    assert df.loc[25, "generation_lag_3"] == 23.0
    assert df.loc[25, "generation_lag_24"] == 2.0


def test_rolling_mean_calculated_from_historical_observations(synthetic_controlled_data):
    """Test 6: Rolling means are computed purely over past observations."""
    df = build_features(data=synthetic_controlled_data, drop_na=False)

    # At index 25:
    # past 3 values are at indices 24, 23, 22 (values 25.0, 24.0, 23.0)
    # rolling_mean_3 = (25.0 + 24.0 + 23.0) / 3 = 24.0
    assert np.isclose(df.loc[25, "generation_rolling_mean_3"], 24.0)

    # At index 25:
    # past 6 values are 25.0, 24.0, 23.0, 22.0, 21.0, 20.0
    # rolling_mean_6 = sum / 6 = 22.5
    assert np.isclose(df.loc[25, "generation_rolling_mean_6"], 22.5)

    # Trend 3 is lag_1 - lag_3 = 25.0 - 23.0 = 2.0
    assert np.isclose(df.loc[25, "generation_trend_3"], 2.0)


def test_time_features_are_correct(synthetic_controlled_data):
    """Test 7: Calendar and daytime features match timestamps accurately."""
    df = build_features(data=synthetic_controlled_data, drop_na=True)

    for idx, row in df.iterrows():
        ts = pd.to_datetime(row["timestamp"])
        assert row["hour"] == ts.hour
        assert row["day_of_week"] == ts.dayofweek
        assert row["month"] == ts.month
        assert row["day_of_year"] == ts.dayofyear

        expected_daytime = 1 if 6 <= ts.hour <= 18 else 0
        assert row["is_daytime"] == expected_daytime


def test_weather_columns_present():
    """Test 8: Weather columns irradiance, cloud_cover, and temperature are present and numeric."""
    df = build_features()
    for w_col in ["irradiance", "cloud_cover", "temperature"]:
        assert w_col in df.columns
        assert pd.api.types.is_numeric_dtype(df[w_col])
        assert not df[w_col].isnull().any()


def test_installed_capacity_mw_from_site_data(synthetic_controlled_data):
    """Test 9: installed_capacity_mw is read dynamically from site configuration."""
    df = build_features(data=synthetic_controlled_data, drop_na=True)
    assert (df["installed_capacity_mw"] == 125.0).all()


def test_output_timestamps_remain_chronological():
    """Test 10: Timestamps are sorted in strict chronological order."""
    df = build_features()
    ts = pd.to_datetime(df["timestamp"])
    assert ts.is_monotonic_increasing is True


def test_initial_rows_handled_correctly(synthetic_controlled_data):
    """Test 11: Insufficient history rows (24 hours) are properly dropped with drop_na=True."""
    # When drop_na=False:
    df_raw = build_features(data=synthetic_controlled_data, drop_na=False)
    assert len(df_raw) == 48
    # Exactly first 24 rows have NaN in generation_lag_24
    assert df_raw.loc[:23, "generation_lag_24"].isnull().all()
    assert not df_raw.loc[24:, "generation_lag_24"].isnull().any()

    # When drop_na=True:
    df_clean = build_features(data=synthetic_controlled_data, drop_na=True)
    assert len(df_clean) == 24  # 48 - 24
    assert df_clean.isnull().sum().sum() == 0


def test_feature_target_split():
    """Test 12: get_feature_target_split correctly splits X and y."""
    df = build_features()
    X, y = get_feature_target_split(df)

    assert isinstance(X, pd.DataFrame)
    assert isinstance(y, pd.Series)
    assert list(X.columns) == FEATURE_COLUMNS
    assert y.name == TARGET_COLUMN
    assert len(X) == len(y) == len(df)
    assert TARGET_COLUMN not in X.columns
