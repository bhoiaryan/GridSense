"""Surplus detection engine for GridPilot.

Calculates active solar generation surplus over contracted demand:
surplus_mw = max(forecast_generation_mw - demand_mw, 0)
"""

from typing import Dict, Union
# pyrefly: ignore [missing-import]
import numpy as np

from app.schemas.risk import SurplusResult, SurplusStatus


def calculate_surplus(
    forecast_generation_mw: Union[float, int],
    demand_mw: Union[float, int],
) -> SurplusResult:
    """Calculate deterministic generation surplus over demand.

    Args:
        forecast_generation_mw: Expected solar generation output (MW).
        demand_mw: Contracted demand load (MW).

    Returns:
        SurplusResult with status, generation, demand, and surplus_mw.
    """
    gen = max(0.0, float(forecast_generation_mw))
    dem = max(0.0, float(demand_mw))

    surplus_mw = max(0.0, gen - dem)

    if gen > dem:
        status = SurplusStatus.SURPLUS
    elif np.isclose(gen, dem, atol=1e-5):
        status = SurplusStatus.BALANCED
    else:
        status = SurplusStatus.NO_SURPLUS

    return SurplusResult(
        status=status,
        generation_mw=round(gen, 4),
        demand_mw=round(dem, 4),
        surplus_mw=round(surplus_mw, 4),
    )
