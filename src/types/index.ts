export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type SiteStatus = "Operational" | "Degraded" | "Unavailable";

export type ForecastHorizon = "24h" | "48h" | "72h";

export interface ForecastPoint {
  hour: string;
  timestamp: string;
  dayLabel?: string;
  fullTimeLabel?: string;
  historical?: number;
  expected: number;
  lower: number;
  upper: number;
  demand: number;
  cloudCover: number;
  irradiance: number; // Global Horizontal Irradiance in W/m²
  temperature?: number; // °C
  windSpeed?: number; // m/s
  humidity?: number; // %
  confidenceScore?: number; // 0-100%
  risk: RiskLevel;
  weatherDriver?: string;
  explanation?: string;
}

export interface Kpi {
  label: string;
  value: string;
  detail: string;
  trend: string;
  status?: RiskLevel | "OK";
}

export interface RiskEvent {
  id: string;
  risk: RiskLevel;
  type: "SHORTFALL" | "SURPLUS" | "UNCERTAINTY";
  window: string;
  expectedImpact: string;
  problem: string;
}

export interface Recommendation {
  action: string;
  reason: string;
  expectedImpact: string;
  constraints: string[];
}

export interface SystemStatusItem {
  label: string;
  status: SiteStatus;
  detail: string;
}

export interface ScenarioInput {
  cloudCoverChange: number;
  demandChange: number;
  batteryAvailable: boolean;
  backupAvailable: boolean;
}

export interface ScenarioResult {
  generationMw: number;
  shortfallMwh: number;
  risk: RiskLevel;
  recommendation: string;
  explanation: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  location: string;
  technology: string;
  capacityMw: number;
  currentGenerationMw: number;
  batterySoc: number;
  batteryCapacityMwh: number;
  chargeLimitMw: number;
  dischargeLimitMw: number;
  backupAvailable: boolean;
  backupCapacityMw: number;
}
