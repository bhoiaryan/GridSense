"""Evaluation metrics for solar generation forecasting.

Calculates standard regression metrics:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Mean Absolute Percentage Error (MAPE) with zero-generation handling

Solar Data Detail:
------------------
Solar generation is zero or near zero at night and during transitions.
Unconditioned MAPE dividing by zero produces undefined or astronomically
skewed percentage errors. We calculate MAPE specifically on active generation
hours (actual generation >= threshold_mw) and clearly report the limitation.
"""

from typing import Any, Dict, Optional, Union
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
from sklearn.metrics import mean_absolute_error, mean_squared_error


def evaluate_predictions(
    y_true: Union[pd.Series, np.ndarray],
    y_pred: Union[pd.Series, np.ndarray],
    mape_threshold_mw: float = 1.0,
) -> Dict[str, Any]:
    """Calculate regression metrics comparing actual vs predicted generation.

    Args:
        y_true: True solar generation values in MW.
        y_pred: Predicted solar generation values in MW.
        mape_threshold_mw: Minimum actual generation (MW) required to evaluate MAPE.
                          Prevents division-by-zero on nighttime and near-zero values.

    Returns:
        Dict containing sample count, MAE, RMSE, MAPE, and zero-handling notes.
    """
    y_t = np.asarray(y_true, dtype=float)
    y_p = np.asarray(y_pred, dtype=float)

    if len(y_t) != len(y_p):
        raise ValueError(
            f"Length mismatch: y_true has {len(y_t)} samples, y_pred has {len(y_p)} samples."
        )

    if len(y_t) == 0:
        raise ValueError("Cannot evaluate empty predictions array.")

    # 1. Mean Absolute Error (MAE)
    mae = float(mean_absolute_error(y_t, y_p))

    # 2. Root Mean Squared Error (RMSE)
    mse = float(mean_squared_error(y_t, y_p))
    rmse = float(np.sqrt(mse))

    # 3. Mean Absolute Percentage Error (MAPE)
    # Filter for active daytime generation where actual >= threshold
    active_mask = y_t >= mape_threshold_mw
    active_count = int(np.sum(active_mask))

    if active_count > 0:
        actual_active = y_t[active_mask]
        pred_active = y_p[active_mask]
        mape = float(np.mean(np.abs((actual_active - pred_active) / actual_active)) * 100.0)
    else:
        mape = None

    return {
        "sample_count": len(y_t),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape": round(mape, 2) if mape is not None else None,
        "mape_threshold_mw": mape_threshold_mw,
        "mape_sample_count": active_count,
        "mape_limitation_note": (
            f"MAPE calculated only on active generation >= {mape_threshold_mw} MW "
            f"({active_count}/{len(y_t)} samples) to avoid division-by-zero on nighttime zeroes."
        ),
    }
