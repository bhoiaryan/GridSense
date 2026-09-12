"""Data Validator for GridPilot / GridSense AI.

Validates schemas, types, ranges, timestamps, and physical consistency for:
- Sites
- Generation
- Weather
- Operations
- Cross-dataset timestamp alignment
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd


@dataclass
class ValidationResult:
    """Standardized validation outcome container."""

    dataset_name: str
    valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    row_count: int = 0
    columns: List[str] = field(default_factory=list)

    def add_error(self, message: str) -> None:
        self.valid = False
        self.errors.append(message)

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dataset_name": self.dataset_name,
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "row_count": self.row_count,
            "columns": self.columns,
        }


class DataValidationError(Exception):
    """Exception raised when dataset validation fails."""

    def __init__(self, message: str, result: Optional[ValidationResult] = None) -> None:
        super().__init__(message)
        self.result = result


def _check_required_columns(
    df: pd.DataFrame, required_cols: List[str], result: ValidationResult
) -> bool:
    """Verify that all required columns are present in DataFrame."""
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        result.add_error(f"Missing required columns: {missing}")
        return False
    return True


def _check_timestamps(
    df: pd.DataFrame, result: ValidationResult, duplicate_subset: Optional[List[str]] = None
) -> Optional[pd.Series]:
    """Validate timestamp parsing, monotonicity, and duplicates."""
    if "timestamp" not in df.columns:
        return None

    # Parse timestamps
    ts_series = pd.to_datetime(df["timestamp"], errors="coerce")
    null_ts = ts_series.isnull().sum()
    if null_ts > 0:
        result.add_error(f"Found {null_ts} unparseable/invalid timestamp values.")
        return None

    # Monotonicity / chronological order
    if not ts_series.is_monotonic_increasing:
        result.add_error("Timestamps are not strictly chronological (monotonic increasing).")

    # Check duplicates
    dup_cols = duplicate_subset if duplicate_subset else ["timestamp"]
    duplicates = df.duplicated(subset=dup_cols).sum()
    if duplicates > 0:
        result.add_error(f"Found {duplicates} duplicate records on {dup_cols}.")

    return ts_series


def validate_sites(
    sites_data: Union[Dict[str, Any], List[Dict[str, Any]]]
) -> ValidationResult:
    """Validate sites configuration JSON."""
    result = ValidationResult(dataset_name="sites")
    required_keys = ["id", "name", "location", "technology", "capacity_mw"]
    result.columns = required_keys

    # Normalize single site dict to a list of sites
    sites_list = [sites_data] if isinstance(sites_data, dict) else sites_data
    result.row_count = len(sites_list)

    if not sites_list:
        result.add_error("Sites data is empty.")
        return result

    seen_ids = set()
    for idx, site in enumerate(sites_list):
        if not isinstance(site, dict):
            result.add_error(f"Site entry at index {idx} is not a valid dictionary.")
            continue

        # Check required keys
        for key in required_keys:
            if key not in site or site[key] is None or site[key] == "":
                result.add_error(f"Site at index {idx} missing required key or has empty value for '{key}'.")

        # Check site id uniqueness
        site_id = site.get("id")
        if site_id:
            if site_id in seen_ids:
                result.add_error(f"Duplicate site id detected: '{site_id}'.")
            seen_ids.add(site_id)

        # Check capacity
        cap = site.get("capacity_mw")
        if cap is not None:
            if not isinstance(cap, (int, float)) or isinstance(cap, bool):
                result.add_error(f"Site '{site_id}' capacity_mw must be numeric.")
            elif cap <= 0:
                result.add_error(f"Site '{site_id}' capacity_mw must be positive (got {cap}).")

    return result


def validate_generation(
    df: pd.DataFrame, site_capacity_mw: Optional[float] = 100.0
) -> ValidationResult:
    """Validate generation time series data."""
    result = ValidationResult(dataset_name="generation", row_count=len(df), columns=list(df.columns))
    required_cols = ["timestamp", "site_id", "generation_mw"]

    if not _check_required_columns(df, required_cols, result):
        return result

    # Timestamp checks
    _check_timestamps(df, result, duplicate_subset=["timestamp", "site_id"])

    # Check site_id is not missing or empty
    missing_site_ids = df["site_id"].isnull().sum() + (df["site_id"].astype(str).str.strip() == "").sum()
    if missing_site_ids > 0:
        result.add_error(f"Found {missing_site_ids} missing or empty site_id entries.")

    # Generation numeric and range checks
    gen_series = pd.to_numeric(df["generation_mw"], errors="coerce")
    null_gen = gen_series.isnull().sum()
    if null_gen > 0:
        result.add_error(f"Found {null_gen} non-numeric or missing generation_mw values.")
    else:
        # Negative generation check
        neg_count = (gen_series < 0.0).sum()
        if neg_count > 0:
            result.add_error(f"Found {neg_count} negative generation_mw values (min: {gen_series.min()}).")

        # Capacity ceiling check
        if site_capacity_mw is not None and site_capacity_mw > 0:
            over_cap = (gen_series > site_capacity_mw).sum()
            if over_cap > 0:
                result.add_error(
                    f"Found {over_cap} generation values exceeding installed capacity {site_capacity_mw} MW (max: {gen_series.max()})."
                )

    return result


def validate_weather(df: pd.DataFrame) -> ValidationResult:
    """Validate weather time series data."""
    result = ValidationResult(dataset_name="weather", row_count=len(df), columns=list(df.columns))
    required_cols = ["timestamp", "cloud_cover", "temperature", "irradiance"]

    if not _check_required_columns(df, required_cols, result):
        return result

    # Timestamp checks
    _check_timestamps(df, result)

    # Check for missing values in any required column
    nulls = df[required_cols].isnull().sum()
    if nulls.any():
        missing_dict = nulls[nulls > 0].to_dict()
        result.add_error(f"Missing values detected: {missing_dict}")

    # Cloud cover: numeric, range [0, 100]
    cloud = pd.to_numeric(df["cloud_cover"], errors="coerce")
    if cloud.isnull().any():
        result.add_error("Non-numeric cloud_cover values detected.")
    else:
        if (cloud < 0.0).any() or (cloud > 100.0).any():
            result.add_error(f"cloud_cover values out of bounds [0, 100] (min: {cloud.min()}, max: {cloud.max()}).")

    # Irradiance: numeric, non-negative
    irr = pd.to_numeric(df["irradiance"], errors="coerce")
    if irr.isnull().any():
        result.add_error("Non-numeric irradiance values detected.")
    else:
        if (irr < 0.0).any():
            result.add_error(f"Negative irradiance values detected (min: {irr.min()}).")

    # Temperature: numeric
    temp = pd.to_numeric(df["temperature"], errors="coerce")
    if temp.isnull().any():
        result.add_error("Non-numeric temperature values detected.")

    return result


def validate_operations(df: pd.DataFrame) -> ValidationResult:
    """Validate grid operations and battery telemetry data."""
    result = ValidationResult(dataset_name="operations", row_count=len(df), columns=list(df.columns))
    required_cols = [
        "timestamp",
        "demand_mw",
        "battery_soc",
        "battery_capacity_mwh",
        "battery_max_discharge_mw",
        "backup_available",
        "backup_capacity_mw",
    ]

    if not _check_required_columns(df, required_cols, result):
        return result

    # Timestamp checks
    _check_timestamps(df, result)

    # Missing values check
    nulls = df[required_cols].isnull().sum()
    if nulls.any():
        missing_dict = nulls[nulls > 0].to_dict()
        result.add_error(f"Missing values detected: {missing_dict}")

    # demand_mw: non-negative
    demand = pd.to_numeric(df["demand_mw"], errors="coerce")
    if demand.isnull().any():
        result.add_error("Non-numeric demand_mw values detected.")
    elif (demand < 0.0).any():
        result.add_error(f"Negative demand_mw values detected (min: {demand.min()}).")

    # battery_soc: [0, 100]
    soc = pd.to_numeric(df["battery_soc"], errors="coerce")
    if soc.isnull().any():
        result.add_error("Non-numeric battery_soc values detected.")
    elif (soc < 0.0).any() or (soc > 100.0).any():
        result.add_error(f"battery_soc values out of bounds [0, 100] (min: {soc.min()}, max: {soc.max()}).")

    # battery_capacity_mwh: non-negative
    bat_cap = pd.to_numeric(df["battery_capacity_mwh"], errors="coerce")
    if bat_cap.isnull().any():
        result.add_error("Non-numeric battery_capacity_mwh values detected.")
    elif (bat_cap < 0.0).any():
        result.add_error(f"Negative battery_capacity_mwh detected (min: {bat_cap.min()}).")

    # battery_max_discharge_mw: non-negative
    bat_dis = pd.to_numeric(df["battery_max_discharge_mw"], errors="coerce")
    if bat_dis.isnull().any():
        result.add_error("Non-numeric battery_max_discharge_mw values detected.")
    elif (bat_dis < 0.0).any():
        result.add_error(f"Negative battery_max_discharge_mw detected (min: {bat_dis.min()}).")

    # backup_available: boolean or interpretable as boolean
    raw_backup = df["backup_available"]
    if not (
        raw_backup.dtype == bool
        or raw_backup.isin([True, False, 1, 0, "True", "False", "true", "false"]).all()
    ):
        result.add_error("backup_available contains non-boolean values.")

    # backup_capacity_mw: non-negative
    backup_cap = pd.to_numeric(df["backup_capacity_mw"], errors="coerce")
    if backup_cap.isnull().any():
        result.add_error("Non-numeric backup_capacity_mw values detected.")
    elif (backup_cap < 0.0).any():
        result.add_error(f"Negative backup_capacity_mw detected (min: {backup_cap.min()}).")

    return result


def validate_alignment(
    generation_df: pd.DataFrame, weather_df: pd.DataFrame, operations_df: pd.DataFrame
) -> ValidationResult:
    """Validate chronological and timestamp alignment across generation, weather, and operations."""
    result = ValidationResult(dataset_name="alignment")

    # Check row counts
    len_g = len(generation_df)
    len_w = len(weather_df)
    len_o = len(operations_df)

    if not (len_g == len_w == len_o):
        result.add_error(
            f"Row count mismatch across datasets: generation={len_g}, weather={len_w}, operations={len_o}"
        )
        return result

    result.row_count = len_g

    # Convert timestamps to standardized datetime series for comparison
    ts_g = pd.to_datetime(generation_df["timestamp"], errors="coerce")
    ts_w = pd.to_datetime(weather_df["timestamp"], errors="coerce")
    ts_o = pd.to_datetime(operations_df["timestamp"], errors="coerce")

    # Compare generation vs weather
    gw_diff = (ts_g != ts_w).sum()
    if gw_diff > 0:
        result.add_error(f"Found {gw_diff} misaligned timestamps between generation and weather.")

    # Compare generation vs operations
    go_diff = (ts_g != ts_o).sum()
    if go_diff > 0:
        result.add_error(f"Found {go_diff} misaligned timestamps between generation and operations.")

    return result
