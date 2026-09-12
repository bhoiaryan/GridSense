"""API router for renewable grid what-if scenario simulations (Phase 9)."""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException

from app.schemas.simulation import ScenarioRequest, ScenarioResult
from app.services.simulation_service import SimulationService

router = APIRouter(tags=["Simulation & What-If"])


@router.post("/simulate", response_model=ScenarioResult)
def simulate_scenario_endpoint(request: ScenarioRequest) -> ScenarioResult:
    """Run what-if scenario simulation comparing baseline against modified parameters.

    Supports adjustments to cloud cover, power demand, and availability overrides
    for energy storage and auxiliary backup systems.
    """
    service = SimulationService()
    try:
        result = service.simulate_scenario(request)
        return result
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal scenario simulation error: {str(exc)}",
        )
