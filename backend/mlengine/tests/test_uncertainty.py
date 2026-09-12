"""Unit tests for solar forecast uncertainty estimation service.

Verifies:
1. Residual calculation is correct.
2. Percentile calculation is correct.
3. Lower bound never becomes negative.
4. Upper bound is greater than or equal to expected generation.
5. Lower bound is less than or equal to expected generation.
6. Uncertainty metadata is generated and persisted.
7. Test predictions use the validation-derived uncertainty value.
8. Coverage calculation is correct.
9. No test data is used to calculate the uncertainty threshold.
10. Capacity clamping prevents exceeding installed capacity.
11. Pydantic schemas validate correctly.
"""

from pathlib import Path
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import pytest

from app.ml.predict import predict_generation, predict_generation_with_uncertainty
from app.ml.train import load_processed_features, split_data_chronological
from app.schemas.forecast import ForecastPoint, ForecastResult, UncertaintyMetadata
from app.services.uncertainty_service import (
    UncertaintyService,
    apply_uncertainty_bounds,
    calculate_residuals,
    calculate_uncertainty_threshold,
    evaluate_uncertainty_coverage,
    get_default_uncertainty_path,
    load_uncertainty_metadata,
)


def test_residual_calculation():
    """Test 1: Residual is accurately computed as actual - predicted."""
    y_true = np.array([10.0, 25.0, 50.0])
    y_pred = np.array([8.0, 27.0, 50.0])

    residuals = calculate_residuals(y_true, y_pred)
    assert np.allclose(residuals, [2.0, -2.0, 0.0])


def test_percentile_calculation():
    """Test 2: Percentile calculation accurately reflects empirical absolute errors."""
    # 10 synthetic errors: 9 are 1.0 MW, 1 is 5.0 MW
    y_true = np.array([10.0] * 10)
    y_pred = np.array([9.0] * 9 + [5.0])

    # Absolute errors: [1.0, 1.0, ..., 1.0, 5.0]
    # At 50th percentile (median): 1.0
    p50 = calculate_uncertainty_threshold(y_true, y_pred, percentile=50.0)
    assert np.isclose(p50, 1.0)

    # At 90th percentile: interpolate between 1.0 and 5.0
    p90 = calculate_uncertainty_threshold(y_true, y_pred, percentile=90.0)
    assert p90 > 1.0 and p90 <= 5.0


def test_lower_bound_never_negative():
    """Test 3: Lower bound never becomes negative even when expected is zero or small."""
    expected = np.array([0.0, 0.2, 0.5, 5.0])
    threshold = 1.0

    lower, _ = apply_uncertainty_bounds(expected, error_threshold_mw=threshold)

    assert np.all(lower >= 0.0)
    assert lower[0] == 0.0
    assert lower[1] == 0.0
    assert lower[2] == 0.0
    assert np.isclose(lower[3], 4.0)


def test_upper_bound_ge_expected():
    """Test 4: Upper bound is always greater than or equal to expected generation."""
    expected = np.array([0.0, 10.0, 45.5, 80.0])
    threshold = 0.75

    _, upper = apply_uncertainty_bounds(expected, error_threshold_mw=threshold)

    assert np.all(upper >= expected)


def test_lower_bound_le_expected():
    """Test 5: Lower bound is always less than or equal to expected generation."""
    expected = np.array([0.0, 10.0, 45.5, 80.0])
    threshold = 0.75

    lower, _ = apply_uncertainty_bounds(expected, error_threshold_mw=threshold)

    assert np.all(lower <= expected)


def test_uncertainty_metadata_generation():
    """Test 6: Uncertainty metadata is generated and saved with valid attributes."""
    service = UncertaintyService()
    metadata = service.get_metadata()

    assert metadata["method"] == "residual_percentile"
    assert metadata["percentile"] == 90.0
    assert metadata["absolute_error_threshold_mw"] > 0.0
    assert metadata["validation_samples"] > 0
    assert len(metadata["validation_date_range"]) == 2
    assert metadata["calibrated"] is False

    meta_file = get_default_uncertainty_path()
    assert meta_file.exists()
    loaded = load_uncertainty_metadata(meta_file)
    assert loaded["method"] == metadata["method"]


def test_predictions_use_validation_threshold():
    """Test 7: Predictions with uncertainty correctly apply validation-derived threshold."""
    service = UncertaintyService()
    threshold = service.get_threshold()

    df = load_processed_features()
    sample = df.iloc[50:60].copy()

    forecast_df = predict_generation_with_uncertainty(sample)

    assert "timestamp" in forecast_df.columns
    assert "expected_generation_mw" in forecast_df.columns
    assert "lower_bound_mw" in forecast_df.columns
    assert "upper_bound_mw" in forecast_df.columns
    assert len(forecast_df) == 10

    # For daytime rows far from capacity limit (e.g. expected = 30 MW),
    # upper_bound - expected should equal threshold
    diff_upper = forecast_df["upper_bound_mw"] - forecast_df["expected_generation_mw"]
    for d in diff_upper:
        assert np.isclose(d, threshold, atol=1e-3) or d < threshold


def test_coverage_calculation_correctness():
    """Test 8: Coverage rate accurately counts values within [lower, upper]."""
    y_true = np.array([10.0, 20.0, 30.0, 40.0])
    lower = np.array([9.0, 19.0, 29.0, 42.0])   # 40.0 is below lower (out of bounds)
    upper = np.array([11.0, 21.0, 31.0, 50.0])

    cov = evaluate_uncertainty_coverage(y_true, lower, upper)

    assert cov["sample_count"] == 4
    assert cov["covered_samples"] == 3
    assert cov["coverage_percentage"] == 75.0
    assert np.isclose(cov["average_interval_width_mw"], 3.5)


def test_no_test_data_used_for_uncertainty_threshold():
    """Test 9: Verification that uncertainty threshold is fitted strictly on validation split."""
    df = load_processed_features()
    train_df, val_df, test_df = split_data_chronological(df)

    metadata = load_uncertainty_metadata()

    # Must equal validation length, NOT test or total length
    assert metadata["validation_samples"] == len(val_df)
    assert metadata["validation_samples"] != len(test_df)
    assert metadata["validation_samples"] != len(df)

    # Must match validation date range, NOT test date range
    val_start = str(val_df["timestamp"].min())
    val_end = str(val_df["timestamp"].max())
    assert metadata["validation_date_range"] == [val_start, val_end]

    test_start = str(test_df["timestamp"].min())
    assert metadata["validation_date_range"][0] != test_start


def test_capacity_clamping():
    """Test 10: Upper bound does not exceed installed capacity."""
    expected = np.array([98.0, 99.5])
    threshold = 2.0
    capacity = 100.0

    lower, upper = apply_uncertainty_bounds(expected, threshold, installed_capacity_mw=capacity)

    assert np.all(upper <= capacity)
    assert upper[0] == 100.0
    assert upper[1] == 100.0


def test_forecast_pydantic_schemas():
    """Test 11: ForecastPoint and ForecastResult Pydantic schemas validate types and bounds."""
    point = ForecastPoint(
        timestamp="2025-06-01 12:00:00",
        expected_generation_mw=45.2,
        lower_bound_mw=44.6,
        upper_bound_mw=45.8,
    )
    assert point.expected_generation_mw == 45.2

    # Negative lower bound should be rejected by Pydantic validator
    with pytest.raises(Exception):
        ForecastPoint(
            timestamp="2025-06-01 12:00:00",
            expected_generation_mw=45.2,
            lower_bound_mw=-1.0,
            upper_bound_mw=45.8,
        )
