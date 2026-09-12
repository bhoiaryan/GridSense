"""Pydantic schemas for GridPilot What-If / Scenario Simulation (Phase 9)."""

from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator

from app.schemas.decision import DecisionAction
from app.schemas.risk import RiskLevel


class ScenarioRequest(BaseModel):
    """Input parameters for what-if scenario evaluation."""
    site_id: str = Field(default="solar-01", description="Registered plant facility identifier")
    timestamp: Optional[str] = Field(
        default=None,
        description="Starting observation timestamp (e.g. '2025-01-02 12:00:00')",
    )
    hour_index: int = Field(default=0, ge=0, description="Starting hour index if timestamp omitted")
    hours: int = Field(default=1, ge=1, le=72, description="Simulation forecast horizon in hours (1 to 72)")
    cloud_cover_adjustment: float = Field(
        default=0.0,
        ge=-100.0,
        le=100.0,
        description="Cloud cover percentage point adjustment (-100 to +100)",
    )
    demand_adjustment_percent: float = Field(
        default=0.0,
        ge=-100.0,
        le=500.0,
        description="Demand percentage shift (-100% to +500%; cannot result in negative demand)",
    )
    battery_available: Optional[bool] = Field(
        default=None,
        description="Override for battery storage availability (None preserves baseline status)",
    )
    backup_available: Optional[bool] = Field(
        default=None,
        description="Override for auxiliary backup generator availability (None preserves baseline status)",
    )

    @field_validator("demand_adjustment_percent")
    @classmethod
    def validate_demand_adjustment(cls, v: float) -> float:
        if v < -100.0:
            raise ValueError("Demand adjustment cannot be below -100% (would produce negative demand).")
        return v


class ScenarioState(BaseModel):
    """Calculated operational conditions for an evaluated scenario state."""
    timestamp: Optional[str] = Field(default=None, description="Observation timestamp")
    generation_mw: float = Field(..., ge=0.0, description="Forecast active generation in MW")
    lower_bound_mw: float = Field(..., ge=0.0, description="Lower prediction bound in MW")
    upper_bound_mw: float = Field(..., ge=0.0, description="Upper prediction bound in MW")
    demand_mw: float = Field(..., ge=0.0, description="Contracted demand load in MW")
    surplus_mw: float = Field(default=0.0, ge=0.0, description="Generation surplus in MW")
    shortfall_mw: float = Field(default=0.0, ge=0.0, description="Generation deficit in MW")
    battery_available: bool = Field(..., description="Battery storage availability flag")
    backup_available: bool = Field(..., description="Auxiliary backup generator availability flag")
    risk_level: RiskLevel = Field(..., description="Categorical operational risk classification")
    action: DecisionAction = Field(..., description="Recommended primary operational dispatch action")
    reason: str = Field(..., description="Deterministic justification explaining the dispatch action")
    impact: str = Field(..., description="Expected system impact of the recommended action")


class ScenarioComparison(BaseModel):
    """Comparative variance between baseline and scenario operational conditions."""
    generation_delta_mw: float = Field(..., description="Scenario generation minus baseline generation in MW")
    demand_delta_mw: float = Field(..., description="Scenario demand minus baseline demand in MW")
    surplus_delta_mw: float = Field(..., description="Scenario surplus minus baseline surplus in MW")
    shortfall_delta_mw: float = Field(..., description="Scenario shortfall minus baseline shortfall in MW")
    risk_changed: bool = Field(..., description="Whether risk level changed between baseline and scenario")
    decision_changed: bool = Field(..., description="Whether recommended action changed")
    generation_percent_change: Optional[float] = Field(
        default=None,
        description="Percentage change in solar generation, or None if baseline was 0.0 MW",
    )
    shortfall_percent_change: Optional[float] = Field(
        default=None,
        description="Percentage change in shortfall, or None if baseline shortfall was 0.0 MW",
    )


class ScenarioResult(BaseModel):
    """Structured response containing baseline, scenario, and comparative evaluation."""
    site_id: str = Field(..., description="Plant facility identifier")
    hours: int = Field(default=1, description="Evaluated forecast horizon in hours")
    baseline: ScenarioState = Field(..., description="Evaluated baseline operational condition")
    scenario: ScenarioState = Field(..., description="Evaluated scenario operational condition")
    comparison: ScenarioComparison = Field(..., description="Deltas and comparative variance analysis")
    timeline_baseline: Optional[List[ScenarioState]] = Field(
        default=None,
        description="Full hourly timeline for baseline if hours > 1",
    )
    timeline_scenario: Optional[List[ScenarioState]] = Field(
        default=None,
        description="Full hourly timeline for scenario if hours > 1",
    )
