import
  {
    DashboardResponse,
    ForecastPoint,
    ForecastResponse,
    Kpi,
    Recommendation,
    RiskEvent,
    ScenarioInput,
    ScenarioResult,
    SiteInfo,
    SystemStatusItem,
  } from "../types/index.js";

export class MockDataService
{
  private static siteInfo: SiteInfo = {
    id: "solar-01",
    name: "Dharampur Solar Park",
    location: "Gujarat, India",
    technology: "Utility-scale solar PV",
    capacityMw: 120,
    currentGenerationMw: 72.4,
    batterySoc: 68,
    batteryCapacityMwh: 54,
    chargeLimitMw: 18,
    dischargeLimitMw: 22,
    backupAvailable: true,
    backupCapacityMw: 16,
  };

  private static generatePoints(count: number): ForecastPoint[]
  {
    const points: ForecastPoint[] = [];
    const baseDate = new Date();
    baseDate.setMinutes(0, 0, 0);

    for (let i = 0; i < count; i++)
    {
      const pointTime = new Date(baseDate.getTime() + i * 3600 * 1000);
      const hourVal = pointTime.getHours();
      const hourStr = `${hourVal.toString().padStart(2, "0")}:00`;
      const dayIndex = Math.floor(i / 24);
      const dayLabel = dayIndex === 0 ? "Today" : dayIndex === 1 ? "Tomorrow" : "Day 3";

      // Solar generation bell curve peaking around 12:00 - 13:00
      let solarFactor = 0;
      if (hourVal >= 6 && hourVal <= 18)
      {
        solarFactor = Math.sin(((hourVal - 6) / 12) * Math.PI);
      }

      // In evening (17:00 - 20:00) cloud cover increases in demo scenario
      const cloudCover = hourVal >= 14 && hourVal <= 19 ? Math.min(85, 30 + (hourVal - 13) * 10) : 20 + Math.sin(i) * 10;
      const cloudAttenuation = 1 - (cloudCover / 100) * 0.65;

      const maxGen = MockDataService.siteInfo.capacityMw;
      const expected = Number(Math.max(0, solarFactor * maxGen * cloudAttenuation * 0.9).toFixed(1));
      const spread = expected > 0 ? Number((expected * 0.12).toFixed(1)) : 0;
      const lower = Math.max(0, Number((expected - spread).toFixed(1)));
      const upper = Math.min(maxGen, Number((expected + spread).toFixed(1)));

      // Demand profile (peaks morning 09:00 and evening 19:00)
      let demand = 40;
      if (hourVal >= 8 && hourVal <= 11) demand = 75;
      else if (hourVal >= 17 && hourVal <= 21) demand = 88;
      else if (hourVal >= 12 && hourVal <= 16) demand = 65;

      // Detect shortfall & risk
      let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      let weatherDriver = "Clear solar irradiance";
      let explanation = "Generation balances grid demand within normal operating limits.";

      if (hourVal >= 17 && hourVal <= 20)
      {
        risk = "HIGH";
        weatherDriver = "Evening solar drop + cloud formation";
        explanation = `Solar output dropping to ${expected} MW while evening demand peaks at ${demand} MW, causing an estimated net deficit.`;
      } else if (expected < demand * 0.5 && hourVal >= 7 && hourVal <= 16)
      {
        risk = "MEDIUM";
        weatherDriver = "Localized cloud cover";
        explanation = "Moderate cloud attenuation reducing expected generation below peak.";
      }

      points.push({
        hour: hourStr,
        timestamp: pointTime.toISOString(),
        dayLabel,
        fullTimeLabel: `${dayLabel} ${hourStr}`,
        historical: i < 6 ? Math.max(0, expected + (Math.sin(i) * 2)) : undefined,
        expected,
        lower,
        upper,
        demand,
        cloudCover: Math.round(cloudCover),
        irradiance: Math.round(solarFactor * 850 * cloudAttenuation),
        temperature: Number((24 + Math.sin((hourVal - 6) / 4) * 8).toFixed(1)),
        windSpeed: Number((3.2 + Math.cos(i) * 1.5).toFixed(1)),
        humidity: Math.round(55 + Math.sin(i) * 15),
        confidenceScore: risk === "HIGH" ? 78 : 94,
        risk,
        weatherDriver,
        explanation,
      });
    }

    return points;
  }

  public static getSites(): SiteInfo[]
  {
    return [this.siteInfo];
  }

  public static getSiteById(id: string): SiteInfo | null
  {
    if (id === this.siteInfo.id)
    {
      return this.siteInfo;
    }
    return null;
  }

  public static getForecast(siteId: string, hours: number = 24): ForecastResponse
  {
    const validHours = [24, 48, 72].includes(hours) ? hours : 24;
    const points = this.generatePoints(validHours);
    return {
      site_id: siteId,
      horizon_hours: validHours,
      total_points: points.length,
      forecast: points,
    };
  }

  public static getRiskEvents(siteId: string): RiskEvent[]
  {
    return [
      {
        id: "risk-evt-01",
        risk: "HIGH",
        type: "SHORTFALL",
        window: "Today 18:00 - 20:00",
        expectedImpact: "Projected net energy shortfall of ~16.8 MWh during evening peak demand.",
        problem: "Rapid solar ramp-down combined with 75% afternoon cloud cover creates generation deficit before base grid compensation.",
      },
      {
        id: "risk-evt-02",
        risk: "MEDIUM",
        type: "UNCERTAINTY",
        window: "Tomorrow 14:00 - 16:00",
        expectedImpact: "Uncertainty spread expands to ±14 MW due to intermittent cumulus cloud formation.",
        problem: "High variance in localized irradiance forecast requiring spinning reserve readiness.",
      },
    ];
  }

  public static getRecommendation(siteId: string): Recommendation
  {
    return {
      action: "DISCHARGE_STORAGE",
      reason: "Anticipated solar generation drop below evening demand threshold (18:00–20:00). Battery state of charge is optimal at 68%.",
      expectedImpact: "Discharging 20 MW over 2 hours covers 95% of the projected deficit, avoiding costly diesel backup activation and spot grid import penalties.",
      constraints: [
        "Maintain battery reserve floor above 15% SoC (minimum 8.1 MWh).",
        "Discharge rate clamped to max inverter limit (22 MW).",
        "Keep 16 MW auxiliary diesel backup on standby if shortfall exceeds 2 hours.",
      ],
    };
  }

  public static getKpis(): Kpi[]
  {
    return [
      {
        label: "Current Generation",
        value: "72.4 MW",
        detail: "60.3% of 120 MW rated capacity",
        trend: "+4.2 MW vs previous hour",
        status: "OK",
      },
      {
        label: "Day-Ahead Peak Output",
        value: "94.8 MW",
        detail: "Expected window: 12:00 - 13:30",
        trend: "Uncertainty range: 89 - 99 MW",
        status: "OK",
      },
      {
        label: "Projected Shortfall",
        value: "16.8 MWh",
        detail: "High-risk window: 18:00 - 20:00",
        trend: "Requires 18.5 MW battery discharge",
        status: "HIGH",
      },
      {
        label: "Battery Readiness",
        value: "68% SoC",
        detail: "36.7 MWh usable storage available",
        trend: "Discharge ready at 22 MW max",
        status: "OK",
      },
    ];
  }

  public static getSystemStatus(): SystemStatusItem[]
  {
    return [
      { label: "Data Pipeline", status: "Operational", detail: "Telemetry polling active at 1-min frequency" },
      { label: "Forecast Engine (XGBoost)", status: "Operational", detail: "Model v1.02 inference latency 14ms" },
      { label: "Risk Engine", status: "Operational", detail: "Shortfall & surplus thresholds monitoring active" },
      { label: "Decision Engine", status: "Operational", detail: "Rule-based recommendation synthesizer online" },
    ];
  }

  public static simulate(input: ScenarioInput): ScenarioResult
  {
    // Deterministic simulation math aligned with backend.md section 19
    const baseGen = 52.0;
    const cloudFactor = 1 - (input.cloudCoverChange / 100) * 0.7;
    const simulatedGen = Math.max(5.0, Number((baseGen * cloudFactor).toFixed(1)));

    const baseDemand = 80.0;
    const simulatedDemand = Number((baseDemand * (1 + input.demandChange / 100)).toFixed(1));
    const deficit = Math.max(0, Number((simulatedDemand - simulatedGen).toFixed(1)));

    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let recommendation = "NO_ACTION";
    let explanation = "";

    if (deficit === 0)
    {
      risk = "LOW";
      recommendation = "NO_ACTION";
      explanation = `Solar generation (${simulatedGen} MW) matches or exceeds demand (${simulatedDemand} MW). Grid balance maintained without intervention.`;
    } else if (input.batteryAvailable && deficit <= 22)
    {
      risk = deficit > 15 ? "HIGH" : "MEDIUM";
      recommendation = "DISCHARGE_STORAGE";
      explanation = `Shortfall of ${deficit} MW detected. Battery is available and can deliver up to 22 MW discharge, completely mitigating the deficit.`;
    } else if (input.batteryAvailable && deficit > 22 && input.backupAvailable)
    {
      risk = "HIGH";
      recommendation = "DISCHARGE_STORAGE_AND_BACKUP";
      explanation = `Shortfall of ${deficit} MW exceeds single battery discharge limit (22 MW). Recommended joint dispatch: maximum battery discharge (22 MW) plus secondary backup activation.`;
    } else if (!input.batteryAvailable && input.backupAvailable)
    {
      risk = "HIGH";
      recommendation = "ACTIVATE_BACKUP";
      explanation = `Battery storage unavailable. Backup generators can provide up to 16 MW capacity to cover deficit of ${deficit} MW.`;
    } else
    {
      risk = "HIGH";
      recommendation = "CRITICAL_SHORTFALL_GRID_IMPORT";
      explanation = `Neither battery storage nor backup generation is available to meet the ${deficit} MW deficit. Immediate grid import or emergency demand response required.`;
    }

    return {
      generationMw: simulatedGen,
      shortfallMwh: deficit,
      risk,
      recommendation,
      explanation,
    };
  }

  public static getDashboard(siteId: string): DashboardResponse
  {
    const forecast = this.generatePoints(24);
    return {
      site: this.siteInfo,
      kpis: this.getKpis(),
      currentForecast: forecast,
      riskEvents: this.getRiskEvents(siteId),
      recommendation: this.getRecommendation(siteId),
      systemStatus: this.getSystemStatus(),
      meta: {
        source: "mock_fallback",
        timestamp: new Date().toISOString(),
      },
    };
  }
}

