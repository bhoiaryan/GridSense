from pydantic import BaseModel
from typing import List, Optional

class SiteInfoSchema(BaseModel):
    id: str
    name: str
    location: str
    technology: str
    capacityMw: float
    currentGenerationMw: float
    batterySoc: float
    batteryCapacityMwh: float
    chargeLimitMw: float
    dischargeLimitMw: float
    backupAvailable: bool
    backupCapacityMw: float

class ForecastPointSchema(BaseModel):
    hour: str
    timestamp: str
    dayLabel: Optional[str] = None
    fullTimeLabel: Optional[str] = None
    historical: Optional[float] = None
    expected: float
    lower: float
    upper: float
    demand: float
    cloudCover: int
    irradiance: int
    temperature: Optional[float] = None
    windSpeed: Optional[float] = None
    humidity: Optional[int] = None
    confidenceScore: Optional[int] = None
    risk: str
    weatherDriver: Optional[str] = None
    explanation: Optional[str] = None

class ForecastResponseSchema(BaseModel):
    site_id: str
    horizon_hours: int
    total_points: int
    forecast: List[ForecastPointSchema]

class KpiSchema(BaseModel):
    label: str
    value: str
    detail: str
    trend: str
    status: str = "OK"

class RiskEventSchema(BaseModel):
    id: str
    risk: str
    type: str
    window: str
    expectedImpact: str
    problem: str

class RecommendationSchema(BaseModel):
    action: str
    reason: str
    expectedImpact: str
    constraints: List[str]

class ScenarioInputSchema(BaseModel):
    cloudCoverChange: float = 0.0
    demandChange: float = 0.0
    batteryAvailable: bool = True
    backupAvailable: bool = True

class ScenarioResultSchema(BaseModel):
    generationMw: float
    shortfallMwh: float
    risk: str
    recommendation: str
    explanation: str

class SystemStatusItemSchema(BaseModel):
    label: str
    status: str
    detail: str

