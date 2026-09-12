# GridSense AI Data Pack

This package is the initial MVP data layer for GridSense AI.

## Important
The included generation/weather/operations records are **synthetic demo data**.
They are designed for development, UI integration, testing, and ML pipeline prototyping.
They must NOT be presented as real measured power-plant data or as evidence of model accuracy.

## Files
- `demo/sites.csv` — site metadata, capacity, battery and backup parameters.
- `raw/generation_weather.csv` — hourly synthetic generation + weather + demand.
- `demo/operations.csv` — hourly battery SOC and backup fields.
- `processed/grid_features.csv` — merged feature/decision dataset.
- `processed/training_data.csv` — training-ready rows with next-hour generation target.
- `demo/forecast_72h.csv` — 72-hour frontend demo slice for SITE_001.

## Core columns
- `site_id`, `timestamp`
- `generation_mw`, `demand_mw`
- `irradiance_w_m2`, `temperature_c`, `humidity_pct`
- `wind_speed_m_s`, `cloud_cover_pct`
- `battery_soc_mwh`, `battery_soc_pct`
- `backup_available_mw`, `estimated_unserved_mw`
- `surplus_mw`, `shortfall_mw`, `risk_level`
- `target_generation_next_hour_mw`

## Next step
Replace or augment the synthetic training data with a real public solar-generation/weather dataset.
Keep this demo pack so the application remains runnable without external APIs.
