"""Deterministic and explainable operational decision engine for GridPilot.

Evaluates operational conditions and recommends deterministic dispatch actions:
- CHARGE_STORAGE: Absorb surplus generation into BESS
- DISCHARGE_STORAGE: Mitigate generation deficits from BESS reserves
- IMPORT_ENERGY: Draw power from external grid when supported
- EXPORT_ENERGY: Supply excess power to external grid when supported
- ACTIVATE_BACKUP: Dispatch auxiliary reserve generation
- CURTAIL_GENERATION: Inverter curtailment when surplus cannot be absorbed or exported
- NO_ACTION: Steady-state operation or active uncertainty monitoring

Strictly deterministic, rule-based, and explainable. No LLM dependency.
"""

from typing import Optional
# pyrefly: ignore [missing-import]
import numpy as np

from app.core.constants import (
    BATTERY_MAX_CHARGE_MW,
    BATTERY_MAX_SOC_PCT,
    BATTERY_MIN_RESERVE_SOC_PCT,
    GRID_EXPORT_SUPPORTED,
    GRID_IMPORT_SUPPORTED,
)
from app.engines.risk_engine import assess_risk, evaluate_battery_usable_power
from app.schemas.decision import DecisionAction, OperationalDecision
from app.schemas.risk import RiskAssessment, RiskLevel


def assess_decision(
    generation_mw: float,
    demand_mw: float,
    lower_bound_mw: float,
    upper_bound_mw: float,
    risk_level: Optional[RiskLevel] = None,
    battery_available: bool = True,
    battery_soc: float = 50.0,
    battery_capacity_mwh: float = 200.0,
    battery_max_charge_mw: float = BATTERY_MAX_CHARGE_MW,
    battery_max_discharge_mw: float = 50.0,
    backup_available: bool = True,
    backup_capacity_mw: float = 25.0,
    grid_import_available: Optional[bool] = None,
    grid_export_available: Optional[bool] = None,
    site_id: str = "solar-01",
    timestamp: Optional[str] = None,
) -> OperationalDecision:
    """Evaluate power dispatch conditions and produce a transparent operational recommendation.

    Args:
        generation_mw: Expected solar active generation (MW).
        demand_mw: Contracted demand load (MW).
        lower_bound_mw: Lower empirical forecast uncertainty bound (MW).
        upper_bound_mw: Upper empirical forecast uncertainty bound (MW).
        risk_level: Precomputed operational risk level (assessed if None).
        battery_available: Whether the battery system is online.
        battery_soc: Battery State of Charge percentage (0-100).
        battery_capacity_mwh: Nameplate battery storage capacity (MWh).
        battery_max_charge_mw: Maximum battery charging power (MW).
        battery_max_discharge_mw: Maximum battery discharging power (MW).
        backup_available: Whether auxiliary backup generator is operational.
        backup_capacity_mw: Available auxiliary backup capacity (MW).
        grid_import_available: Override flag for external grid import capability.
        grid_export_available: Override flag for external grid export capability.
        site_id: Facility identifier.
        timestamp: Optional observation timestamp.

    Returns:
        OperationalDecision schema instance with deterministic action, amounts, reason, and impact.
    """
    gen = max(0.0, float(generation_mw))
    dem = max(0.0, float(demand_mw))
    low = max(0.0, min(gen, float(lower_bound_mw)))
    up = max(gen, float(upper_bound_mw))

    # Determine risk level if not explicitly provided
    if risk_level is None:
        risk_eval = assess_risk(
            generation_mw=gen,
            demand_mw=dem,
            lower_bound_mw=low,
            upper_bound_mw=up,
            battery_available=battery_available,
            battery_soc=battery_soc,
            battery_capacity_mwh=battery_capacity_mwh,
            battery_max_discharge_mw=battery_max_discharge_mw,
            backup_available=backup_available,
            backup_capacity_mw=backup_capacity_mw,
            site_id=site_id,
            timestamp=timestamp,
        )
        assessed_risk = risk_eval.risk_level
    else:
        assessed_risk = risk_level

    # Basic power balance
    surplus_mw = round(max(0.0, gen - dem), 4)
    shortfall_mw = round(max(0.0, dem - gen), 4)
    potential_shortfall_mw = round(max(0.0, dem - low), 4)

    # Interconnection capability flags
    can_import = GRID_IMPORT_SUPPORTED if grid_import_available is None else bool(grid_import_available)
    can_export = GRID_EXPORT_SUPPORTED if grid_export_available is None else bool(grid_export_available)

    # Battery usable discharge capability (MW)
    battery_usable_discharge_mw = evaluate_battery_usable_power(
        available=battery_available,
        soc_pct=battery_soc,
        capacity_mwh=battery_capacity_mwh,
        max_discharge_mw=battery_max_discharge_mw,
    )

    # Battery usable charge capability (MW)
    if not battery_available or battery_soc >= (BATTERY_MAX_SOC_PCT - 0.01):
        battery_usable_charge_mw = 0.0
    else:
        headroom_mwh = max(0.0, (BATTERY_MAX_SOC_PCT - battery_soc) / 100.0 * battery_capacity_mwh)
        battery_usable_charge_mw = float(min(battery_max_charge_mw, headroom_mwh))

    # Backup usable capacity (MW)
    backup_usable_mw = float(backup_capacity_mw) if backup_available else 0.0

    # Initialize decision outputs
    action = DecisionAction.NO_ACTION
    amount_mw = 0.0
    remaining_shortfall_mw = 0.0
    remaining_surplus_mw = 0.0
    reason = ""
    impact = ""

    # ---------------------------------------------------------
    # CASE 1: Generation Shortfall (demand > generation)
    # ---------------------------------------------------------
    if shortfall_mw > 0.0:
        # Priority 1: Battery Storage Discharge
        if battery_usable_discharge_mw > 0.0:
            action = DecisionAction.DISCHARGE_STORAGE
            amount_mw = round(min(shortfall_mw, battery_usable_discharge_mw), 4)
            remaining_shortfall_mw = round(max(0.0, shortfall_mw - amount_mw), 4)

            if remaining_shortfall_mw == 0.0:
                reason = (
                    f"Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW. "
                    f"Battery storage is available at {battery_soc:.1f}% SOC and dispatched at {amount_mw:.2f} MW."
                )
                impact = (
                    f"Storage discharge of {amount_mw:.2f} MW fully covers the expected shortfall with 0.00 MW remaining deficit."
                )
            else:
                reason = (
                    f"Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW. "
                    f"Battery storage is dispatched at maximum usable power ({amount_mw:.2f} MW at {battery_soc:.1f}% SOC), "
                    f"leaving an unmitigated deficit of {remaining_shortfall_mw:.2f} MW."
                )
                if assessed_risk == RiskLevel.HIGH:
                    impact = (
                        f"Storage discharge reduces the shortfall by {amount_mw:.2f} MW, but an unresolved high-risk deficit "
                        f"of {remaining_shortfall_mw:.2f} MW requires secondary backup or emergency support."
                    )
                else:
                    impact = (
                        f"Storage discharge reduces the expected grid energy shortfall by {amount_mw:.2f} MW, "
                        f"leaving {remaining_shortfall_mw:.2f} MW deficit requiring secondary reserve support."
                    )

        # Priority 2: Auxiliary Backup Generation (if battery unavailable / depleted)
        elif backup_usable_mw > 0.0:
            action = DecisionAction.ACTIVATE_BACKUP
            amount_mw = round(min(shortfall_mw, backup_usable_mw), 4)
            remaining_shortfall_mw = round(max(0.0, shortfall_mw - amount_mw), 4)

            if remaining_shortfall_mw == 0.0:
                reason = (
                    f"Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW "
                    f"and battery storage is unavailable or depleted ({battery_soc:.1f}% SOC). Auxiliary backup generation is activated."
                )
                impact = f"Auxiliary backup generation supplies {amount_mw:.2f} MW, fully covering the expected deficit."
            else:
                reason = (
                    f"Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW "
                    f"with no usable battery storage. Auxiliary backup is activated at maximum available capacity ({amount_mw:.2f} MW)."
                )
                impact = (
                    f"Auxiliary backup supplies {amount_mw:.2f} MW, reducing the shortfall but leaving "
                    f"{remaining_shortfall_mw:.2f} MW unmitigated deficit."
                )

        # Priority 3: External Grid Energy Import (if supported)
        elif can_import:
            action = DecisionAction.IMPORT_ENERGY
            amount_mw = shortfall_mw
            remaining_shortfall_mw = 0.0
            reason = (
                f"Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW, "
                f"and neither battery storage nor backup generation is available. Grid energy import is scheduled."
            )
            impact = f"Grid energy import provides {amount_mw:.2f} MW, covering the generation deficit."

        # Unmitigated Shortfall (No local resources and import unsupported)
        else:
            action = DecisionAction.NO_ACTION
            amount_mw = 0.0
            remaining_shortfall_mw = shortfall_mw
            reason = (
                f"Critical deficit: Expected generation ({gen:.2f} MW) is below demand ({dem:.2f} MW) by {shortfall_mw:.2f} MW, "
                f"but battery storage, backup generators, and grid import are unavailable."
            )
            impact = (
                f"Unmitigated shortfall of {shortfall_mw:.2f} MW requires emergency manual intervention or load shedding."
            )

    # ---------------------------------------------------------
    # CASE 2: Generation Surplus (generation > demand)
    # ---------------------------------------------------------
    elif surplus_mw > 0.0:
        # Priority 1: Battery Storage Charging
        if battery_usable_charge_mw > 0.0:
            action = DecisionAction.CHARGE_STORAGE
            amount_mw = round(min(surplus_mw, battery_usable_charge_mw), 4)
            remaining_surplus_mw = round(max(0.0, surplus_mw - amount_mw), 4)

            uncertainty_note = ""
            if potential_shortfall_mw > 0.0:
                uncertainty_note = (
                    f" Note: Lower uncertainty bound ({low:.2f} MW) indicates possible variability "
                    f"(potential shortfall of {potential_shortfall_mw:.2f} MW)."
                )

            if remaining_surplus_mw == 0.0:
                reason = (
                    f"Forecast generation ({gen:.2f} MW) exceeds demand ({dem:.2f} MW) by {surplus_mw:.2f} MW. "
                    f"Battery storage has available charging capacity at {battery_soc:.1f}% SOC.{uncertainty_note}"
                )
                impact = f"Charging storage absorbs {amount_mw:.2f} MW of solar surplus, building operating reserves."
            else:
                reason = (
                    f"Forecast generation ({gen:.2f} MW) exceeds demand ({dem:.2f} MW) by {surplus_mw:.2f} MW. "
                    f"Battery storage absorbs up to maximum charge limit ({amount_mw:.2f} MW, SOC {battery_soc:.1f}%), "
                    f"leaving {remaining_surplus_mw:.2f} MW surplus.{uncertainty_note}"
                )
                impact = (
                    f"Storage absorbs {amount_mw:.2f} MW; remaining {remaining_surplus_mw:.2f} MW surplus requires "
                    f"secondary export or curtailment."
                )

        # Priority 2: External Grid Export (if battery cannot accept more charge and export supported)
        elif can_export:
            action = DecisionAction.EXPORT_ENERGY
            amount_mw = surplus_mw
            remaining_surplus_mw = 0.0
            reason = (
                f"Forecast generation ({gen:.2f} MW) exceeds demand ({dem:.2f} MW) by {surplus_mw:.2f} MW "
                f"and battery storage cannot accept additional charge (SOC at {battery_soc:.1f}%); grid export is supported."
            )
            impact = f"Exporting {amount_mw:.2f} MW surplus solar energy to the external grid."

        # Priority 3: Solar Generation Curtailment (full battery and no export capability)
        else:
            action = DecisionAction.CURTAIL_GENERATION
            amount_mw = surplus_mw
            remaining_surplus_mw = 0.0
            reason = (
                f"Forecast generation ({gen:.2f} MW) exceeds demand ({dem:.2f} MW) by {surplus_mw:.2f} MW, "
                f"battery storage cannot accept more energy (SOC at {battery_soc:.1f}%), and grid export is not supported."
            )
            impact = (
                f"Curtailing solar generation by {amount_mw:.2f} MW to prevent grid overvoltage and maintain system balance."
            )

    # ---------------------------------------------------------
    # CASE 3: Balanced Operation (generation == demand)
    # ---------------------------------------------------------
    else:
        action = DecisionAction.NO_ACTION
        amount_mw = 0.0
        remaining_shortfall_mw = 0.0
        remaining_surplus_mw = 0.0

        if potential_shortfall_mw > 0.0:
            # Expected generation equals demand, but lower bound indicates possible shortfall
            reason = (
                f"Expected generation ({gen:.2f} MW) meets demand ({dem:.2f} MW), but the lower forecast bound "
                f"({low:.2f} MW) indicates a potential shortfall of {potential_shortfall_mw:.2f} MW under uncertainty."
            )
            impact = (
                "Maintain active monitoring of solar telemetry; reserve battery buffer ready to dispatch if generation dips."
            )
        else:
            reason = (
                f"Forecast generation ({gen:.2f} MW) is sufficient to meet expected demand ({dem:.2f} MW) with high confidence."
            )
            impact = "Plant operates in exact balance; no active storage dispatch, grid exchange, or backup intervention required."

    return OperationalDecision(
        site_id=site_id,
        timestamp=timestamp,
        action=action,
        amount_mw=amount_mw,
        generation_mw=round(gen, 4),
        demand_mw=round(dem, 4),
        lower_bound_mw=round(low, 4),
        upper_bound_mw=round(up, 4),
        surplus_mw=surplus_mw,
        shortfall_mw=shortfall_mw,
        remaining_shortfall_mw=remaining_shortfall_mw,
        remaining_surplus_mw=remaining_surplus_mw,
        risk_level=assessed_risk,
        reason=reason,
        impact=impact,
    )
