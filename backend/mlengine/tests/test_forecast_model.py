"""Unit tests for XGBoost solar generation forecasting model.

Verifies:
1. Feature/target separation.
2. Chronological train/validation/test split.
3. No shuffling (strict temporal ordering).
4. Model can train on the demo dataset.
5. Model file is created.
6. Metadata file is created.
7. Prediction function returns the expected number of predictions.
8. Predictions are numeric and physically bounded.
9. Required feature validation detects missing columns.
10. Model manager handles missing model file gracefully.
"""

from pathlib import Path
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import pytest

from app.ml.features import FEATURE_COLUMNS, TARGET_COLUMN, get_feature_target_split
from app.ml.model_manager import (
    get_default_metadata_path,
    get_default_model_path,
    load_metadata,
    load_model,
)
from app.ml.predict import predict_generation
from app.ml.train import load_processed_features, split_data_chronological, train_model


@pytest.fixture(scope="module")
def processed_df():
    """Load the processed feature dataset once for the test suite."""
    return load_processed_features()


def test_feature_target_separation(processed_df):
    """Test 1: Feature/target separation cleanly isolates X and y."""
    X, y = get_feature_target_split(processed_df)

    assert isinstance(X, pd.DataFrame)
    assert isinstance(y, pd.Series)
    assert list(X.columns) == FEATURE_COLUMNS
    assert y.name == TARGET_COLUMN
    assert TARGET_COLUMN not in X.columns
    assert len(X) == len(y) == len(processed_df)


def test_chronological_split_ratios(processed_df):
    """Test 2: Chronological train/validation/test split preserves expected proportions."""
    train_df, val_df, test_df = split_data_chronological(processed_df, train_ratio=0.70, val_ratio=0.15)

    n_total = len(processed_df)
    assert len(train_df) + len(val_df) + len(test_df) == n_total
    assert len(train_df) == int(n_total * 0.70)
    assert len(val_df) == int(n_total * 0.15)
    assert len(test_df) == n_total - len(train_df) - len(val_df)


def test_no_shuffling_strict_chronological_ordering(processed_df):
    """Test 3: Splits are never shuffled and partition strictly in time order."""
    train_df, val_df, test_df = split_data_chronological(processed_df, train_ratio=0.70, val_ratio=0.15)

    # Within each split, timestamps are strictly increasing
    assert train_df["timestamp"].is_monotonic_increasing is True
    assert val_df["timestamp"].is_monotonic_increasing is True
    assert test_df["timestamp"].is_monotonic_increasing is True

    # Across splits, boundaries do not overlap
    assert train_df["timestamp"].max() < val_df["timestamp"].min()
    assert val_df["timestamp"].max() < test_df["timestamp"].min()


def test_model_training_and_metrics(processed_df):
    """Test 4: Model trains on the processed features and produces valid test metrics."""
    result = train_model(save_artifacts=True, verbose=False)

    assert "model" in result
    assert "metrics" in result
    assert "metadata" in result

    metrics = result["metrics"]
    assert metrics["sample_count"] > 0
    assert isinstance(metrics["mae"], float)
    assert metrics["mae"] >= 0.0
    assert isinstance(metrics["rmse"], float)
    assert metrics["rmse"] >= 0.0

    # Solar daytime MAPE exists and is realistic
    if metrics["mape"] is not None:
        assert metrics["mape"] >= 0.0


def test_model_file_created():
    """Test 5: Model .joblib artifact is created at the expected location."""
    model_path = get_default_model_path()
    assert model_path.exists(), f"Model artifact missing at {model_path}"
    assert model_path.stat().st_size > 0


def test_metadata_file_created():
    """Test 6: Metadata .json file is created and contains required schema."""
    meta_path = get_default_metadata_path()
    assert meta_path.exists(), f"Metadata file missing at {meta_path}"

    meta = load_metadata()
    assert meta["model_name"] == "solar_forecast_v1"
    assert meta["target_column"] == TARGET_COLUMN
    assert meta["feature_columns"] == FEATURE_COLUMNS
    assert "test_metrics" in meta
    assert "mae" in meta["test_metrics"]
    assert "rmse" in meta["test_metrics"]
    assert "hyperparameters" in meta


def test_prediction_count(processed_df):
    """Test 7: Prediction function returns expected number of predictions."""
    sample_1 = processed_df.iloc[:5]
    preds_1 = predict_generation(sample_1)
    assert len(preds_1) == 5

    sample_2 = processed_df.iloc[:20]
    preds_2 = predict_generation(sample_2)
    assert len(preds_2) == 20


def test_predictions_numeric_and_bounded(processed_df):
    """Test 8: Predictions are finite floats and physically bounded."""
    sample = processed_df.iloc[100:150]
    preds = predict_generation(sample)

    assert isinstance(preds, np.ndarray)
    assert np.issubdtype(preds.dtype, np.floating)
    assert np.all(np.isfinite(preds))
    # Generation must not be negative
    assert np.all(preds >= 0.0)
    # Generation must not exceed installed capacity
    max_cap = sample["installed_capacity_mw"].values
    assert np.all(preds <= max_cap + 1e-5)


def test_required_feature_validation(processed_df):
    """Test 9: predict_generation rejects input missing required feature columns."""
    sample = processed_df.iloc[:5].copy()
    sample_missing = sample.drop(columns=["irradiance"])

    with pytest.raises(ValueError) as exc_info:
        predict_generation(sample_missing)

    assert "Missing required feature columns" in str(exc_info.value)
    assert "irradiance" in str(exc_info.value)


def test_model_manager_missing_file_error():
    """Test 10: load_model raises clear FileNotFoundError when artifact does not exist."""
    fake_path = Path("models/xgboost/non_existent_model.joblib")
    with pytest.raises(FileNotFoundError) as exc_info:
        load_model(model_path=fake_path, use_cache=False)

    assert "Trained model not found" in str(exc_info.value)
