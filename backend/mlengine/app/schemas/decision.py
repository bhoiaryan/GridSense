"""Pydantic schemas for GridPilot operational decisions and recommendations."""

from enum import Enum
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.schemas.risk import RiskLevel


class DecisionAction(str, Enum):
    """Supported deterministic dispatch actions."""
    CHARGE_STORAGE = "CHARGE_STORAGE"
    DISCHARGE_STORAGE = "DISCHARGE_STORAGE"
    IMPORT_ENERGY = "IMPORT_ENERGY"
    EXPORT_ENERGY = "EXPORT_ENERGY"
    ACTIVATE_BACKUP = "ACTIVATE_BACKUP"
    CURTAIL_GENERATION = "CURTAIL_GENERATION"
    NO_ACTION = "NO_ACTION"


class OperationalDecision(BaseModel):
    """Comprehensive structured decision and recommendation schema."""
    site_id: str = Field(default="solar-01", description="Site identifier")
    timestamp: Optional[str] = Field(default=None, description="Assessment observation timestamp")
    action: DecisionAction = Field(..., description="Recommended primary operational dispatch action")
    amount_mw: float = Field(default=0.0, ge=0.0, description="Recommended dispatch power quantity in MW")
    generation_mw: float = Field(..., ge=0.0, description="Forecast active generation in MW")
    demand_mw: float = Field(..., ge=0.0, description="Contracted demand load in MW")
    lower_bound_mw: float = Field(..., ge=0.0, description="Lower prediction bound in MW")
    upper_bound_mw: float = Field(..., ge=0.0, description="Upper prediction bound in MW")
    surplus_mw: float = Field(default=0.0, ge=0.0, description="Calculated generation surplus in MW")
    shortfall_mw: float = Field(default=0.0, ge=0.0, description="Calculated generation shortfall in MW")
    remaining_shortfall_mw: float = Field(
        default=0.0,
        ge=0.0,
        description="Unmitigated generation shortfall remaining after primary action in MW",
    )
    remaining_surplus_mw: float = Field(
        default=0.0,
        ge=0.0,
        description="Unabsorbed generation surplus remaining after primary action in MW",
    )
    risk_level: RiskLevel = Field(..., description="Categorical risk assessment level (LOW, MEDIUM, HIGH)")
    reason: str = Field(..., description="Transparent, deterministic justification explaining the action")
    impact: str = Field(..., description="Expected operational outcome and system impact of the action")


# Type alias for consistency across codebase
DecisionResult = OperationalDecision
RecommendationResult = OperationalDecision
