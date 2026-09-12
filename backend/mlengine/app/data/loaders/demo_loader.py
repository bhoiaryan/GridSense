"""Demo Data Loader for GridPilot / GridSense AI.

Loads synthetic solar plant dataset from the backend data directory:
- sites.json
- generation.csv
- weather.csv
- operations.csv
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import pandas as pd


def get_default_demo_dir() -> Path:
    """Resolve demo data directory relative to this file."""
    # This file: app/data/loaders/demo_loader.py
    # Project root: backend/mlengine/
    return Path(__file__).resolve().parent.parent.parent.parent / "data" / "demo"


class DemoDataLoader:
    """Loader class for demo datasets."""

    def __init__(self, data_dir: Optional[Union[str, Path]] = None) -> None:
        self.data_dir = Path(data_dir) if data_dir else get_default_demo_dir()

    def load_sites(self, filepath: Optional[Union[str, Path]] = None) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """Load sites configuration JSON."""
        target_path = Path(filepath) if filepath else self.data_dir / "sites.json"
        if not target_path.exists():
            raise FileNotFoundError(f"Sites configuration file not found at: {target_path}")

        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data

    def load_generation(self, filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
        """Load solar generation historical time series CSV."""
        target_path = Path(filepath) if filepath else self.data_dir / "generation.csv"
        if not target_path.exists():
            raise FileNotFoundError(f"Generation data file not found at: {target_path}")

        df = pd.read_csv(target_path)
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        return df

    def load_weather(self, filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
        """Load weather historical time series CSV."""
        target_path = Path(filepath) if filepath else self.data_dir / "weather.csv"
        if not target_path.exists():
            raise FileNotFoundError(f"Weather data file not found at: {target_path}")

        df = pd.read_csv(target_path)
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        return df

    def load_operations(self, filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
        """Load grid operations time series CSV."""
        target_path = Path(filepath) if filepath else self.data_dir / "operations.csv"
        if not target_path.exists():
            raise FileNotFoundError(f"Operations data file not found at: {target_path}")

        df = pd.read_csv(target_path)
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        if "backup_available" in df.columns:
            # Safely handle string 'True'/'False' or numeric boolean flags
            if df["backup_available"].dtype == object:
                df["backup_available"] = df["backup_available"].astype(str).str.strip().str.lower() == "true"
            else:
                df["backup_available"] = df["backup_available"].astype(bool)
        return df


# Convenient standalone functional interface
def load_sites(filepath: Optional[Union[str, Path]] = None) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """Load sites configuration JSON."""
    loader = DemoDataLoader()
    return loader.load_sites(filepath=filepath)


def load_generation(filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
    """Load generation CSV."""
    loader = DemoDataLoader()
    return loader.load_generation(filepath=filepath)


def load_weather(filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
    """Load weather CSV."""
    loader = DemoDataLoader()
    return loader.load_weather(filepath=filepath)


def load_operations(filepath: Optional[Union[str, Path]] = None) -> pd.DataFrame:
    """Load operations CSV."""
    loader = DemoDataLoader()
    return loader.load_operations(filepath=filepath)
