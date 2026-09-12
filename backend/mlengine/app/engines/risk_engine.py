"""Deterministic and explainable operational risk engine for GridPilot.

Evaluates operational risk (LOW, MEDIUM, HIGH) by synthesizing:
- Expected generation vs. contracted demand (surplus / shortfall)
- Forecast uncertainty intervals (lower and upper bounds)
- Energy storage operational context (SOC, capacity, max discharge)
- Auxiliary backup generator availability
- Physical mitigation capacity vs. potential deficit
"""

from typing import Optional, Union
# pyrefly: ignore [missing-import]
import numpy as np

from app.core.constants import (
    BATTERY_DISCHARGE_EFFICIENCY,
    BATTERY_LOW_SOC_PCT,
    BATTERY_MIN_RESERVE_SOC_PCT,
    SHORTFALL_MARGINAL_MW,
    SHORTFALL_SEVERE_MW,
)
from app.engines.shortfall_engine import calculate_shortfall
from app.engines.surplus_engine import calculate_surplus
from app.schemas.risk import (
    BackupContext,
    BatteryContext,
    RiskAssessment,
    RiskLevel,
)


def evaluate_battery_usable_power(
    available: bool,
    soc_pct: float,
    capacity_mwh: float,
    max_discharge_mw: float,
) -> float:
    """Calculate usable battery discharge rate (MW) above minimum reserve limit."""
    if not available or soc_pct <= BATTERY_MIN_RESERVE_SOC_PCT:
        return 0.0

    usable_energy_mwh = (
        (soc_pct - BATTERY_MIN_RESERVE_SOC_PCT)
        / 100.0
        * capacity_mwh
        * BATTERY_DISCHARGE_EFFICIENCY
    )
    # Over a 1-hour interval, max discharge is limited by C-rate and usable stored energy
    return float(min(max_discharge_mw, usable_energy_mwh))


def assess_risk(
    generation_mw: float,
    demand_mw: float,
    lower_bound_mw: float,
    upper_bound_mw: float,
    battery_available: bool = True,
    battery_soc: float = 50.0,
    battery_capacity_mwh: float = 200.0,
    battery_max_discharge_mw: float = 50.0,
    backup_available: bool = True,
    backup_capacity_mw: float = 25.0,
    site_id: str = "solar-01",
    timestamp: Optional[str] = None,
) -> RiskAssessment:
    """Perform deterministic, explainable risk assessment.

    Args:
        generation_mw: Expected solar generation output (MW).
        demand_mw: Contracted electrical demand load (MW).
        lower_bound_mw: Lower empirical forecast uncertainty bound (MW).
        upper_bound_mw: Upper empirical forecast uncertainty bound (MW).
        battery_available: Whether the battery system is online.
        battery_soc: Current battery State of Charge percentage (0-100).
        battery_capacity_mwh: Nameplate battery storage capacity (MWh).
        battery_max_discharge_mw: Maximum battery discharge power (MW).
        backup_available: Whether auxiliary backup generator is operational.
        backup_capacity_mw: Available auxiliary generator capacity (MW).
        site_id: Plant identifier.
        timestamp: Optional observation timestamp.

    Returns:
        RiskAssessment containing categorical risk level, power balance, and justification.
    """
    gen = max(0.0, float(generation_mw))
    dem = max(0.0, float(demand_mw))
    low = max(0.0, min(gen, float(lower_bound_mw)))
    up = max(gen, float(upper_bound_mw))

    # 1. Power balance evaluations
    surplus_res = calculate_surplus(gen, dem)
    shortfall_res = calculate_shortfall(gen, dem)
    surplus_mw = surplus_res.surplus_mw
    shortfall_mw = shortfall_res.shortfall_mw

    # 2. Uncertainty metrics
    uncertainty_mw = round(up - low, 4)
    potential_shortfall_mw = round(max(0.0, dem - low), 4)

    # 3. Usable operational mitigation capacity
    battery_usable_mw = evaluate_battery_usable_power(
        available=battery_available,
        soc_pct=battery_soc,
        capacity_mwh=battery_capacity_mwh,
        max_discharge_mw=battery_max_discharge_mw,
    )
    backup_usable_mw = float(backup_capacity_mw) if backup_available else 0.0
    total_mitigation_mw = round(battery_usable_mw + backup_usable_mw, 4)

    # Net unmitigated shortfall after dispatching all available battery and backup
    unmitigated_deficit_mw = round(max(0.0, shortfall_mw - total_mitigation_mw), 4)

    # 4. Deterministic Risk Level & Explanation Logic
    if shortfall_mw > 0.0:
        # Expected generation falls below demand
        if unmitigated_deficit_mw > 0.0:
            risk_level = RiskLevel.HIGH
            if not battery_available and not backup_available:
                reason = (
                    f"HIGH risk: Expected generation is below demand with an unmitigated shortfall of "
                    f"{shortfall_mw:.2f} MW due to unavailable battery and backup reserves."
                )
            else:
                reason = (
                    f"HIGH risk: Expected generation is below demand and shortfall ({shortfall_mw:.2f} MW) "
                    f"exceeds total available battery and backup capacity ({total_mitigation_mw:.2f} MW), "
                    f"leaving an unmet deficit of {unmitigated_deficit_mw:.2f} MW."
                )
        else:
            # Shortfall exists but available mitigation can fully cover it
            risk_level = RiskLevel.MEDIUM
            if battery_usable_mw >= shortfall_mw:
                reason = (
                    f"MEDIUM risk: Expected generation is below demand by {shortfall_mw:.2f} MW, "
                    f"but available battery storage ({battery_usable_mw:.2f} MW at {battery_soc:.1f}% SOC) "
                    f"is sufficient to cover the deficit."
                )
            elif backup_usable_mw >= shortfall_mw:
                reason = (
                    f"MEDIUM risk: Expected generation is below demand by {shortfall_mw:.2f} MW; "
                    f"active auxiliary backup capacity ({backup_usable_mw:.2f} MW) is sufficient to cover the deficit."
                )
            else:
                reason = (
                    f"MEDIUM risk: Expected generation is below demand by {shortfall_mw:.2f} MW; "
                    f"combined battery and backup reserves ({total_mitigation_mw:.2f} MW) can cover the deficit."
                )

    elif potential_shortfall_mw > 0.0:
        # Expected generation meets demand, but lower uncertainty bound drops below demand
        if total_mitigation_mw < potential_shortfall_mw and not (battery_available or backup_available):
            risk_level = RiskLevel.MEDIUM
            reason = (
                f"MEDIUM risk: Expected generation meets demand, but forecast uncertainty indicates a potential "
                f"shortfall of {potential_shortfall_mw:.2f} MW under lower bound conditions with no reserve buffer."
            )
        else:
            risk_level = RiskLevel.MEDIUM
            reason = (
                f"MEDIUM risk: Expected generation meets demand, but the lower forecast bound indicates possible "
                f"shortfall of {potential_shortfall_mw:.2f} MW under conservative uncertainty conditions."
            )

    else:
        # Generation comfortably exceeds demand even under the lower bound
        risk_level = RiskLevel.LOW
        reason = (
            f"LOW risk: Forecast is expected to meet demand with high confidence; "
            f"lower forecast bound ({low:.2f} MW) remains comfortably above demand ({dem:.2f} MW)."
        )

    return RiskAssessment(
        site_id=site_id,
        timestamp=timestamp,
        risk_level=risk_level,
        generation_mw=round(gen, 4),
        demand_mw=round(dem, 4),
        lower_bound_mw=round(low, 4),
        upper_bound_mw=round(up, 4),
        surplus_mw=round(surplus_mw, 4),
        shortfall_mw=round(shortfall_mw, 4),
        uncertainty_mw=round(uncertainty_mw, 4),
        potential_shortfall_mw=round(potential_shortfall_mw, 4),
        battery_available=battery_available,
        battery_usable_mw=round(battery_usable_mw, 4),
        backup_available=backup_available,
        backup_capacity_mw=round(backup_usable_mw, 4),
        reason=reason,
    )
