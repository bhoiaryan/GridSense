"""Unit tests for GridPilot data loading and validation.

Verifies:
1. Valid generation data passes.
2. Negative generation is rejected.
3. Invalid cloud_cover is rejected.
4. Invalid battery SOC is rejected.
5. Missing required column is detected.
6. Duplicate timestamps are detected.
7. Invalid timestamp is detected.
8. Demo dataset end-to-end loading and validation via DataService.
"""

import pytest
import pandas as pd

from app.data.loaders.demo_loader import DemoDataLoader
from app.data.validators.data_validator import (
    DataValidationError,
    validate_sites,
    validate_generation,
    validate_weather,
    validate_operations,
    validate_alignment,
)
from app.services.data_service import DataService


# --- Fixtures for synthetic test cases ---

@pytest.fixture
def sample_valid_generation():
    return pd.DataFrame({
        "timestamp": [
            "2025-01-01 10:00:00",
            "2025-01-01 11:00:00",
            "2025-01-01 12:00:00",
        ],
        "site_id": ["solar-01", "solar-01", "solar-01"],
        "generation_mw": [25.5, 45.0, 60.2],
    })


@pytest.fixture
def sample_valid_weather():
    return pd.DataFrame({
        "timestamp": [
            "2025-01-01 10:00:00",
            "2025-01-01 11:00:00",
            "2025-01-01 12:00:00",
        ],
        "cloud_cover": [20.0, 35.5, 50.0],
        "temperature": [18.2, 20.1, 22.4],
        "irradiance": [450.0, 680.0, 820.0],
    })


@pytest.fixture
def sample_valid_operations():
    return pd.DataFrame({
        "timestamp": [
            "2025-01-01 10:00:00",
            "2025-01-01 11:00:00",
            "2025-01-01 12:00:00",
        ],
        "demand_mw": [40.0, 45.0, 50.0],
        "battery_soc": [65.0, 75.0, 85.0],
        "battery_capacity_mwh": [200.0, 200.0, 200.0],
        "battery_max_discharge_mw": [50.0, 50.0, 50.0],
        "backup_available": [True, True, True],
        "backup_capacity_mw": [25.0, 25.0, 25.0],
    })


# --- Test Cases ---

def test_valid_generation_passes(sample_valid_generation):
    """Test 1: Valid generation data passes validation."""
    result = validate_generation(sample_valid_generation, site_capacity_mw=100.0)
    assert result.valid is True
    assert len(result.errors) == 0
    assert result.row_count == 3


def test_negative_generation_is_rejected(sample_valid_generation):
    """Test 2: Negative generation values are rejected."""
    df_neg = sample_valid_generation.copy()
    df_neg.loc[1, "generation_mw"] = -5.0

    result = validate_generation(df_neg, site_capacity_mw=100.0)
    assert result.valid is False
    assert any("negative generation_mw" in err.lower() for err in result.errors)


def test_invalid_cloud_cover_is_rejected(sample_valid_weather):
    """Test 3: Cloud cover outside [0, 100] is rejected."""
    # Test above 100
    df_high = sample_valid_weather.copy()
    df_high.loc[0, "cloud_cover"] = 105.0
    result_high = validate_weather(df_high)
    assert result_high.valid is False
    assert any("cloud_cover values out of bounds" in err for err in result_high.errors)

    # Test negative
    df_neg = sample_valid_weather.copy()
    df_neg.loc[1, "cloud_cover"] = -10.0
    result_neg = validate_weather(df_neg)
    assert result_neg.valid is False
    assert any("cloud_cover values out of bounds" in err for err in result_neg.errors)


def test_invalid_battery_soc_is_rejected(sample_valid_operations):
    """Test 4: Battery SOC outside [0, 100] is rejected."""
    # Test SOC > 100
    df_high = sample_valid_operations.copy()
    df_high.loc[0, "battery_soc"] = 110.0
    result_high = validate_operations(df_high)
    assert result_high.valid is False
    assert any("battery_soc values out of bounds" in err for err in result_high.errors)

    # Test SOC < 0
    df_neg = sample_valid_operations.copy()
    df_neg.loc[2, "battery_soc"] = -2.5
    result_neg = validate_operations(df_neg)
    assert result_neg.valid is False
    assert any("battery_soc values out of bounds" in err for err in result_neg.errors)


def test_missing_required_column_is_detected(sample_valid_generation):
    """Test 5: Missing required columns are detected and reported."""
    df_missing = sample_valid_generation.drop(columns=["generation_mw"])
    result = validate_generation(df_missing)
    assert result.valid is False
    assert any("missing required columns" in err.lower() for err in result.errors)


def test_duplicate_timestamps_are_detected(sample_valid_generation):
    """Test 6: Duplicate timestamps are detected and rejected."""
    df_dup = pd.concat([sample_valid_generation, sample_valid_generation.iloc[[0]]], ignore_index=True)
    result = validate_generation(df_dup)
    assert result.valid is False
    assert any("duplicate" in err.lower() for err in result.errors)


def test_invalid_timestamp_is_detected(sample_valid_generation):
    """Test 7: Unparseable or malformed timestamps are detected."""
    df_bad_ts = sample_valid_generation.copy()
    df_bad_ts.loc[1, "timestamp"] = "not-a-valid-timestamp"
    result = validate_generation(df_bad_ts)
    assert result.valid is False
    assert any("unparseable" in err.lower() or "invalid timestamp" in err.lower() for err in result.errors)


def test_generation_exceeding_capacity_is_rejected(sample_valid_generation):
    """Generation exceeding installed capacity ceiling is rejected."""
    df_over = sample_valid_generation.copy()
    df_over.loc[2, "generation_mw"] = 120.0
    result = validate_generation(df_over, site_capacity_mw=100.0)
    assert result.valid is False
    assert any("exceeding installed capacity" in err for err in result.errors)


def test_sites_validation():
    """Sites configuration validation rules."""
    valid_site = {
        "id": "solar-01",
        "name": "Solar Plant 01",
        "location": "Demo Location",
        "technology": "solar",
        "capacity_mw": 100,
    }
    assert validate_sites(valid_site).valid is True

    # Missing technology
    invalid_site = valid_site.copy()
    del invalid_site["technology"]
    assert validate_sites(invalid_site).valid is False

    # Negative capacity
    invalid_cap = valid_site.copy()
    invalid_cap["capacity_mw"] = -50
    assert validate_sites(invalid_cap).valid is False


def test_demo_dataset_integration():
    """Test 8: Demo dataset loads and passes all validation via DataService."""
    service = DataService()
    summary = service.get_demo_summary()

    assert summary["number_of_sites"] == 1
    assert summary["generation_rows"] == 8760
    assert summary["weather_rows"] == 8760
    assert summary["operations_rows"] == 8760
    assert summary["validation"]["valid"] is True
    assert summary["validation"]["sites"]["valid"] is True
    assert summary["validation"]["generation"]["valid"] is True
    assert summary["validation"]["weather"]["valid"] is True
    assert summary["validation"]["operations"]["valid"] is True
    assert summary["validation"]["alignment"]["valid"] is True

    # Ensure load_demo_data executes cleanly without raising DataValidationError
    data = service.load_demo_data(validate=True)
    assert "sites" in data
    assert "generation" in data
    assert "weather" in data
    assert "operations" in data
