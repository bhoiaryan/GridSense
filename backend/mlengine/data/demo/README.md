# GridPilot Synthetic Demo Dataset

> **DISCLAIMER**: All datasets in this directory (`sites.json`, `generation.csv`, `weather.csv`, `operations.csv`) contain purely **synthetic / simulated demo data**. This data is designed for development, architecture demonstration, and testing the GridPilot ML intelligence pipeline. It does not represent real-world measured power plant telemetry or actual sensor readings, and no claims of real-world accuracy are made.

---

## 1. Overview & Plant Specifications

- **Site ID**: `solar-01`
- **Facility Name**: Solar Plant 01
- **Location**: Demo Location (Subtropical latitude 28.0° N)
- **Technology**: Solar Photovoltaic (PV)
- **Installed Capacity**: 100 MW (AC rated)
- **Battery Energy Storage System (BESS)**: 200 MWh capacity / 50 MW max discharge rate
- **Backup Generation System**: 25 MW capacity (auxiliary generator / reserve)
- **Time Resolution**: Hourly observations (`1h` interval)
- **Time Period**: Full calendar year 2025 (8,760 consecutive hourly records from `2025-01-01 00:00:00` to `2025-12-31 23:00:00`)
- **Reproducibility**: Deterministically generated using a fixed random seed (`seed=42`).

---

## 2. File Descriptions & Schema

### A. `sites.json`
Configuration metadata for the demo solar facility.

| Key | Type | Description |
|---|---|---|
| `id` | string | Unique site identifier (`solar-01`) |
| `name` | string | Facility display name (`Solar Plant 01`) |
| `location` | string | Geographic / descriptive location (`Demo Location`) |
| `technology` | string | Generation technology type (`solar`) |
| `capacity_mw` | number | Total nameplate installed DC/AC capacity (`100` MW) |

### B. `generation.csv`
Historical solar power output time series.

| Column | Type | Unit | Description |
|---|---|---|---|
| `timestamp` | string (`YYYY-MM-DD HH:MM:SS`) | UTC / Local | Chronological hourly observation timestamp |
| `site_id` | string | - | Unique identifier matching `sites.json` (`solar-01`) |
| `generation_mw` | float | MW | Net active solar power generation output. Strictly non-negative, zeroes at night, solar diurnal curve peaking midday up to rated capacity (100 MW). |

### C. `weather.csv`
Meteorological observations aligned hourly with generation records.

| Column | Type | Unit | Description |
|---|---|---|---|
| `timestamp` | string (`YYYY-MM-DD HH:MM:SS`) | UTC / Local | Chronological hourly observation timestamp |
| `cloud_cover` | float | % | Total cloud cover percentage ranging from `0.0` (completely clear sky) to `100.0` (overcast) |
| `temperature` | float | °C | Ambient outdoor temperature showing seasonal swings (winter to summer) and daily diurnal variations |
| `irradiance` | float | W/m² | Global Horizontal Irradiance (GHI). Zero during darkness/night, peaking midday based on solar elevation, attenuated realistically by cloud cover |

### D. `operations.csv`
Grid operations, facility demand, storage status, and reserve system conditions.

| Column | Type | Unit | Description |
|---|---|---|---|
| `timestamp` | string (`YYYY-MM-DD HH:MM:SS`) | UTC / Local | Chronological hourly observation timestamp |
| `demand_mw` | float | MW | Power load / demand required by the contracted grid or microgrid network |
| `battery_soc` | float | % | Battery State of Charge (SOC) from `0.0%` (empty) to `100.0%` (fully charged), charged by solar surplus and discharged during demand deficits |
| `battery_capacity_mwh` | float | MWh | Total nameplate energy storage capacity (`200.0` MWh) |
| `battery_max_discharge_mw` | float | MW | Maximum discharge power capability of the battery system (`50.0` MW) |
| `backup_available` | boolean | - | `True` when auxiliary backup generation is operational; `False` during maintenance windows or outages |
| `backup_capacity_mw` | float | MW | Available auxiliary backup capacity (`25.0` MW when available, `0.0` MW during outages) |

---

## 3. How the Data Will Be Used in Later ML Phases

This synthetic dataset serves as the foundational substrate for downstream intelligence engines:

1. **Feature Engineering**:
   - Extraction of cyclical temporal features (hour of day, day of year, day of week).
   - Solar geometry proxies (solar zenith angle, clear-sky index).
   - Lagged features (lagged generation, rolling irradiance means, cloud cover deltas).

2. **XGBoost Solar Generation Forecasting**:
   - Model training to predict `generation_mw` from forecasted weather (`irradiance`, `cloud_cover`, `temperature`) and temporal features.
   - Cross-validation and evaluation across train/validation/test temporal splits.

3. **Operational Decision & Risk Engine**:
   - Evaluation of net power balance: `Net = Generation - Demand`.
   - Identification of **Surplus conditions** (charging battery / curtailment scenarios).
   - Identification of **Shortfall with Battery** (battery discharging within limits to bridge deficit).
   - Identification of **Shortfall without Battery** (depleted battery requiring reserve / backup dispatch).
   - Validation of fallback logic when `backup_available` is `False`.

---

## 4. Solar Forecast Uncertainty Methodology (Phase 6)

1. **What Uncertainty Means**: Solar power generation is naturally intermittent and subject to atmospheric fluctuations (cloud dynamics, aerosol changes). Point forecasts provide a single expected value ($\hat{y}$), but grid dispatchers need uncertainty bounds ($[\text{lower}, \text{upper}]$) to reserve adequate battery and auxiliary backup capacity.
2. **Residual-Based Prediction Intervals**: The uncertainty delta is derived from historical model residuals ($e_t = |y_t - \hat{y}_t|$) on the held-out validation set. Taking the 90th percentile of absolute validation errors ($\Delta_{90}$) yields an empirical uncertainty margin:
   $$\text{lower} = \max(0, \hat{y} - \Delta_{90})$$
   $$\text{upper} = \min(\text{capacity}, \hat{y} + \Delta_{90})$$
3. **Nighttime Solar Handling**: Solar panels cannot produce energy in darkness. Raw symmetric intervals would produce negative lower bounds at night, which is physically impossible. The uncertainty service strictly clamps lower bounds at $0.0\text{ MW}$, maintaining physical validity.
4. **Empirical vs. Formally Calibrated**: This interval is an operational, empirical band grounded in validation error distributions. It is not claimed to be a formally calibrated conformal prediction interval.
5. **Strict Data Separation (No Leakage)**: The error threshold ($\Delta_{90} \approx 0.59\text{ MW}$) is fitted **exclusively on validation data**. The test set is evaluated post-hoc to measure real-world coverage ($91.15\%$) without ever leaking into threshold tuning.
