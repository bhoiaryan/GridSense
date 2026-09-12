"""Training pipeline for XGBoost solar power generation forecasting model.

Loads Phase 4 engineered features, performs chronological time-aware splitting,
trains an XGBRegressor, calculates test set metrics, fits empirical validation uncertainty,
evaluates test coverage, and persists all artifacts.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
from xgboost import XGBRegressor

from app.ml.evaluate import evaluate_predictions
from app.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    build_features,
    get_default_processed_dir,
    get_feature_target_split,
    load_processed_features,
)
from app.ml.model_manager import (
    get_default_model_path,
    get_default_metadata_path,
    save_model,
)
from app.ml.predict import predict_generation



def split_data_chronological(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Perform strictly chronological time-aware train/validation/test split.

    NO shuffling is performed to guarantee future data never leaks into training.

    Args:
        df: Chronologically sorted feature DataFrame.
        train_ratio: Proportion of observations for training (default: 0.70).
        val_ratio: Proportion of observations for validation (default: 0.15).

    Returns:
        Tuple of (train_df, val_df, test_df).
    """
    n = len(df)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end].copy().reset_index(drop=True)
    val_df = df.iloc[train_end:val_end].copy().reset_index(drop=True)
    test_df = df.iloc[val_end:].copy().reset_index(drop=True)

    return train_df, val_df, test_df


def train_model(
    features_path: Optional[Union[str, Path]] = None,
    save_artifacts: bool = True,
    verbose: bool = True,
    uncertainty_percentile: float = 90.0,
) -> Dict[str, Any]:
    """Execute complete end-to-end model training, evaluation, uncertainty fitting, and serialization.

    Args:
        features_path: Optional path to processed solar_features.csv.
        save_artifacts: Whether to save model .joblib and metadata .json to disk.
        verbose: Whether to print training summary to stdout.
        uncertainty_percentile: Empirical percentile on validation residuals (default: 90.0).

    Returns:
        Dict containing the trained model, metrics, uncertainty diagnostics, and artifact paths.
    """
    # 1. Load feature dataset
    df = load_processed_features(filepath=features_path)

    # Validate essential columns
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            raise KeyError(f"Required feature column '{col}' missing from feature dataset.")
    if TARGET_COLUMN not in df.columns:
        raise KeyError(f"Target column '{TARGET_COLUMN}' missing from feature dataset.")

    # 2. Chronological splitting
    train_df, val_df, test_df = split_data_chronological(df, train_ratio=0.70, val_ratio=0.15)

    train_range = (str(train_df["timestamp"].min()), str(train_df["timestamp"].max()))
    val_range = (str(val_df["timestamp"].min()), str(val_df["timestamp"].max()))
    test_range = (str(test_df["timestamp"].min()), str(test_df["timestamp"].max()))

    if verbose:
        print("=" * 60)
        print("GRIDPILOT XGBOOST SOLAR FORECAST & UNCERTAINTY TRAINING")
        print("=" * 60)
        print(f"Total observations: {len(df)}")
        print(f"Training set:   {len(train_df):5d} rows ({train_range[0]} -> {train_range[1]})")
        print(f"Validation set: {len(val_df):5d} rows ({val_range[0]} -> {val_range[1]})")
        print(f"Test set:       {len(test_df):5d} rows ({test_range[0]} -> {test_range[1]})")
        print("-" * 60)

    # 3. Separate input features (X) and target (y)
    X_train, y_train = get_feature_target_split(train_df)
    X_val, y_val = get_feature_target_split(val_df)
    X_test, y_test = get_feature_target_split(test_df)

    # 4. Configure XGBoost Regressor with lightweight, robust parameters
    xgb_params = {
        "n_estimators": 120,
        "max_depth": 5,
        "learning_rate": 0.08,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "objective": "reg:squarederror",
        "random_state": 42,
        "n_jobs": -1,
    }
    model = XGBRegressor(**xgb_params)

    # 5. Fit model with validation evaluation monitoring
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # 6. Fit empirical uncertainty band strictly on VALIDATION residuals
    from app.services.uncertainty_service import (
        UncertaintyService,
        apply_uncertainty_bounds,
        evaluate_uncertainty_coverage,
    )

    u_service = UncertaintyService()

    uncertainty_metadata = u_service.fit_and_save_validation_uncertainty(
        model=model,
        val_df=val_df,
        percentile=uncertainty_percentile,
    )
    error_threshold = float(uncertainty_metadata["absolute_error_threshold_mw"])

    # 7. Evaluate point predictions on held-out TEST set
    y_test_pred = predict_generation(X_test, model=model)
    test_metrics = evaluate_predictions(y_test, y_test_pred)

    # 8. Evaluate uncertainty coverage on held-out TEST set
    test_capacity = X_test["installed_capacity_mw"].values if "installed_capacity_mw" in X_test.columns else None
    lower_test, upper_test = apply_uncertainty_bounds(
        expected_mw=y_test_pred,
        error_threshold_mw=error_threshold,
        installed_capacity_mw=test_capacity,
    )
    uncertainty_eval = evaluate_uncertainty_coverage(
        y_true=y_test.values,
        lower_bound=lower_test,
        upper_bound=upper_test,
    )

    if verbose:
        print("POINT FORECAST EVALUATION ON HELD-OUT TEST SET:")
        print(f"  Test Samples: {test_metrics['sample_count']}")
        print(f"  MAE:          {test_metrics['mae']:.4f} MW")
        print(f"  RMSE:         {test_metrics['rmse']:.4f} MW")
        if test_metrics["mape"] is not None:
            print(f"  Daytime MAPE: {test_metrics['mape']:.2f}% (on active gen >= {test_metrics['mape_threshold_mw']} MW)")
        print(f"  Note:         {test_metrics['mape_limitation_note']}")
        print("-" * 60)
        print("UNCERTAINTY BAND EVALUATION ON HELD-OUT TEST SET:")
        print(f"  Method:               {uncertainty_metadata['method']} (Percentile: {uncertainty_metadata['percentile']}%)")
        print(f"  Val Error Threshold:  {error_threshold:.4f} MW (derived from {uncertainty_metadata['validation_samples']} validation samples)")
        print(f"  Test Coverage:        {uncertainty_eval['coverage_percentage']:.2f}% ({uncertainty_eval['covered_samples']}/{uncertainty_eval['sample_count']})")
        print(f"  Avg Interval Width:   {uncertainty_eval['average_interval_width_mw']:.4f} MW")
        print("-" * 60)

    # 9. Construct model metadata
    metadata = {
        "model_name": "solar_forecast_v1",
        "algorithm": "XGBRegressor",
        "target_column": TARGET_COLUMN,
        "feature_columns": FEATURE_COLUMNS,
        "split_ratios": {"train": 0.70, "validation": 0.15, "test": 0.15},
        "row_counts": {
            "total": len(df),
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
        },
        "date_ranges": {
            "train": list(train_range),
            "validation": list(val_range),
            "test": list(test_range),
        },
        "test_metrics": test_metrics,
        "uncertainty_evaluation": uncertainty_eval,
        "hyperparameters": xgb_params,
    }

    # 10. Save artifacts
    model_path = None
    meta_path = None
    if save_artifacts:
        model_path, meta_path = save_model(model, metadata)
        if verbose:
            print(f"Saved model artifact:       {model_path}")
            print(f"Saved model metadata JSON:  {meta_path}")
            print(f"Saved uncertainty metadata: {u_service.metadata_path}")
            print("=" * 60)

    return {
        "model": model,
        "metrics": test_metrics,
        "uncertainty_metadata": uncertainty_metadata,
        "uncertainty_evaluation": uncertainty_eval,
        "metadata": metadata,
        "model_path": model_path,
        "metadata_path": meta_path,
        "uncertainty_path": u_service.metadata_path,
        "splits": {
            "train": train_df,
            "validation": val_df,
            "test": test_df,
        },
    }


if __name__ == "__main__":
    train_model()
