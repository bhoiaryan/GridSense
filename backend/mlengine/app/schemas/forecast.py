"""Pydantic schemas for solar generation forecast and uncertainty endpoints."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    """Represents a single-hour solar generation forecast with uncertainty bounds."""

    timestamp: Union[str, datetime] = Field(
        ...,
        description="Forecast timestamp (ISO format or YYYY-MM-DD HH:MM:SS)",
    )
    expected_generation_mw: float = Field(
        ...,
        ge=0.0,
        description="Point prediction of expected active solar power output (MW)",
    )
    lower_bound_mw: float = Field(
        ...,
        ge=0.0,
        description="Lower uncertainty bound (MW), clamped to non-negative physical limit",
    )
    upper_bound_mw: float = Field(
        ...,
        ge=0.0,
        description="Upper uncertainty bound (MW), clamped to facility capacity limit",
    )


class UncertaintyMetadata(BaseModel):
    """Metadata describing empirical uncertainty estimation parameters."""

    method: str = Field(
        default="residual_percentile",
        description="Method used to derive prediction intervals",
    )
    percentile: float = Field(
        default=90.0,
        description="Empirical residual percentile used to construct the band",
    )
    absolute_error_threshold_mw: float = Field(
        ...,
        ge=0.0,
        description="Empirical error delta (MW) derived strictly from validation residuals",
    )
    validation_samples: int = Field(
        ...,
        ge=1,
        description="Number of validation set observations used to estimate error distribution",
    )
    validation_date_range: List[str] = Field(
        ...,
        description="Start and end timestamps of the validation split",
    )
    calibrated: bool = Field(
        default=False,
        description="Indicates whether formal conformal calibration was applied",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Explanatory notes regarding empirical bounds and nighttime handling",
    )


class ForecastResult(BaseModel):
    """Container for multi-period forecast points accompanied by uncertainty metadata."""

    site_id: Optional[str] = Field(
        default="solar-01",
        description="Identifier of the target solar generation facility",
    )
    points: List[ForecastPoint] = Field(
        ...,
        description="Chronological forecast points with expected output and uncertainty intervals",
    )
    uncertainty_metadata: Optional[UncertaintyMetadata] = Field(
        default=None,
        description="Parameters of the uncertainty layer",
    )
