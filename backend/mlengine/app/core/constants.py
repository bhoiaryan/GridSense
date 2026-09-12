"""Configurable operational constants and risk thresholds for GridPilot.

These thresholds govern surplus, shortfall, and risk classification across
the solar intelligence pipeline. They represent realistic operational
parameters for demo microgrid and plant dispatch scenarios.
"""

# --- Battery Storage Operational Parameters ---
# Minimum state of charge (%) retained as emergency reserve; discharge is restricted below this.
BATTERY_MIN_RESERVE_SOC_PCT: float = 10.0

# Threshold below which battery state of charge (%) is classified as low / constrained.
BATTERY_LOW_SOC_PCT: float = 25.0

# Maximum state of charge (%) for full charge.
BATTERY_MAX_SOC_PCT: float = 100.0

# Nameplate maximum charging power (MW) for the 200 MWh BESS.
BATTERY_MAX_CHARGE_MW: float = 50.0

# Round-trip discharge efficiency factor for the 200 MWh BESS.
BATTERY_DISCHARGE_EFFICIENCY: float = 0.94


# --- Shortfall Severity Thresholds (MW) ---
# Absolute generation deficit (MW) above which a shortfall is considered severe.
SHORTFALL_SEVERE_MW: float = 20.0

# Minor generation deficit threshold (MW) below which shortfalls are considered marginal.
SHORTFALL_MARGINAL_MW: float = 1.0


# --- Uncertainty Risk Thresholds ---
# Ratio of potential shortfall under lower bound to demand triggering elevated risk.
UNCERTAINTY_SHORTFALL_RATIO_THRESHOLD: float = 0.05


# --- Grid Interconnection Defaults ---
# Default policy on whether external grid import is supported when local resources are exhausted.
GRID_IMPORT_SUPPORTED: bool = False

# Default policy on whether surplus solar energy can be exported to the external grid.
GRID_EXPORT_SUPPORTED: bool = False

