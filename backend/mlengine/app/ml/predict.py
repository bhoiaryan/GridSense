"""Inference and prediction module for solar generation forecasting.

Applies the trained XGBoost model to engineered features to produce
calibrated generation forecasts with optional empirical uncertainty bounds.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd

from app.ml.features import FEATURE_COLUMNS
from app.ml.model_manager import load_model


def predict_generation(
    features: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]],
    model: Optional[Any] = None,
    clip_physical_bounds: bool = True,
    return_bounds: bool = False,
    error_threshold_mw: Optional[float] = None,
) -> Union[np.ndarray, Tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """Predict solar generation (MW) from input feature records.

    Args:
        features: Input feature data (DataFrame, dict, or list of dicts).
                  Must contain all columns in FEATURE_COLUMNS.
        model: Optional pre-loaded model estimator. If None, loads via model_manager.
        clip_physical_bounds: If True, clips predictions between 0.0 MW and the site's
                              installed capacity to respect physical solar limits.
        return_bounds: If True, returns a tuple of (predictions, lower_bounds, upper_bounds).
        error_threshold_mw: Optional uncertainty error threshold in MW. If None and return_bounds
                            is True, threshold is loaded from UncertaintyService.

    Returns:
        1D numpy array of predicted generation values in MW, or
        tuple of (predictions, lower_bounds, upper_bounds) if return_bounds is True.

    Raises:
        ValueError: If required feature columns are missing from the input data.
    """
    # 1. Normalize input to DataFrame
    if isinstance(features, dict):
        df_input = pd.DataFrame([features])
    elif isinstance(features, list):
        df_input = pd.DataFrame(features)
    elif isinstance(features, pd.DataFrame):
        df_input = features.copy()
    else:
        raise TypeError(f"Unsupported features type: {type(features)}. Expected DataFrame, dict, or list.")

    # 2. Validate presence of required features
    missing_cols = [col for col in FEATURE_COLUMNS if col not in df_input.columns]
    if missing_cols:
        raise ValueError(
            f"Missing required feature columns for prediction: {missing_cols}\n"
            f"Required feature list ({len(FEATURE_COLUMNS)} columns): {FEATURE_COLUMNS}"
        )

    # 3. Select and preserve exact canonical feature column ordering
    X = df_input[FEATURE_COLUMNS].copy()

    # 4. Load model
    estimator = model if model is not None else load_model()

    # 5. Generate predictions
    raw_preds = estimator.predict(X)
    preds = np.asarray(raw_preds, dtype=float)

    # 6. Apply physical boundary clipping
    max_capacity = X["installed_capacity_mw"].values if "installed_capacity_mw" in X.columns else None
    if clip_physical_bounds:
        if max_capacity is not None:
            preds = np.clip(preds, 0.0, max_capacity)
        else:
            preds = np.maximum(0.0, preds)

    if not return_bounds:
        return preds

    # Calculate uncertainty bounds
    from app.services.uncertainty_service import UncertaintyService, apply_uncertainty_bounds

    if error_threshold_mw is None:
        u_service = UncertaintyService()
        threshold = u_service.get_threshold()
    else:
        threshold = float(error_threshold_mw)

    lower, upper = apply_uncertainty_bounds(
        expected_mw=preds,
        error_threshold_mw=threshold,
        installed_capacity_mw=max_capacity,
    )

    return preds, lower, upper


def predict_generation_with_uncertainty(
    features: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]],
    model: Optional[Any] = None,
    error_threshold_mw: Optional[float] = None,
    clip_physical_bounds: bool = True,
) -> pd.DataFrame:
    """Generate forecast predictions accompanied by physical lower and upper uncertainty bounds.

    Returns:
        pd.DataFrame with columns:
        - timestamp (if present in input, otherwise generated index)
        - expected_generation_mw
        - lower_bound_mw
        - upper_bound_mw
    """
    if isinstance(features, dict):
        df_input = pd.DataFrame([features])
    elif isinstance(features, list):
        df_input = pd.DataFrame(features)
    elif isinstance(features, pd.DataFrame):
        df_input = features.copy()
    else:
        raise TypeError(f"Unsupported features type: {type(features)}.")

    preds, lower, upper = predict_generation(
        features=df_input,
        model=model,
        clip_physical_bounds=clip_physical_bounds,
        return_bounds=True,
        error_threshold_mw=error_threshold_mw,
    )

    timestamps = (
        df_input["timestamp"].values
        if "timestamp" in df_input.columns
        else np.arange(len(preds))
    )

    return pd.DataFrame({
        "timestamp": timestamps,
        "expected_generation_mw": np.round(preds, 4),
        "lower_bound_mw": np.round(lower, 4),
        "upper_bound_mw": np.round(upper, 4),
    })
