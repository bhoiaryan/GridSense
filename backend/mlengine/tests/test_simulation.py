"""Unit and integration tests for GridPilot What-If / Scenario Simulation (Phase 9).

Validates all 10 scenario cases, edge cases, multi-hour horizons,
source data immutability, repeatability, and API endpoint integration.
"""

from typing import Optional
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import pytest

from app.api.simulation import simulate_scenario_endpoint
from app.ml.features import load_processed_features
from app.schemas.decision import DecisionAction
from app.schemas.risk import RiskLevel
from app.schemas.simulation import ScenarioRequest, ScenarioResult
from app.services.data_service import DataService
from app.services.simulation_service import SimulationService


class TestSimulationCases:
    """Validate 10 core what-if simulation cases."""

    def test_case_1_baseline_vs_identical_scenario(self):
        """CASE 1: No modifications. Baseline and scenario must match with 0 deltas."""
        service = SimulationService()
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=0.0,
            demand_adjustment_percent=0.0,
            battery_available=None,
            backup_available=None,
        )
        res = service.simulate_scenario(req)

        assert res.baseline.generation_mw == res.scenario.generation_mw
        assert res.baseline.demand_mw == res.scenario.demand_mw
        assert res.baseline.surplus_mw == res.scenario.surplus_mw
        assert res.baseline.shortfall_mw == res.scenario.shortfall_mw
        assert res.baseline.risk_level == res.scenario.risk_level
        assert res.baseline.action == res.scenario.action

        assert res.comparison.generation_delta_mw == 0.0
        assert res.comparison.demand_delta_mw == 0.0
        assert res.comparison.surplus_delta_mw == 0.0
        assert res.comparison.shortfall_delta_mw == 0.0
        assert res.comparison.risk_changed is False
        assert res.comparison.decision_changed is False

    def test_case_2_demand_increase(self):
        """CASE 2: Demand increase by +15%. Scenario demand > baseline demand."""
        service = SimulationService()
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            demand_adjustment_percent=15.0,
        )
        res = service.simulate_scenario(req)

        assert res.scenario.demand_mw > res.baseline.demand_mw
        assert res.comparison.demand_delta_mw > 0.0
        # Increased demand either decreases surplus or increases shortfall
        assert (res.scenario.surplus_mw < res.baseline.surplus_mw) or (
            res.scenario.shortfall_mw > res.baseline.shortfall_mw
        )

    def test_case_3_cloud_cover_increase(self):
        """CASE 3: Increase cloud cover during daytime.

        Expected: XGBoost forecast is recalculated with modified features,
        and generation drops.
        """
        service = SimulationService()
        # Choose a clear midday hour
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=40.0,
        )
        res = service.simulate_scenario(req)

        assert res.comparison.generation_delta_mw != 0.0
        assert res.scenario.generation_mw < res.baseline.generation_mw
        assert res.comparison.generation_delta_mw < 0.0

    def test_case_4_battery_disabled(self):
        """CASE 4: battery_available = False.

        Decision engine must not recommend CHARGE_STORAGE or DISCHARGE_STORAGE.
        """
        service = SimulationService()
        # Choose a night hour where battery would normally discharge, or midday where it charges
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=1,
            battery_available=False,
        )
        res = service.simulate_scenario(req)

        assert res.scenario.battery_available is False
        assert res.scenario.action not in (
            DecisionAction.CHARGE_STORAGE,
            DecisionAction.DISCHARGE_STORAGE,
        )

    def test_case_5_backup_disabled(self):
        """CASE 5: backup_available = False.

        Scenario decision must never be ACTIVATE_BACKUP.
        """
        service = SimulationService()
        # Choose a condition with no battery and shortfall
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=1,
            battery_available=False,
            backup_available=False,
        )
        res = service.simulate_scenario(req)

        assert res.scenario.backup_available is False
        assert res.scenario.action != DecisionAction.ACTIVATE_BACKUP

    def test_case_6_combined_scenario(self):
        """CASE 6: Combined cloud cover + demand + offline battery + offline backup."""
        service = SimulationService()
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=30.0,
            demand_adjustment_percent=20.0,
            battery_available=False,
            backup_available=False,
        )
        res = service.simulate_scenario(req)

        assert res.scenario.generation_mw < res.baseline.generation_mw
        assert res.scenario.demand_mw > res.baseline.demand_mw
        assert res.scenario.battery_available is False
        assert res.scenario.backup_available is False
        # Full recalculation across all domains
        assert isinstance(res.scenario.risk_level, RiskLevel)
        assert isinstance(res.scenario.action, DecisionAction)

    def test_case_7_no_negative_demand(self):
        """CASE 7: Demand adjustment <= -100% must not produce negative demand."""
        service = SimulationService()
        # -100% demand means 0.0 demand
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            demand_adjustment_percent=-100.0,
        )
        res = service.simulate_scenario(req)
        assert res.scenario.demand_mw == 0.0

        # Below -100% must be rejected by validator
        with pytest.raises(Exception):
            ScenarioRequest(
                site_id="solar-01",
                demand_adjustment_percent=-120.0,
            )

    def test_case_8_cloud_cover_boundary_clamping(self):
        """CASE 8: Large cloud cover adjustments must remain clamped between 0 and 100."""
        service = SimulationService()
        # +100% adjustment on existing cloud cover clamps to 100.0
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=100.0,
        )
        res = service.simulate_scenario(req)
        assert res.scenario.generation_mw >= 0.0

    def test_case_9_repeatability(self):
        """CASE 9: Running the same scenario twice produces identical results."""
        service = SimulationService()
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=10,
            cloud_cover_adjustment=25.0,
            demand_adjustment_percent=10.0,
        )
        res1 = service.simulate_scenario(req)
        res2 = service.simulate_scenario(req)

        assert res1.scenario.generation_mw == res2.scenario.generation_mw
        assert res1.scenario.demand_mw == res2.scenario.demand_mw
        assert res1.comparison.generation_delta_mw == res2.comparison.generation_delta_mw
        assert res1.comparison.demand_delta_mw == res2.comparison.demand_delta_mw
        assert res1.scenario.action == res2.scenario.action

    def test_case_10_source_data_integrity(self):
        """CASE 10: Running simulations must NOT alter disk/telemetry files."""
        data_service = DataService()
        features_before = load_processed_features().copy()
        ops_before = data_service.loader.load_operations().copy()

        service = SimulationService(data_service=data_service)
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=50.0,
            demand_adjustment_percent=30.0,
            battery_available=False,
            backup_available=False,
        )
        _ = service.simulate_scenario(req)

        features_after = load_processed_features()
        ops_after = data_service.loader.load_operations()

        pd.testing.assert_frame_equal(features_before, features_after)
        pd.testing.assert_frame_equal(ops_before, ops_after)


class TestSimulationMultiHourAndAPI:
    """Validate multi-hour horizons and FastAPI endpoint integration."""

    def test_multi_hour_horizon_24h(self):
        """Simulation supports 24-hour forecast horizon."""
        service = SimulationService()
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=0,
            hours=24,
            cloud_cover_adjustment=20.0,
        )
        res = service.simulate_scenario(req)

        assert res.hours == 24
        assert res.timeline_baseline is not None
        assert res.timeline_scenario is not None
        assert len(res.timeline_baseline) == 24
        assert len(res.timeline_scenario) == 24

    def test_invalid_site_raises_error(self):
        """Unregistered site raises ValueError."""
        service = SimulationService()
        req = ScenarioRequest(site_id="unknown-plant")
        with pytest.raises(ValueError, match="Site 'unknown-plant' not found"):
            service.simulate_scenario(req)

    def test_api_endpoint_simulation_success(self):
        """POST /api/simulate endpoint returns structured ScenarioResult."""
        req = ScenarioRequest(
            site_id="solar-01",
            hour_index=12,
            cloud_cover_adjustment=15.0,
            demand_adjustment_percent=5.0,
        )
        res = simulate_scenario_endpoint(req)
        assert isinstance(res, ScenarioResult)
        assert res.site_id == "solar-01"
        assert res.baseline.generation_mw >= 0.0
        assert res.scenario.generation_mw >= 0.0
