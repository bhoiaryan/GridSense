import type {
  DashboardResponse,
  ForecastResponse,
  GatewayHealth,
  Recommendation,
  RiskEvent,
  RiskSummary,
  ScenarioInput,
  ScenarioResult,
  SiteInfo,
  SystemStatusItem,
} from "../types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Unable to reach the GridSense gateway. Check that the backend is running.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorPayload(payload) ? payload.error : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function isErrorPayload(payload: unknown): payload is { error: string } {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string";
}

function sitePath(siteId: string): string {
  return encodeURIComponent(siteId);
}

export const api = {
  getHealth: () => request<GatewayHealth>("/health"),
  getSites: () => request<SiteInfo[]>("/sites"),
  getSite: (siteId: string) => request<SiteInfo>(`/sites/${sitePath(siteId)}`),
  getForecast: (siteId: string, hours: 24 | 48 | 72 = 24) =>
    request<ForecastResponse>(`/forecast/${sitePath(siteId)}?hours=${hours}`),
  getRisk: (siteId: string) => request<RiskSummary>(`/risk/${sitePath(siteId)}`),
  getEvents: (siteId: string) => request<RiskEvent[]>(`/events/${sitePath(siteId)}`),
  getRecommendation: (siteId: string) => request<Recommendation>(`/recommendations/${sitePath(siteId)}`),
  simulate: (input: ScenarioInput) =>
    request<ScenarioResult>("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  getDashboard: (siteId: string) => request<DashboardResponse>(`/dashboard/${sitePath(siteId)}`),
  getSystemStatus: () => request<SystemStatusItem[]>("/system/status"),
};
