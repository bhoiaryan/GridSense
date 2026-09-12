"""Model manager for persisting, locating, and loading trained ML models.

Avoids repeated disk I/O through in-memory caching and provides robust error
handling when artifacts are missing.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
# pyrefly: ignore [missing-import]
import joblib


# In-memory cache for loaded model
_CACHED_MODEL: Optional[Any] = None
_CACHED_MODEL_PATH: Optional[Path] = None


def get_default_models_dir() -> Path:
    """Resolve the default directory for saved models (backend/mlengine/models/xgboost)."""
    # This file is in: backend/mlengine/app/ml/model_manager.py
    # Project root: backend/mlengine/
    return Path(__file__).resolve().parent.parent.parent / "models" / "xgboost"


def get_default_model_path() -> Path:
    """Resolve default model joblib artifact path."""
    return get_default_models_dir() / "solar_forecast_v1.joblib"


def get_default_metadata_path() -> Path:
    """Resolve default model metadata JSON path."""
    return get_default_models_dir() / "solar_forecast_v1_metadata.json"


def save_model(
    model: Any,
    metadata: Dict[str, Any],
    model_path: Optional[Union[str, Path]] = None,
    metadata_path: Optional[Union[str, Path]] = None,
) -> Tuple[Path, Path]:
    """Persist trained model artifact and its accompanying metadata.

    Args:
        model: Trained estimator (e.g. XGBRegressor).
        metadata: Dictionary containing parameters, metrics, column lists, etc.
        model_path: Optional custom path for the .joblib file.
        metadata_path: Optional custom path for the .json metadata file.

    Returns:
        Tuple of (model_path, metadata_path).
    """
    global _CACHED_MODEL, _CACHED_MODEL_PATH

    m_path = Path(model_path) if model_path else get_default_model_path()
    meta_path = Path(metadata_path) if metadata_path else get_default_metadata_path()

    m_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.parent.mkdir(parents=True, exist_ok=True)

    # Save model artifact
    joblib.dump(model, m_path)

    # Save metadata JSON
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Update cache
    _CACHED_MODEL = model
    _CACHED_MODEL_PATH = m_path

    return m_path, meta_path


def load_model(
    model_path: Optional[Union[str, Path]] = None,
    use_cache: bool = True,
) -> Any:
    """Load the trained model artifact from disk or cache.

    Args:
        model_path: Path to the .joblib artifact. Defaults to standard location.
        use_cache: If True, reuse in-memory model if already loaded from the same path.

    Returns:
        The loaded estimator object.

    Raises:
        FileNotFoundError: If the model artifact has not been trained or saved yet.
    """
    global _CACHED_MODEL, _CACHED_MODEL_PATH

    target_path = Path(model_path) if model_path else get_default_model_path()

    if use_cache and _CACHED_MODEL is not None and _CACHED_MODEL_PATH == target_path:
        return _CACHED_MODEL

    if not target_path.exists():
        raise FileNotFoundError(
            f"Trained model not found at: {target_path}\n"
            "Please train the model first by running:\n"
            "    python -m app.ml.train"
        )

    model = joblib.load(target_path)

    if use_cache:
        _CACHED_MODEL = model
        _CACHED_MODEL_PATH = target_path

    return model


def load_metadata(
    metadata_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Load model metadata JSON.

    Args:
        metadata_path: Path to the .json metadata file.

    Returns:
        Dictionary with model metadata.

    Raises:
        FileNotFoundError: If the metadata file does not exist.
    """
    target_path = Path(metadata_path) if metadata_path else get_default_metadata_path()

    if not target_path.exists():
        raise FileNotFoundError(f"Model metadata not found at: {target_path}")

    with open(target_path, "r", encoding="utf-8") as f:
        return json.load(f)


def clear_cache() -> None:
    """Clear cached model from memory."""
    global _CACHED_MODEL, _CACHED_MODEL_PATH
    _CACHED_MODEL = None
    _CACHED_MODEL_PATH = None
