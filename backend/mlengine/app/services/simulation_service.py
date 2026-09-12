"""What-if and scenario simulation service for GridPilot (Phase 9).

Orchestrates:
1. Site verification and telemetry retrieval
2. Baseline forecast, uncertainty, risk, and dispatch evaluation
3. In-memory scenario modifications (cloud cover, demand, storage, backup)
4. Full recalculation of forecasts, uncertainty, risk, and decisions
5. Structured comparative analysis (deltas, percentage shifts, state changes)
"""

from typing import List, Optional
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd

from app.core.constants import BATTERY_MAX_CHARGE_MW
from app.engines.decision_engine import assess_decision
from app.ml.features import load_processed_features
from app.ml.predict import predict_generation_with_uncertainty
from app.schemas.simulation import (
    ScenarioComparison,
    ScenarioRequest,
    ScenarioResult,
    ScenarioState,
)
from app.services.data_service import DataService


class SimulationService:
    """Service executing what-if scenario simulations on renewable plant operations."""

    def __init__(self, data_service: Optional[DataService] = None) -> None:
        self.data_service = data_service or DataService()

    def simulate_scenario(self, request: ScenarioRequest) -> ScenarioResult:
        """Run what-if scenario simulation comparing baseline against modified parameters.

        Args:
            request: ScenarioRequest containing site_id, adjustments, overrides, and horizon.

        Returns:
            ScenarioResult containing baseline state, scenario state, and comparative variance.

        Raises:
            ValueError: For unregistered sites, invalid timestamps, or out-of-range parameters.
        """
        # 1. Site validation
        sites_data = self.data_service.loader.load_sites()
        sites_list = [sites_data] if isinstance(sites_data, dict) else sites_data
        matching_site = next((s for s in sites_list if s.get("id") == request.site_id), None)
        if not matching_site:
            raise ValueError(f"Site '{request.site_id}' not found in registered sites configuration.")

        # 2. Horizon validation
        hours = int(request.hours)
        if hours < 1 or hours > 72:
            raise ValueError(f"Simulation horizon hours must be between 1 and 72, got {hours}.")

        # 3. Load baseline telemetry records (read-only in-memory copies)
        features_df = load_processed_features()
        ops_df = self.data_service.loader.load_operations()

        if request.timestamp is not None and str(request.timestamp).strip():
            ts_str = str(request.timestamp).strip()
            match_feat = features_df[features_df["timestamp"].astype(str) == ts_str]
            if match_feat.empty:
                raise ValueError(f"Timestamp '{request.timestamp}' not found in processed telemetry.")
            start_idx = int(match_feat.index[0])
        else:
            start_idx = int(request.hour_index)
            if start_idx < 0 or start_idx >= len(features_df):
                raise ValueError(
                    f"hour_index {start_idx} out of range [0, {len(features_df) - 1}]."
                )

        if start_idx + hours > len(features_df) or start_idx + hours > len(ops_df):
            raise ValueError(
                f"Requested horizon {hours}h starting from index {start_idx} exceeds dataset length."
            )

        # Slice copies for in-memory processing (NEVER modifies disk data)
        base_feat = features_df.iloc[start_idx : start_idx + hours].copy().reset_index(drop=True)
        base_ops = ops_df.iloc[start_idx : start_idx + hours].copy().reset_index(drop=True)

        # 4. Compute BASELINE forecast and decisions
        base_forecast = predict_generation_with_uncertainty(base_feat)
        baseline_states: List[ScenarioState] = []

        for i in range(hours):
            rec_ts = str(base_feat.iloc[i]["timestamp"])
            gen = float(base_forecast.iloc[i]["expected_generation_mw"])
            low = float(base_forecast.iloc[i]["lower_bound_mw"])
            up = float(base_forecast.iloc[i]["upper_bound_mw"])
            dem = float(base_ops.iloc[i]["demand_mw"])
            soc = float(base_ops.iloc[i].get("battery_soc", 50.0))
            cap = float(base_ops.iloc[i].get("battery_capacity_mwh", 200.0))
            dis = float(base_ops.iloc[i].get("battery_max_discharge_mw", 50.0))
            b_avail = bool(base_ops.iloc[i].get("backup_available", True))
            b_cap = float(base_ops.iloc[i].get("backup_capacity_mw", 25.0))

            base_decision = assess_decision(
                generation_mw=gen,
                demand_mw=dem,
                lower_bound_mw=low,
                upper_bound_mw=up,
                battery_available=True,
                battery_soc=soc,
                battery_capacity_mwh=cap,
                battery_max_charge_mw=BATTERY_MAX_CHARGE_MW,
                battery_max_discharge_mw=dis,
                backup_available=b_avail,
                backup_capacity_mw=b_cap,
                site_id=request.site_id,
                timestamp=rec_ts,
            )

            state = ScenarioState(
                timestamp=rec_ts,
                generation_mw=base_decision.generation_mw,
                lower_bound_mw=base_decision.lower_bound_mw,
                upper_bound_mw=base_decision.upper_bound_mw,
                demand_mw=base_decision.demand_mw,
                surplus_mw=base_decision.surplus_mw,
                shortfall_mw=base_decision.shortfall_mw,
                battery_available=True,
                backup_available=b_avail,
                risk_level=base_decision.risk_level,
                action=base_decision.action,
                reason=base_decision.reason,
                impact=base_decision.impact,
            )
            baseline_states.append(state)

        # 5. Compute SCENARIO modifications and recalculate
        scen_feat = base_feat.copy()
        scen_ops = base_ops.copy()

        # Apply cloud cover adjustment and attenuate solar irradiance realistically
        old_cc = scen_feat["cloud_cover"].values.astype(float)
        new_cc = np.clip(old_cc + float(request.cloud_cover_adjustment), 0.0, 100.0)
        scen_feat["cloud_cover"] = new_cc

        delta_cc = new_cc - old_cc
        # Attenuation factor consistent with solar atmospheric transmittance
        attenuation = np.maximum(0.05, 1.0 - (delta_cc / 100.0) * 0.75)
        scen_feat["irradiance"] = np.clip(scen_feat["irradiance"].values * attenuation, 0.0, 1200.0)
        scen_feat["irradiance"] = np.where(scen_feat["is_daytime"] == 0, 0.0, scen_feat["irradiance"])

        # Apply demand adjustment (must not produce negative demand)
        demand_mult = max(0.0, 1.0 + (float(request.demand_adjustment_percent) / 100.0))
        scen_ops["demand_mw"] = np.maximum(0.0, scen_ops["demand_mw"].values * demand_mult)

        # Recalculate scenario forecast using existing XGBoost model and empirical uncertainty
        scen_forecast = predict_generation_with_uncertainty(scen_feat)
        scenario_states: List[ScenarioState] = []

        for i in range(hours):
            rec_ts = str(scen_feat.iloc[i]["timestamp"])
            gen = float(scen_forecast.iloc[i]["expected_generation_mw"])
            low = float(scen_forecast.iloc[i]["lower_bound_mw"])
            up = float(scen_forecast.iloc[i]["upper_bound_mw"])
            dem = float(scen_ops.iloc[i]["demand_mw"])
            soc = float(scen_ops.iloc[i].get("battery_soc", 50.0))
            cap = float(scen_ops.iloc[i].get("battery_capacity_mwh", 200.0))
            dis = float(scen_ops.iloc[i].get("battery_max_discharge_mw", 50.0))

            # Apply availability overrides
            battery_avail = (
                request.battery_available
                if request.battery_available is not None
                else True
            )
            backup_avail = (
                request.backup_available
                if request.backup_available is not None
                else bool(scen_ops.iloc[i].get("backup_available", True))
            )
            backup_cap = float(scen_ops.iloc[i].get("backup_capacity_mw", 25.0))

            scen_decision = assess_decision(
                generation_mw=gen,
                demand_mw=dem,
                lower_bound_mw=low,
                upper_bound_mw=up,
                battery_available=battery_avail,
                battery_soc=soc,
                battery_capacity_mwh=cap,
                battery_max_charge_mw=BATTERY_MAX_CHARGE_MW,
                battery_max_discharge_mw=dis,
                backup_available=backup_avail,
                backup_capacity_mw=backup_cap,
                site_id=request.site_id,
                timestamp=rec_ts,
            )

            state = ScenarioState(
                timestamp=rec_ts,
                generation_mw=scen_decision.generation_mw,
                lower_bound_mw=scen_decision.lower_bound_mw,
                upper_bound_mw=scen_decision.upper_bound_mw,
                demand_mw=scen_decision.demand_mw,
                surplus_mw=scen_decision.surplus_mw,
                shortfall_mw=scen_decision.shortfall_mw,
                battery_available=battery_avail,
                backup_available=backup_avail,
                risk_level=scen_decision.risk_level,
                action=scen_decision.action,
                reason=scen_decision.reason,
                impact=scen_decision.impact,
            )
            scenario_states.append(state)

        # 6. Comparative variance analysis (using the primary first observation)
        b0 = baseline_states[0]
        s0 = scenario_states[0]

        gen_delta = round(s0.generation_mw - b0.generation_mw, 4)
        dem_delta = round(s0.demand_mw - b0.demand_mw, 4)
        surp_delta = round(s0.surplus_mw - b0.surplus_mw, 4)
        short_delta = round(s0.shortfall_mw - b0.shortfall_mw, 4)

        risk_changed = bool(s0.risk_level != b0.risk_level)
        decision_changed = bool(s0.action != b0.action)

        # Safe percentage changes handling zero baseline values
        if b0.generation_mw > 0.001:
            gen_pct: Optional[float] = round((gen_delta / b0.generation_mw) * 100.0, 2)
        else:
            gen_pct = 0.0 if abs(gen_delta) < 0.001 else None

        if b0.shortfall_mw > 0.001:
            short_pct: Optional[float] = round((short_delta / b0.shortfall_mw) * 100.0, 2)
        else:
            short_pct = 0.0 if abs(short_delta) < 0.001 else None

        comparison = ScenarioComparison(
            generation_delta_mw=gen_delta,
            demand_delta_mw=dem_delta,
            surplus_delta_mw=surp_delta,
            shortfall_delta_mw=short_delta,
            risk_changed=risk_changed,
            decision_changed=decision_changed,
            generation_percent_change=gen_pct,
            shortfall_percent_change=short_pct,
        )

        return ScenarioResult(
            site_id=request.site_id,
            hours=hours,
            baseline=b0,
            scenario=s0,
            comparison=comparison,
            timeline_baseline=baseline_states if hours > 1 else None,
            timeline_scenario=scenario_states if hours > 1 else None,
        )
