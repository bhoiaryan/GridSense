"""Shortfall detection engine for GridPilot.

Calculates active solar generation shortfall under contracted demand:
shortfall_mw = max(demand_mw - forecast_generation_mw, 0)
"""

from typing import Dict, Union
# pyrefly: ignore [missing-import]
import numpy as np

from app.schemas.risk import ShortfallResult, ShortfallStatus


def calculate_shortfall(
    forecast_generation_mw: Union[float, int],
    demand_mw: Union[float, int],
) -> ShortfallResult:
    """Calculate deterministic generation shortfall under demand.

    Args:
        forecast_generation_mw: Expected solar generation output (MW).
        demand_mw: Contracted demand load (MW).

    Returns:
        ShortfallResult with status, generation, demand, and shortfall_mw.
    """
    gen = max(0.0, float(forecast_generation_mw))
    dem = max(0.0, float(demand_mw))

    shortfall_mw = max(0.0, dem - gen)

    if gen < dem:
        status = ShortfallStatus.SHORTFALL
    elif np.isclose(gen, dem, atol=1e-5):
        status = ShortfallStatus.BALANCED
    else:
        status = ShortfallStatus.NO_SHORTFALL

    return ShortfallResult(
        status=status,
        generation_mw=round(gen, 4),
        demand_mw=round(dem, 4),
        shortfall_mw=round(shortfall_mw, 4),
    )
