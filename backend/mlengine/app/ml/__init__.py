"""Machine Learning package for GridPilot."""

from app.ml.evaluate import evaluate_predictions
from app.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    build_features,
    get_feature_target_split,
    save_features,
)
from app.ml.model_manager import (
    clear_cache,
    get_default_metadata_path,
    get_default_model_path,
    get_default_models_dir,
    load_metadata,
    load_model,
    save_model,
)
from app.ml.predict import predict_generation, predict_generation_with_uncertainty

__all__ = [
    "FEATURE_COLUMNS",
    "TARGET_COLUMN",
    "build_features",
    "get_feature_target_split",
    "save_features",
    "evaluate_predictions",
    "predict_generation",
    "predict_generation_with_uncertainty",
    "load_model",
    "load_metadata",
    "save_model",
    "clear_cache",
    "get_default_models_dir",
    "get_default_model_path",
    "get_default_metadata_path",
]
