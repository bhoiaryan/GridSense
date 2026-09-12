"""Pydantic schemas for GridPilot surplus, shortfall, and operational risk assessment."""

from enum import Enum
from typing import Any, Dict, Optional, Union
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Deterministic operational risk classifications."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SurplusStatus(str, Enum):
    """Surplus state classifications."""
    SURPLUS = "SURPLUS"
    NO_SURPLUS = "NO_SURPLUS"
    BALANCED = "BALANCED"


class ShortfallStatus(str, Enum):
    """Shortfall state classifications."""
    SHORTFALL = "SHORTFALL"
    NO_SHORTFALL = "NO_SHORTFALL"
    BALANCED = "BALANCED"


class SurplusResult(BaseModel):
    """Result of deterministic surplus evaluation."""
    status: SurplusStatus = Field(..., description="Surplus state flag")
    generation_mw: float = Field(..., ge=0.0, description="Forecast active generation in MW")
    demand_mw: float = Field(..., ge=0.0, description="Contracted demand load in MW")
    surplus_mw: float = Field(..., ge=0.0, description="Net active surplus in MW")


class ShortfallResult(BaseModel):
    """Result of deterministic shortfall evaluation."""
    status: ShortfallStatus = Field(..., description="Shortfall state flag")
    generation_mw: float = Field(..., ge=0.0, description="Forecast active generation in MW")
    demand_mw: float = Field(..., ge=0.0, description="Contracted demand load in MW")
    shortfall_mw: float = Field(..., ge=0.0, description="Net active shortfall in MW")


class BatteryContext(BaseModel):
    """Operational state of the energy storage system."""
    available: bool = Field(..., description="Whether battery is online and operational")
    soc_pct: float = Field(..., ge=0.0, le=100.0, description="Current battery State of Charge (%)")
    capacity_mwh: float = Field(..., ge=0.0, description="Total nameplate battery capacity in MWh")
    max_discharge_mw: float = Field(..., ge=0.0, description="Maximum inverter discharge rate in MW")
    usable_discharge_mw: float = Field(
        ...,
        ge=0.0,
        description="Usable discharge power available above minimum reserve limit",
    )


class BackupContext(BaseModel):
    """Operational state of auxiliary backup generation."""
    available: bool = Field(..., description="Whether backup generator is active / ready")
    capacity_mw: float = Field(..., ge=0.0, description="Available backup generation capacity in MW")


class RiskAssessment(BaseModel):
    """Comprehensive explainable risk assessment output."""
    site_id: str = Field(default="solar-01", description="Site identifier")
    timestamp: Optional[str] = Field(default=None, description="Assessment observation timestamp")
    risk_level: RiskLevel = Field(..., description="Categorical risk rating (LOW, MEDIUM, HIGH)")
    generation_mw: float = Field(..., ge=0.0, description="Forecast generation in MW")
    demand_mw: float = Field(..., ge=0.0, description="Contracted demand in MW")
    lower_bound_mw: float = Field(..., ge=0.0, description="Lower prediction bound in MW")
    upper_bound_mw: float = Field(..., ge=0.0, description="Upper prediction bound in MW")
    surplus_mw: float = Field(..., ge=0.0, description="Expected surplus in MW")
    shortfall_mw: float = Field(..., ge=0.0, description="Expected generation deficit in MW")
    uncertainty_mw: float = Field(..., ge=0.0, description="Absolute forecast uncertainty band width (MW)")
    potential_shortfall_mw: float = Field(
        ...,
        ge=0.0,
        description="Potential deficit (MW) if generation drops to lower uncertainty bound",
    )
    battery_available: bool = Field(..., description="Whether battery storage is operational")
    battery_usable_mw: float = Field(..., ge=0.0, description="Usable battery discharge capacity (MW)")
    backup_available: bool = Field(..., description="Whether backup generator is operational")
    backup_capacity_mw: float = Field(..., ge=0.0, description="Available backup generation capacity (MW)")
    reason: str = Field(..., description="Deterministic explanation justifying the assigned risk level")
