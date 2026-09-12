"""API router for solar operational risk assessment."""

from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Query

from app.schemas.risk import RiskAssessment
from app.services.risk_service import RiskService

router = APIRouter(tags=["Risk"])


@router.get("/risk/{site_id}", response_model=RiskAssessment)
def get_site_risk(
    site_id: str,
    timestamp: Optional[str] = None,
    hour_index: int = 0,
) -> RiskAssessment:
    """Evaluate explainable operational risk (LOW, MEDIUM, HIGH) for a solar plant.

    Combines forecast generation, empirical uncertainty intervals, and operational
    telemetry (demand, BESS capacity, auxiliary generator status).
    """
    service = RiskService()
    try:
        assessment = service.evaluate_site_risk(
            site_id=site_id,
            timestamp=timestamp,
            hour_index=hour_index,
        )
        return assessment
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal risk calculation error: {str(exc)}",
        )
