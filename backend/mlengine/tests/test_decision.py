"""Unit and integration tests for GridPilot Decision Engine and Recommendation Engine (Phase 8).

Validates all 10 core operational cases, edge cases, error handling,
DecisionService, and end-to-end telemetry pipeline.
"""

from typing import Optional
# pyrefly: ignore [missing-import]
import pytest

from app.api.decision import get_site_decision
from app.engines.decision_engine import assess_decision
from app.schemas.decision import DecisionAction, OperationalDecision
from app.schemas.risk import RiskLevel
from app.services.decision_service import DecisionService, RecommendationService


class TestDecisionEngineCases:
    """Validate 10 deterministic operational decision cases specified in Phase 8."""

    def test_case_1_normal_surplus(self):
        """CASE 1: Generation > demand, low risk, battery can absorb surplus -> CHARGE_STORAGE."""
        decision = assess_decision(
            generation_mw=80.0,
            demand_mw=60.0,
            lower_bound_mw=75.0,
            upper_bound_mw=85.0,
            battery_available=True,
            battery_soc=50.0,
            battery_capacity_mwh=200.0,
            battery_max_charge_mw=50.0,
        )
        assert decision.action == DecisionAction.CHARGE_STORAGE
        assert decision.amount_mw == 20.0
        assert decision.surplus_mw == 20.0
        assert decision.remaining_surplus_mw == 0.0
        assert decision.risk_level == RiskLevel.LOW
        assert "absorbs 20.00 MW" in decision.impact

    def test_case_2_shortfall_with_battery(self):
        """CASE 2: Generation = 40 MW, Demand = 60 MW, Battery available -> DISCHARGE_STORAGE.

        Verify amount does not exceed battery discharge capability.
        """
        decision = assess_decision(
            generation_mw=40.0,
            demand_mw=60.0,
            lower_bound_mw=38.0,
            upper_bound_mw=42.0,
            battery_available=True,
            battery_soc=50.0,
            battery_capacity_mwh=200.0,
            battery_max_discharge_mw=50.0,
        )
        assert decision.action == DecisionAction.DISCHARGE_STORAGE
        assert decision.shortfall_mw == 20.0
        assert decision.amount_mw == 20.0
        assert decision.amount_mw <= 50.0  # within max discharge
        assert decision.remaining_shortfall_mw == 0.0
        assert "fully covers the expected shortfall" in decision.impact

    def test_case_3_shortfall_no_battery_backup_available(self):
        """CASE 3: Generation < demand, Battery unavailable, Backup available -> ACTIVATE_BACKUP."""
        decision = assess_decision(
            generation_mw=40.0,
            demand_mw=60.0,
            lower_bound_mw=38.0,
            upper_bound_mw=42.0,
            battery_available=False,
            battery_soc=0.0,
            backup_available=True,
            backup_capacity_mw=25.0,
        )
        assert decision.action == DecisionAction.ACTIVATE_BACKUP
        assert decision.amount_mw == 20.0
        assert decision.remaining_shortfall_mw == 0.0
        assert "Auxiliary backup generation supplies 20.00 MW" in decision.impact

    def test_case_4_shortfall_no_battery_no_backup(self):
        """CASE 4: Generation < demand, no battery, no backup.

        Tests both IMPORT_ENERGY when supported and NO_ACTION when unsupported.
        """
        # When grid import is supported
        decision_import = assess_decision(
            generation_mw=40.0,
            demand_mw=60.0,
            lower_bound_mw=38.0,
            upper_bound_mw=42.0,
            battery_available=False,
            backup_available=False,
            grid_import_available=True,
        )
        assert decision_import.action == DecisionAction.IMPORT_ENERGY
        assert decision_import.amount_mw == 20.0
        assert decision_import.remaining_shortfall_mw == 0.0
        assert "Grid energy import provides 20.00 MW" in decision_import.impact

        # When grid import is unsupported
        decision_no_import = assess_decision(
            generation_mw=40.0,
            demand_mw=60.0,
            lower_bound_mw=38.0,
            upper_bound_mw=42.0,
            battery_available=False,
            backup_available=False,
            grid_import_available=False,
        )
        assert decision_no_import.action == DecisionAction.NO_ACTION
        assert decision_no_import.amount_mw == 0.0
        assert decision_no_import.remaining_shortfall_mw == 20.0
        assert "Unmitigated shortfall of 20.00 MW" in decision_no_import.impact
        assert decision_no_import.risk_level == RiskLevel.HIGH

    def test_case_5_surplus_battery_space(self):
        """CASE 5: Generation > demand, battery can accept energy -> CHARGE_STORAGE."""
        decision = assess_decision(
            generation_mw=90.0,
            demand_mw=50.0,
            lower_bound_mw=85.0,
            upper_bound_mw=95.0,
            battery_available=True,
            battery_soc=40.0,
            battery_capacity_mwh=200.0,
            battery_max_charge_mw=50.0,
        )
        assert decision.action == DecisionAction.CHARGE_STORAGE
        assert decision.surplus_mw == 40.0
        assert decision.amount_mw == 40.0
        assert decision.remaining_surplus_mw == 0.0
        assert "absorbs 40.00 MW" in decision.impact

    def test_case_6_surplus_full_battery(self):
        """CASE 6: Generation > demand, battery has no available capacity (100% SOC).

        Tests EXPORT_ENERGY if supported, otherwise CURTAIL_GENERATION.
        """
        # When grid export is supported
        decision_export = assess_decision(
            generation_mw=80.0,
            demand_mw=50.0,
            lower_bound_mw=75.0,
            upper_bound_mw=85.0,
            battery_available=True,
            battery_soc=100.0,
            grid_export_available=True,
        )
        assert decision_export.action == DecisionAction.EXPORT_ENERGY
        assert decision_export.amount_mw == 30.0
        assert decision_export.remaining_surplus_mw == 0.0
        assert "Exporting 30.00 MW" in decision_export.impact

        # When grid export is unsupported -> CURTAIL_GENERATION
        decision_curtail = assess_decision(
            generation_mw=80.0,
            demand_mw=50.0,
            lower_bound_mw=75.0,
            upper_bound_mw=85.0,
            battery_available=True,
            battery_soc=100.0,
            grid_export_available=False,
        )
        assert decision_curtail.action == DecisionAction.CURTAIL_GENERATION
        assert decision_curtail.amount_mw == 30.0
        assert decision_curtail.remaining_surplus_mw == 0.0
        assert "Curtailing solar generation by 30.00 MW" in decision_curtail.impact

    def test_case_7_balanced(self):
        """CASE 7: Generation = demand -> NO_ACTION.

        Reason: Forecast generation is sufficient to meet expected demand.
        """
        decision = assess_decision(
            generation_mw=60.0,
            demand_mw=60.0,
            lower_bound_mw=60.0,
            upper_bound_mw=65.0,
        )
        assert decision.action == DecisionAction.NO_ACTION
        assert decision.amount_mw == 0.0
        assert decision.surplus_mw == 0.0
        assert decision.shortfall_mw == 0.0
        assert decision.remaining_shortfall_mw == 0.0
        assert decision.remaining_surplus_mw == 0.0
        assert "sufficient to meet expected demand" in decision.reason
        assert "Plant operates in exact balance" in decision.impact

    def test_case_8_partial_battery_support(self):
        """CASE 8: Shortfall = 30 MW, Battery can provide 10 MW.

        Expected: DISCHARGE_STORAGE, amount <= 10 MW, remaining_shortfall = 20 MW.
        """
        decision = assess_decision(
            generation_mw=70.0,
            demand_mw=100.0,
            lower_bound_mw=68.0,
            upper_bound_mw=72.0,
            battery_available=True,
            battery_soc=16.0,  # Just 6% above 10% reserve in 200MWh * 0.94 efficiency ≈ 11.28 MWh
            battery_capacity_mwh=200.0,
            battery_max_discharge_mw=10.0,  # Constrained max discharge power = 10 MW
        )
        assert decision.action == DecisionAction.DISCHARGE_STORAGE
        assert decision.shortfall_mw == 30.0
        assert decision.amount_mw == 10.0
        assert decision.remaining_shortfall_mw == 20.0
        assert "reduces the expected grid energy shortfall by 10.00 MW" in decision.impact

    def test_case_9_uncertainty_aware_monitoring(self):
        """CASE 9: Expected generation meets demand, but lower bound is below demand.

        Verify recommendation acknowledges uncertainty and risk.
        """
        decision = assess_decision(
            generation_mw=65.0,
            demand_mw=65.0,
            lower_bound_mw=50.0,
            upper_bound_mw=75.0,
            battery_available=True,
            battery_soc=50.0,
        )
        assert decision.action == DecisionAction.NO_ACTION
        assert decision.risk_level == RiskLevel.MEDIUM
        assert "lower forecast bound (50.00 MW) indicates a potential shortfall" in decision.reason
        assert "uncertainty" in decision.reason.lower()
        assert "reserve battery buffer" in decision.impact

    def test_case_10_high_risk_unmitigated(self):
        """CASE 10: High risk shortfall with limited/exhausted resources.

        Verify recommendation clearly communicates unresolved operational risk.
        """
        decision = assess_decision(
            generation_mw=20.0,
            demand_mw=80.0,  # 60 MW shortfall
            lower_bound_mw=18.0,
            upper_bound_mw=22.0,
            battery_available=True,
            battery_soc=12.0,  # only 2% usable = ~3.76 MWh
            battery_capacity_mwh=200.0,
            battery_max_discharge_mw=5.0,
            backup_available=False,
            grid_import_available=False,
        )
        assert decision.action == DecisionAction.DISCHARGE_STORAGE
        assert decision.shortfall_mw == 60.0
        # Battery usable energy is limited by 2% available SOC (200 MWh * 0.02 * 0.94 = 3.76 MW)
        assert decision.amount_mw == 3.76
        assert decision.remaining_shortfall_mw == 56.24
        assert decision.risk_level == RiskLevel.HIGH
        assert "unresolved high-risk deficit" in decision.impact



class TestDecisionEdgeCases:
    """Validate edge conditions, zero values, and constraint clamping."""

    def test_zero_generation_nighttime(self):
        """Zero solar generation at night with demand."""
        decision = assess_decision(
            generation_mw=0.0,
            demand_mw=30.0,
            lower_bound_mw=0.0,
            upper_bound_mw=0.0,
            battery_available=True,
            battery_soc=60.0,
            battery_capacity_mwh=200.0,
            battery_max_discharge_mw=50.0,
        )
        assert decision.shortfall_mw == 30.0
        assert decision.action == DecisionAction.DISCHARGE_STORAGE
        assert decision.amount_mw == 30.0

    def test_zero_demand(self):
        """Zero demand with active generation leads to full surplus."""
        decision = assess_decision(
            generation_mw=45.0,
            demand_mw=0.0,
            lower_bound_mw=43.0,
            upper_bound_mw=47.0,
            battery_available=True,
            battery_soc=50.0,
        )
        assert decision.surplus_mw == 45.0
        assert decision.action == DecisionAction.CHARGE_STORAGE
        assert decision.amount_mw == 45.0

    def test_battery_depleted_at_or_below_reserve(self):
        """Battery at 10% minimum reserve cannot discharge."""
        decision = assess_decision(
            generation_mw=40.0,
            demand_mw=60.0,
            lower_bound_mw=38.0,
            upper_bound_mw=42.0,
            battery_available=True,
            battery_soc=10.0,  # Reserve limit
            backup_available=True,
            backup_capacity_mw=25.0,
        )
        assert decision.action == DecisionAction.ACTIVATE_BACKUP
        assert decision.amount_mw == 20.0

    def test_battery_offline(self):
        """Battery offline falls back to auxiliary backup."""
        decision = assess_decision(
            generation_mw=30.0,
            demand_mw=50.0,
            lower_bound_mw=28.0,
            upper_bound_mw=32.0,
            battery_available=False,
            backup_available=True,
            backup_capacity_mw=25.0,
        )
        assert decision.action == DecisionAction.ACTIVATE_BACKUP


class TestDecisionServiceAndAPI:
    """Validate DecisionService, RecommendationService alias, and API router."""

    def test_decision_service_default_site(self):
        """DecisionService evaluates solar-01 successfully."""
        service = DecisionService()
        decision = service.evaluate_site_decision(site_id="solar-01", hour_index=12)
        assert isinstance(decision, OperationalDecision)
        assert decision.site_id == "solar-01"
        assert decision.generation_mw >= 0.0
        assert decision.demand_mw >= 0.0
        assert decision.action in DecisionAction

    def test_recommendation_service_alias(self):
        """RecommendationService alias functions identically."""
        rec_service = RecommendationService()
        decision = rec_service.evaluate_site_recommendation(site_id="solar-01", hour_index=12)
        assert isinstance(decision, OperationalDecision)
        assert decision.site_id == "solar-01"

    def test_decision_service_unknown_site_raises(self):
        """Unregistered site raises ValueError."""
        service = DecisionService()
        with pytest.raises(ValueError, match="Site 'unknown-99' not found"):
            service.evaluate_site_decision(site_id="unknown-99")

    def test_api_endpoint_decisions(self):
        """GET /api/decisions/{site_id} endpoint executes successfully."""
        decision = get_site_decision(site_id="solar-01", hour_index=10)
        assert decision.site_id == "solar-01"
        assert isinstance(decision.action, DecisionAction)

    def test_end_to_end_data_to_recommendation_flow(self):
        """Full pipeline: Data -> Validation -> Features -> XGBoost -> Uncertainty -> Risk -> Decision."""
        service = DecisionService()
        # Test across day and night
        day_decision = service.evaluate_site_decision(site_id="solar-01", hour_index=12)
        night_decision = service.evaluate_site_decision(site_id="solar-01", hour_index=1)

        # Day checks
        assert day_decision.generation_mw > 0.0
        assert day_decision.upper_bound_mw >= day_decision.generation_mw
        assert day_decision.lower_bound_mw <= day_decision.generation_mw

        # Night checks
        assert night_decision.generation_mw == 0.0
        assert night_decision.lower_bound_mw == 0.0
        assert night_decision.shortfall_mw > 0.0
        assert night_decision.action in (
            DecisionAction.DISCHARGE_STORAGE,
            DecisionAction.ACTIVATE_BACKUP,
            DecisionAction.NO_ACTION,
        )
