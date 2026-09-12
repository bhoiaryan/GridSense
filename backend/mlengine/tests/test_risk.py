"""Unit tests for GridPilot operational risk engine and service.

Covers:
- Case A: Generation comfortably meets demand (LOW risk)
- Case B: Generation meets demand but lower bound drops below (MEDIUM risk)
- Case C: Generation below demand, large shortfall, no reserves (HIGH risk)
- Case D: Generation below demand, battery available to cover (MEDIUM risk)
- Case E: Generation below demand, backup available to cover (MEDIUM risk)
- Edge cases: Zero generation, zero demand, battery SOC extremes, unavailable reserves
- Service & API integration tests
"""

# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]


from app.engines.risk_engine import assess_risk, evaluate_battery_usable_power
from app.main import app
from app.schemas.risk import RiskAssessment, RiskLevel
from app.services.risk_service import RiskService


# --- Case A to E Deterministic Tests ---

def test_case_a_comfortable_generation():
    """Case A: Generation comfortably meets demand with low uncertainty -> LOW risk."""
    assessment = assess_risk(
        generation_mw=85.0,
        demand_mw=50.0,
        lower_bound_mw=75.0,   # Lower bound is 75 MW, well above 50 MW demand
        upper_bound_mw=90.0,
        battery_available=True,
        battery_soc=60.0,
        backup_available=True,
        backup_capacity_mw=25.0,
    )

    assert assessment.risk_level == RiskLevel.LOW
    assert assessment.surplus_mw == 35.0
    assert assessment.shortfall_mw == 0.0
    assert assessment.potential_shortfall_mw == 0.0
    assert "LOW risk" in assessment.reason


def test_case_b_uncertainty_shortfall():
    """Case B: Expected generation meets demand, but lower bound drops below demand -> MEDIUM risk."""
    assessment = assess_risk(
        generation_mw=65.0,
        demand_mw=60.0,
        lower_bound_mw=52.0,   # Lower bound drops to 52 MW (potential 8 MW deficit)
        upper_bound_mw=70.0,
        battery_available=True,
        battery_soc=40.0,
        backup_available=True,
        backup_capacity_mw=25.0,
    )

    assert assessment.risk_level == RiskLevel.MEDIUM
    assert assessment.surplus_mw == 5.0
    assert assessment.shortfall_mw == 0.0
    assert assessment.potential_shortfall_mw == 8.0
    assert "MEDIUM risk" in assessment.reason
    assert "lower forecast bound indicates" in assessment.reason


def test_case_c_unmitigated_shortfall():
    """Case C: Generation below demand, large shortfall, NO battery, NO backup -> HIGH risk."""
    assessment = assess_risk(
        generation_mw=20.0,
        demand_mw=60.0,
        lower_bound_mw=15.0,
        upper_bound_mw=25.0,
        battery_available=False,
        battery_soc=0.0,
        backup_available=False,
        backup_capacity_mw=0.0,
    )

    assert assessment.risk_level == RiskLevel.HIGH
    assert assessment.shortfall_mw == 40.0
    assert assessment.battery_usable_mw == 0.0
    assert assessment.backup_capacity_mw == 0.0
    assert "HIGH risk" in assessment.reason
    assert "unmitigated shortfall" in assessment.reason


def test_case_d_shortfall_buffered_by_battery():
    """Case D: Generation below demand, but battery is available to cover deficit -> MEDIUM risk."""
    assessment = assess_risk(
        generation_mw=40.0,
        demand_mw=60.0,        # 20 MW deficit
        lower_bound_mw=35.0,
        upper_bound_mw=45.0,
        battery_available=True,
        battery_soc=70.0,      # 70% SOC -> ~112 MWh usable, capped at 50 MW max discharge
        battery_capacity_mwh=200.0,
        battery_max_discharge_mw=50.0,
        backup_available=False,
        backup_capacity_mw=0.0,
    )

    assert assessment.risk_level == RiskLevel.MEDIUM
    assert assessment.shortfall_mw == 20.0
    assert assessment.battery_usable_mw >= 20.0
    assert "battery storage" in assessment.reason


def test_case_e_shortfall_buffered_by_backup():
    """Case E: Generation below demand, no battery, but backup covers deficit -> MEDIUM risk."""
    assessment = assess_risk(
        generation_mw=45.0,
        demand_mw=60.0,        # 15 MW deficit
        lower_bound_mw=40.0,
        upper_bound_mw=50.0,
        battery_available=False,
        battery_soc=5.0,       # Below 10% reserve -> unusable
        backup_available=True,
        backup_capacity_mw=25.0,  # 25 MW backup covers 15 MW deficit
    )

    assert assessment.risk_level == RiskLevel.MEDIUM
    assert assessment.shortfall_mw == 15.0
    assert assessment.backup_capacity_mw == 25.0
    assert "auxiliary backup" in assessment.reason


# --- Edge Cases & Stress Tests ---

def test_zero_generation_night_unmitigated():
    """Nighttime (0 MW) with demand exceeding reserves -> HIGH risk."""
    assessment = assess_risk(
        generation_mw=0.0,
        demand_mw=70.0,
        lower_bound_mw=0.0,
        upper_bound_mw=0.5,
        battery_available=True,
        battery_soc=15.0,      # Only ~9.4 MWh usable
        battery_capacity_mwh=200.0,
        battery_max_discharge_mw=50.0,
        backup_available=True,
        backup_capacity_mw=25.0,  # Total mitigation ~34.4 MW < 70 MW demand
    )

    assert assessment.risk_level == RiskLevel.HIGH
    assert assessment.shortfall_mw == 70.0


def test_zero_demand_edge_case():
    """Zero demand with positive solar output -> LOW risk."""
    assessment = assess_risk(
        generation_mw=50.0,
        demand_mw=0.0,
        lower_bound_mw=45.0,
        upper_bound_mw=55.0,
    )

    assert assessment.risk_level == RiskLevel.LOW
    assert assessment.surplus_mw == 50.0
    assert assessment.shortfall_mw == 0.0


def test_generation_equals_demand_exact():
    """Exact generation equals demand -> Evaluated based on lower bound."""
    # Sub-case 1: Lower bound is below demand -> MEDIUM
    assessment_1 = assess_risk(
        generation_mw=50.0,
        demand_mw=50.0,
        lower_bound_mw=48.0,
        upper_bound_mw=52.0,
    )
    assert assessment_1.risk_level == RiskLevel.MEDIUM

    # Sub-case 2: Lower bound equals demand -> LOW
    assessment_2 = assess_risk(
        generation_mw=50.0,
        demand_mw=50.0,
        lower_bound_mw=50.0,
        upper_bound_mw=52.0,
    )
    assert assessment_2.risk_level == RiskLevel.LOW


def test_battery_soc_boundaries():
    """Test battery usable power at boundary SOC values."""
    # At 0% SOC: 0 MW usable
    assert evaluate_battery_usable_power(True, 0.0, 200.0, 50.0) == 0.0

    # At exactly 10% (reserve limit): 0 MW usable
    assert evaluate_battery_usable_power(True, 10.0, 200.0, 50.0) == 0.0

    # At 100% SOC: Capped by max discharge rate (50 MW)
    assert evaluate_battery_usable_power(True, 100.0, 200.0, 50.0) == 50.0

    # When battery is offline: 0 MW usable
    assert evaluate_battery_usable_power(False, 100.0, 200.0, 50.0) == 0.0


# --- Service and API Integration Tests ---

def test_risk_service_evaluation():
    """Test RiskService end-to-end evaluation on demo data."""
    service = RiskService()
    assessment = service.evaluate_site_risk("solar-01", hour_index=12)

    assert isinstance(assessment, RiskAssessment)
    assert assessment.site_id == "solar-01"
    assert assessment.generation_mw > 0.0
    assert assessment.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]


def test_risk_service_invalid_site_raises_error():
    """Test RiskService raises ValueError on non-existent site ID."""
    service = RiskService()
    with pytest.raises(ValueError) as exc:
        service.evaluate_site_risk("invalid-plant-999")
    assert "Site 'invalid-plant-999' not found" in str(exc.value)


def test_api_risk_endpoint_success():
    """Test GET /api/risk/solar-01 via TestClient returns 200 and schema."""
    # We can use TestClient or direct endpoint invocation
    from app.api.risk import get_site_risk

    result = get_site_risk("solar-01", hour_index=12)
    assert result.site_id == "solar-01"
    assert result.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]


def test_api_risk_endpoint_invalid_site():
    """Test get_site_risk raises 404 HTTPException on unknown site."""
    from fastapi import HTTPException
    from app.api.risk import get_site_risk

    with pytest.raises(HTTPException) as exc:
        get_site_risk("unknown-site-x")
    assert exc.value.status_code == 404
