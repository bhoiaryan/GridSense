"""Uncertainty estimation service for solar power forecasting.

Provides empirical residual-based prediction intervals around XGBoost point predictions:
- Estimates error distribution from held-out validation set residuals
- Calculates non-negative lower bounds (lower_bound_mw >= 0.0)
- Enforces installed capacity upper bounds (upper_bound_mw <= capacity_mw)
- Evaluates test set coverage rate and interval width
- Serializes and loads uncertainty metadata

Methodology Note:
-----------------
This service generates empirical prediction intervals using the 90th percentile
of absolute validation residuals (|y_val - y_hat_val|). It does NOT claim to be
a formally calibrated conformal prediction interval; rather, it provides an
operational empirical uncertainty band grounded in real validation error distributions.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd

from app.ml.features import FEATURE_COLUMNS, TARGET_COLUMN, get_feature_target_split
from app.ml.model_manager import get_default_models_dir, load_model
from app.schemas.forecast import ForecastPoint, ForecastResult, UncertaintyMetadata


def get_default_uncertainty_path() -> Path:
    """Resolve default path for uncertainty metadata JSON."""
    return get_default_models_dir() / "solar_forecast_v1_uncertainty.json"


def calculate_residuals(
    y_true: Union[pd.Series, np.ndarray],
    y_pred: Union[pd.Series, np.ndarray],
) -> np.ndarray:
    """Calculate signed residuals (actual - predicted)."""
    y_t = np.asarray(y_true, dtype=float)
    y_p = np.asarray(y_pred, dtype=float)
    return y_t - y_p


def calculate_uncertainty_threshold(
    y_true: Union[pd.Series, np.ndarray],
    y_pred: Union[pd.Series, np.ndarray],
    percentile: float = 90.0,
) -> float:
    """Compute empirical absolute error percentile from validation predictions.

    Args:
        y_true: Ground truth target values (from validation split).
        y_pred: Model predictions (from validation split).
        percentile: Percentile value between 0 and 100 (default: 90.0).

    Returns:
        Float threshold in MW.
    """
    y_t = np.asarray(y_true, dtype=float)
    y_p = np.asarray(y_pred, dtype=float)

    if len(y_t) == 0:
        raise ValueError("Cannot calculate uncertainty threshold on empty arrays.")

    abs_errors = np.abs(y_t - y_p)
    threshold = float(np.percentile(abs_errors, percentile))
    return threshold


def apply_uncertainty_bounds(
    expected_mw: Union[pd.Series, np.ndarray, float],
    error_threshold_mw: float,
    installed_capacity_mw: Optional[Union[pd.Series, np.ndarray, float]] = None,
) -> Tuple[np.ndarray, np.ndarray]:
    """Generate physical lower and upper uncertainty bounds around expected generation.

    Enforces physical reality constraints:
    1. Solar generation is strictly non-negative: lower_bound >= 0.0
    2. Lower bound is less than or equal to expected generation: lower_bound <= expected
    3. Upper bound is greater than or equal to expected generation: upper_bound >= expected
    4. If capacity is supplied, generation cannot exceed nameplate capacity: upper_bound <= capacity

    Args:
        expected_mw: Point predictions in MW.
        error_threshold_mw: Absolute uncertainty band width (MW).
        installed_capacity_mw: Optional installed nameplate capacity (MW).

    Returns:
        Tuple of (lower_bound_mw, upper_bound_mw) as numpy arrays.
    """
    exp = np.asarray(expected_mw, dtype=float)
    delta = float(error_threshold_mw)

    # 1. Lower bound (clamped at 0.0)
    lower = np.maximum(0.0, exp - delta)

    # 2. Upper bound (clamped at capacity if available)
    raw_upper = exp + delta
    if installed_capacity_mw is not None:
        cap = np.asarray(installed_capacity_mw, dtype=float)
        upper = np.minimum(cap, raw_upper)
    else:
        upper = raw_upper

    # Enforce internal consistency: lower <= expected <= upper
    upper = np.maximum(exp, upper)
    lower = np.minimum(exp, lower)

    return lower, upper


def evaluate_uncertainty_coverage(
    y_true: Union[pd.Series, np.ndarray],
    lower_bound: Union[pd.Series, np.ndarray],
    upper_bound: Union[pd.Series, np.ndarray],
) -> Dict[str, Any]:
    """Evaluate empirical coverage and sharpness on test set predictions.

    Args:
        y_true: Ground truth observations (from test split).
        lower_bound: Lower prediction intervals.
        upper_bound: Upper prediction intervals.

    Returns:
        Dictionary with coverage percentage, average interval width, and sample count.
    """
    y_t = np.asarray(y_true, dtype=float)
    low = np.asarray(lower_bound, dtype=float)
    up = np.asarray(upper_bound, dtype=float)

    if not (len(y_t) == len(low) == len(up)):
        raise ValueError("Length mismatch between targets, lower bounds, and upper bounds.")

    in_bounds = (y_t >= low - 1e-6) & (y_t <= up + 1e-6)
    coverage_pct = float(np.mean(in_bounds) * 100.0)
    avg_width = float(np.mean(up - low))

    return {
        "sample_count": len(y_t),
        "coverage_percentage": round(coverage_pct, 2),
        "covered_samples": int(np.sum(in_bounds)),
        "average_interval_width_mw": round(avg_width, 4),
    }


def save_uncertainty_metadata(
    metadata: Dict[str, Any],
    filepath: Optional[Union[str, Path]] = None,
) -> Path:
    """Save uncertainty parameters and diagnostics to JSON."""
    target_path = Path(filepath) if filepath else get_default_uncertainty_path()
    target_path.parent.mkdir(parents=True, exist_ok=True)

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return target_path


def load_uncertainty_metadata(
    filepath: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Load uncertainty parameters from JSON."""
    target_path = Path(filepath) if filepath else get_default_uncertainty_path()

    if not target_path.exists():
        raise FileNotFoundError(
            f"Uncertainty metadata not found at: {target_path}\n"
            "Run 'UncertaintyService().fit_and_save_validation_uncertainty()' first."
        )

    with open(target_path, "r", encoding="utf-8") as f:
        return json.load(f)


class UncertaintyService:
    """Orchestrates uncertainty calibration, prediction interval generation, and schema mapping."""

    def __init__(
        self,
        metadata_path: Optional[Union[str, Path]] = None,
    ) -> None:
        self.metadata_path = Path(metadata_path) if metadata_path else get_default_uncertainty_path()
        self._cached_metadata: Optional[Dict[str, Any]] = None

    def get_metadata(self) -> Dict[str, Any]:
        """Retrieve uncertainty metadata, loading from disk if not cached."""
        if self._cached_metadata is None:
            if self.metadata_path.exists():
                self._cached_metadata = load_uncertainty_metadata(self.metadata_path)
            else:
                # Fit and save if not yet created
                self._cached_metadata = self.fit_and_save_validation_uncertainty()
        return self._cached_metadata

    def get_threshold(self) -> float:
        """Get current empirical absolute error threshold in MW."""
        meta = self.get_metadata()
        return float(meta["absolute_error_threshold_mw"])

    def fit_and_save_validation_uncertainty(
        self,
        model: Optional[Any] = None,
        val_df: Optional[pd.DataFrame] = None,
        percentile: float = 90.0,
    ) -> Dict[str, Any]:
        """Fit empirical uncertainty threshold on the validation split and persist metadata.

        Strictly respects data partitioning: only VALIDATION data is used to compute the threshold.
        """
        # Load validation data if not supplied
        if val_df is None:
            from app.ml.train import load_processed_features, split_data_chronological
            df = load_processed_features()
            _, val_df, _ = split_data_chronological(df)

        estimator = model if model is not None else load_model()

        X_val, y_val = get_feature_target_split(val_df)
        val_preds = estimator.predict(X_val)

        # Calculate empirical error threshold from validation residuals
        error_threshold = calculate_uncertainty_threshold(
            y_val.values, val_preds, percentile=percentile
        )

        val_date_range = [
            str(val_df["timestamp"].min()),
            str(val_df["timestamp"].max()),
        ]

        metadata = {
            "method": "residual_percentile",
            "percentile": float(percentile),
            "absolute_error_threshold_mw": round(error_threshold, 4),
            "validation_samples": len(val_df),
            "validation_date_range": val_date_range,
            "target_column": TARGET_COLUMN,
            "model_version": "solar_forecast_v1",
            "calibrated": False,
            "notes": (
                "Empirical prediction interval based on the 90th percentile of absolute validation residuals. "
                "Non-calibrated band; lower bounds are physically clamped at 0.0 MW."
            ),
        }

        save_uncertainty_metadata(metadata, filepath=self.metadata_path)
        self._cached_metadata = metadata
        return metadata

    def generate_forecast_dataframe(
        self,
        features_df: pd.DataFrame,
        predictions: Optional[np.ndarray] = None,
        error_threshold_mw: Optional[float] = None,
    ) -> pd.DataFrame:
        """Generate a DataFrame containing timestamp, expected_generation_mw, lower_bound_mw, upper_bound_mw."""
        from app.ml.predict import predict_generation

        # Predict if not passed
        if predictions is None:
            preds = predict_generation(features_df)
        else:
            preds = np.asarray(predictions, dtype=float)

        threshold = error_threshold_mw if error_threshold_mw is not None else self.get_threshold()

        capacity = (
            features_df["installed_capacity_mw"].values
            if "installed_capacity_mw" in features_df.columns
            else None
        )

        lower, upper = apply_uncertainty_bounds(
            expected_mw=preds,
            error_threshold_mw=threshold,
            installed_capacity_mw=capacity,
        )

        timestamps = (
            features_df["timestamp"].values
            if "timestamp" in features_df.columns
            else np.arange(len(preds))
        )

        forecast_df = pd.DataFrame({
            "timestamp": timestamps,
            "expected_generation_mw": np.round(preds, 4),
            "lower_bound_mw": np.round(lower, 4),
            "upper_bound_mw": np.round(upper, 4),
        })

        return forecast_df

    def generate_forecast_points(
        self,
        features_df: pd.DataFrame,
        predictions: Optional[np.ndarray] = None,
        error_threshold_mw: Optional[float] = None,
    ) -> List[ForecastPoint]:
        """Convert forecast calculations into validated Pydantic ForecastPoint objects."""
        df_forecast = self.generate_forecast_dataframe(
            features_df=features_df,
            predictions=predictions,
            error_threshold_mw=error_threshold_mw,
        )

        points: List[ForecastPoint] = []
        for _, row in df_forecast.iterrows():
            points.append(
                ForecastPoint(
                    timestamp=str(row["timestamp"]),
                    expected_generation_mw=float(row["expected_generation_mw"]),
                    lower_bound_mw=float(row["lower_bound_mw"]),
                    upper_bound_mw=float(row["upper_bound_mw"]),
                )
            )
        return points
