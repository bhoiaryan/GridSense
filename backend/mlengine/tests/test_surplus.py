"""Unit tests for GridPilot surplus detection engine."""

# pyrefly: ignore [missing-import]
import pytest

from app.engines.surplus_engine import calculate_surplus
from app.schemas.risk import SurplusStatus


def test_surplus_condition():
    """Test 1: Generation exceeds demand producing positive surplus."""
    res = calculate_surplus(forecast_generation_mw=80.0, demand_mw=60.0)

    assert res.status == SurplusStatus.SURPLUS
    assert res.generation_mw == 80.0
    assert res.demand_mw == 60.0
    assert res.surplus_mw == 20.0


def test_no_surplus_condition():
    """Test 2: Generation is below demand producing zero surplus."""
    res = calculate_surplus(forecast_generation_mw=40.0, demand_mw=60.0)

    assert res.status == SurplusStatus.NO_SURPLUS
    assert res.surplus_mw == 0.0


def test_balanced_condition():
    """Test 3: Generation equals demand producing balanced status and zero surplus."""
    res = calculate_surplus(forecast_generation_mw=60.0, demand_mw=60.0)

    assert res.status == SurplusStatus.BALANCED
    assert res.surplus_mw == 0.0


def test_zero_generation():
    """Test 4: Zero solar generation at night produces NO_SURPLUS."""
    res = calculate_surplus(forecast_generation_mw=0.0, demand_mw=45.0)

    assert res.status == SurplusStatus.NO_SURPLUS
    assert res.surplus_mw == 0.0


def test_zero_demand():
    """Test 5: Zero grid demand produces 100% generation surplus."""
    res = calculate_surplus(forecast_generation_mw=55.0, demand_mw=0.0)

    assert res.status == SurplusStatus.SURPLUS
    assert res.surplus_mw == 55.0
