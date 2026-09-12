"""API router for operational decisions and dispatch recommendations."""

from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException

from app.schemas.decision import OperationalDecision
from app.services.decision_service import DecisionService

router = APIRouter(tags=["Decisions & Recommendations"])


@router.get("/decisions/{site_id}", response_model=OperationalDecision)
@router.get("/recommendations/{site_id}", response_model=OperationalDecision)
def get_site_decision(
    site_id: str,
    timestamp: Optional[str] = None,
    hour_index: int = 0,
    grid_import: Optional[bool] = None,
    grid_export: Optional[bool] = None,
) -> OperationalDecision:
    """Evaluate deterministic operational dispatch decisions and recommendations.

    Synthesizes forecast, uncertainty bounds, surplus/shortfall balance, risk classification,
    battery storage limits, and auxiliary backup availability.
    """
    service = DecisionService()
    try:
        decision = service.evaluate_site_decision(
            site_id=site_id,
            timestamp=timestamp,
            hour_index=hour_index,
            grid_import_available=grid_import,
            grid_export_available=grid_export,
        )
        return decision
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal decision calculation error: {str(exc)}",
        )
