"""Decision and recommendation service orchestrating full intelligence pipeline.

Synthesizes:
1. Site verification and telemetry retrieval
2. XGBoost forecast generation and uncertainty bands
3. Power balance (surplus / shortfall) and deterministic risk evaluation
4. Energy storage state of charge and battery inverter limits
5. Auxiliary backup generation and grid interconnection policies
6. Deterministic operational dispatch recommendations
"""

from typing import Optional
# pyrefly: ignore [missing-import]
import pandas as pd

from app.core.constants import BATTERY_MAX_CHARGE_MW
from app.engines.decision_engine import assess_decision
from app.schemas.decision import OperationalDecision
from app.services.data_service import DataService
from app.services.risk_service import RiskService


class DecisionService:
    """Service orchestrating end-to-end solar operational dispatch recommendations."""

    def __init__(
        self,
        data_service: Optional[DataService] = None,
        risk_service: Optional[RiskService] = None,
    ) -> None:
        self.data_service = data_service or DataService()
        self.risk_service = risk_service or RiskService(data_service=self.data_service)

    def evaluate_site_decision(
        self,
        site_id: str = "solar-01",
        timestamp: Optional[str] = None,
        hour_index: Optional[int] = 0,
        grid_import_available: Optional[bool] = None,
        grid_export_available: Optional[bool] = None,
    ) -> OperationalDecision:
        """Evaluate operational conditions and return a deterministic dispatch recommendation.

        Args:
            site_id: Facility identifier (e.g. 'solar-01').
            timestamp: Specific observation timestamp string.
            hour_index: Index into available observations if timestamp omitted.
            grid_import_available: Optional flag to override grid import capability.
            grid_export_available: Optional flag to override grid export capability.

        Returns:
            OperationalDecision schema instance.

        Raises:
            ValueError: If site_id is unregistered or timestamp cannot be located.
        """
        # 1. Evaluate upstream risk assessment (covers site validation, forecast & uncertainty)
        risk_assessment = self.risk_service.evaluate_site_risk(
            site_id=site_id,
            timestamp=timestamp,
            hour_index=hour_index,
        )

        # 2. Extract operational state telemetry
        ops_df = self.data_service.loader.load_operations()
        target_ts = str(risk_assessment.timestamp)

        row_ops = ops_df[ops_df["timestamp"].astype(str) == target_ts]
        if not row_ops.empty:
            ops_record = row_ops.iloc[0]
        else:
            idx = int(hour_index if hour_index is not None else 0)
            idx = max(0, min(idx, len(ops_df) - 1))
            ops_record = ops_df.iloc[idx]

        battery_soc = float(ops_record.get("battery_soc", 50.0))
        battery_cap = float(ops_record.get("battery_capacity_mwh", 200.0))
        battery_dis = float(ops_record.get("battery_max_discharge_mw", 50.0))
        battery_chg = BATTERY_MAX_CHARGE_MW
        backup_avail = bool(ops_record.get("backup_available", True))
        backup_cap = float(ops_record.get("backup_capacity_mw", 25.0))
        battery_avail = bool(risk_assessment.battery_available)

        # 3. Assess deterministic operational decision
        decision = assess_decision(
            generation_mw=risk_assessment.generation_mw,
            demand_mw=risk_assessment.demand_mw,
            lower_bound_mw=risk_assessment.lower_bound_mw,
            upper_bound_mw=risk_assessment.upper_bound_mw,
            risk_level=risk_assessment.risk_level,
            battery_available=battery_avail,
            battery_soc=battery_soc,
            battery_capacity_mwh=battery_cap,
            battery_max_charge_mw=battery_chg,
            battery_max_discharge_mw=battery_dis,
            backup_available=backup_avail,
            backup_capacity_mw=backup_cap,
            grid_import_available=grid_import_available,
            grid_export_available=grid_export_available,
            site_id=site_id,
            timestamp=risk_assessment.timestamp,
        )

        return decision

    # Semantic alias
    evaluate_site_recommendation = evaluate_site_decision


# Semantic alias for the service
RecommendationService = DecisionService
