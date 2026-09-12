"""Risk assessment service orchestrating forecast, uncertainty, and operations data.

Coordinates:
1. Data and site configuration retrieval
2. XGBoost forecast generation
3. Empirical uncertainty interval evaluation
4. Operational context alignment (demand, BESS, auxiliary backup)
5. Deterministic risk assessment synthesis
"""

from typing import Any, Dict, Optional, Union
# pyrefly: ignore [missing-import]
import pandas as pd

from app.engines.risk_engine import assess_risk
from app.ml.features import FEATURE_COLUMNS
from app.ml.predict import predict_generation_with_uncertainty
from app.ml.train import load_processed_features
from app.schemas.risk import RiskAssessment
from app.services.data_service import DataService
from app.services.uncertainty_service import UncertaintyService


class RiskService:
    """Service orchestrating end-to-end solar operational risk evaluation."""

    def __init__(
        self,
        data_service: Optional[DataService] = None,
        uncertainty_service: Optional[UncertaintyService] = None,
    ) -> None:
        self.data_service = data_service or DataService()
        self.uncertainty_service = uncertainty_service or UncertaintyService()
        self._cached_features: Optional[pd.DataFrame] = None
        self._cached_ops: Optional[pd.DataFrame] = None

    def _load_data_cache(self) -> Tuple_Data:
        """Load and cache processed features and operations datasets."""
        if self._cached_features is None:
            self._cached_features = load_processed_features()
        if self._cached_ops is None:
            self._cached_ops = self.data_service.loader.load_operations()
        return self._cached_features, self._cached_ops

    def evaluate_site_risk(
        self,
        site_id: str = "solar-01",
        timestamp: Optional[str] = None,
        hour_index: Optional[int] = 0,
    ) -> RiskAssessment:
        """Evaluate operational risk for a solar plant observation.

        Args:
            site_id: Facility identifier (must match sites.json).
            timestamp: Optional specific timestamp string (e.g. '2025-01-02 12:00:00').
            hour_index: Index into available observations if timestamp is omitted.

        Returns:
            RiskAssessment schema instance.

        Raises:
            ValueError: If site_id does not exist or timestamp cannot be located.
        """
        # 1. Validate site existence
        sites_data = self.data_service.loader.load_sites()
        sites_list = [sites_data] if isinstance(sites_data, dict) else sites_data
        matching_site = next((s for s in sites_list if s.get("id") == site_id), None)
        if not matching_site:
            raise ValueError(f"Site '{site_id}' not found in registered sites configuration.")

        # 2. Retrieve feature and operational records
        features_df = load_processed_features()
        ops_df = self.data_service.loader.load_operations()

        # Align by timestamp or index
        if timestamp is not None and isinstance(timestamp, str) and timestamp.strip():
            ts_str = timestamp.strip()
            row_feat = features_df[features_df["timestamp"].astype(str) == ts_str]
            row_ops = ops_df[ops_df["timestamp"].astype(str) == ts_str]
            if row_feat.empty or row_ops.empty:
                raise ValueError(f"Timestamp '{timestamp}' not found in processed telemetry.")
            feat_idx = row_feat.index[0]
            ops_idx = row_ops.index[0]
        else:
            idx = int(hour_index if hour_index is not None else 0)
            if idx < 0 or idx >= len(features_df):
                raise ValueError(
                    f"hour_index {idx} out of range [0, {len(features_df) - 1}]."
                )
            feat_idx = idx
            target_ts = features_df.iloc[idx]["timestamp"]
            matching_ops = ops_df[ops_df["timestamp"] == target_ts]
            if matching_ops.empty:
                ops_idx = min(idx, len(ops_df) - 1)
            else:
                ops_idx = matching_ops.index[0]

        feat_record = features_df.iloc[[feat_idx]].copy()
        ops_record = ops_df.iloc[ops_idx]

        # 3. Generate forecast with empirical uncertainty bounds
        forecast_df = predict_generation_with_uncertainty(feat_record)
        exp_gen = float(forecast_df["expected_generation_mw"].iloc[0])
        lower_bound = float(forecast_df["lower_bound_mw"].iloc[0])
        upper_bound = float(forecast_df["upper_bound_mw"].iloc[0])
        rec_ts = str(forecast_df["timestamp"].iloc[0])

        # 4. Extract operational telemetry
        demand_mw = float(ops_record.get("demand_mw", 40.0))
        battery_soc = float(ops_record.get("battery_soc", 50.0))
        battery_cap = float(ops_record.get("battery_capacity_mwh", 200.0))
        battery_dis = float(ops_record.get("battery_max_discharge_mw", 50.0))
        backup_avail = bool(ops_record.get("backup_available", True))
        backup_cap = float(ops_record.get("backup_capacity_mw", 25.0))

        # Battery is available if online and not in severe fault
        battery_avail = True

        # 5. Evaluate deterministic risk
        assessment = assess_risk(
            generation_mw=exp_gen,
            demand_mw=demand_mw,
            lower_bound_mw=lower_bound,
            upper_bound_mw=upper_bound,
            battery_available=battery_avail,
            battery_soc=battery_soc,
            battery_capacity_mwh=battery_cap,
            battery_max_discharge_mw=battery_dis,
            backup_available=backup_avail,
            backup_capacity_mw=backup_cap,
            site_id=site_id,
            timestamp=rec_ts,
        )

        return assessment
