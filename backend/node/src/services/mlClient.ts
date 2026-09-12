import axios, { AxiosInstance } from "axios";
import { env } from "../config/env.js";
import
  {
    ForecastResponse,
    Recommendation,
    RiskEvent,
    ScenarioInput,
    ScenarioResult,
    SiteInfo,
    SystemStatusItem,
  } from "../types/index.js";
import { MockDataService } from "./mockDataService.js";

export class MLServiceClient
{
  private client: AxiosInstance;

  constructor()
  {
    this.client = axios.create({
      baseURL: env.ML_SERVICE_URL,
      timeout: 4000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async checkHealth(): Promise<{ status: "connected" | "offline"; error?: string }>
  {
    try
    {
      const response = await this.client.get("/api/health");
      if (response.status === 200)
      {
        return { status: "connected" };
      }
      return { status: "offline", error: `Unexpected status code: ${response.status}` };
    } catch (err: any)
    {
      return {
        status: "offline",
        error: err?.message || "Cannot reach Python ML Service",
      };
    }
  }

  async getSites(): Promise<SiteInfo[]>
  {
    try
    {
      const response = await this.client.get<SiteInfo[]>("/api/sites");
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn("[MLClient] Fallback: returning mock sites");
        return MockDataService.getSites();
      }
      throw err;
    }
  }

  async getSiteById(id: string): Promise<SiteInfo | null>
  {
    try
    {
      const response = await this.client.get<SiteInfo>(`/api/sites/${id}`);
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn(`[MLClient] Fallback: returning mock site ${id}`);
        return MockDataService.getSiteById(id);
      }
      throw err;
    }
  }

  async getForecast(siteId: string, hours: number): Promise<ForecastResponse>
  {
    try
    {
      const response = await this.client.get<ForecastResponse>(`/api/forecast/${siteId}`, {
        params: { hours },
      });
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn(`[MLClient] Fallback: returning mock forecast for site ${siteId} (${hours}h)`);
        return MockDataService.getForecast(siteId, hours);
      }
      throw err;
    }
  }

  async getRiskEvents(siteId: string): Promise<RiskEvent[]>
  {
    try
    {
      const response = await this.client.get<RiskEvent[]>(`/api/events/${siteId}`);
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn(`[MLClient] Fallback: returning mock risk events for site ${siteId}`);
        return MockDataService.getRiskEvents(siteId);
      }
      throw err;
    }
  }

  async getRecommendation(siteId: string): Promise<Recommendation>
  {
    try
    {
      const response = await this.client.get<Recommendation>(`/api/recommendations/${siteId}`);
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn(`[MLClient] Fallback: returning mock recommendation for site ${siteId}`);
        return MockDataService.getRecommendation(siteId);
      }
      throw err;
    }
  }

  async simulate(input: ScenarioInput): Promise<ScenarioResult>
  {
    try
    {
      const response = await this.client.post<ScenarioResult>("/api/simulate", input);
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        console.warn("[MLClient] Fallback: running mock simulation engine");
        return MockDataService.simulate(input);
      }
      throw err;
    }
  }

  async getSystemStatus(): Promise<SystemStatusItem[]>
  {
    try
    {
      const response = await this.client.get<SystemStatusItem[]>("/api/system/status");
      return response.data;
    } catch (err)
    {
      if (env.USE_MOCK_FALLBACK)
      {
        return MockDataService.getSystemStatus();
      }
      throw err;
    }
  }
}

export const mlClient = new MLServiceClient();

