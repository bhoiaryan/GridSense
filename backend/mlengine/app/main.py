from fastapi import FastAPI
from app.api.decision import router as decision_router
from app.api.health import router as health_router
from app.api.risk import router as risk_router
from app.api.simulation import router as simulation_router

app = FastAPI(
    title="GridPilot ML Engine",
    description="GridPilot / GridSense AI Python ML Backend",
    version="0.1.0",
)

app.include_router(health_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(decision_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")


