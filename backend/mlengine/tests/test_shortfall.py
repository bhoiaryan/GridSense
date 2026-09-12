"""Unit tests for GridPilot shortfall detection engine."""

# pyrefly: ignore [missing-import]
import pytest

from app.engines.shortfall_engine import calculate_shortfall
from app.schemas.risk import ShortfallStatus


def test_shortfall_condition():
    """Test 1: Generation below demand produces positive shortfall."""
    res = calculate_shortfall(forecast_generation_mw=40.0, demand_mw=60.0)

    assert res.status == ShortfallStatus.SHORTFALL
    assert res.generation_mw == 40.0
    assert res.demand_mw == 60.0
    assert res.shortfall_mw == 20.0


def test_no_shortfall_condition():
    """Test 2: Generation exceeds demand producing zero shortfall."""
    res = calculate_shortfall(forecast_generation_mw=80.0, demand_mw=60.0)

    assert res.status == ShortfallStatus.NO_SHORTFALL
    assert res.shortfall_mw == 0.0


def test_balanced_shortfall():
    """Test 3: Generation exactly equals demand producing balanced status and zero shortfall."""
    res = calculate_shortfall(forecast_generation_mw=60.0, demand_mw=60.0)

    assert res.status == ShortfallStatus.BALANCED
    assert res.shortfall_mw == 0.0


def test_nighttime_full_shortfall():
    """Test 4: Nighttime generation (0 MW) results in shortfall equal to full demand."""
    res = calculate_shortfall(forecast_generation_mw=0.0, demand_mw=35.0)

    assert res.status == ShortfallStatus.SHORTFALL
    assert res.shortfall_mw == 35.0


def test_zero_demand_no_shortfall():
    """Test 5: Zero grid demand produces zero shortfall."""
    res = calculate_shortfall(forecast_generation_mw=50.0, demand_mw=0.0)

    assert res.status == ShortfallStatus.NO_SHORTFALL
    assert res.shortfall_mw == 0.0
