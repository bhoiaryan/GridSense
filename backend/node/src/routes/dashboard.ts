import { Request, Response, Router } from "express";
import { MockDataService } from "../services/mockDataService.js";
import { mlClient } from "../services/mlClient.js";
import { resolveSiteId } from "../utils/siteResolver.js";

const router = Router();

router.get("/dashboard/:site_id", async (req: Request, res: Response) =>
{
  const rawSiteId = Array.isArray(req.params.site_id) ? req.params.site_id[0] : req.params.site_id;
  if (!rawSiteId)
  {
    return res.status(400).json({ error: "Missing site_id parameter" });
  }
  const siteId = resolveSiteId(rawSiteId);

  try
  {
    // Check if ML service is reachable
    const mlHealth = await mlClient.checkHealth();

    if (mlHealth.status === "connected")
    {
      // Parallel fetch from ML Service
      const [site, forecastRes, riskEvents, recommendation, systemStatus] = await Promise.all([
        mlClient.getSiteById(siteId),
        mlClient.getForecast(siteId, 24),
        mlClient.getRiskEvents(siteId),
        mlClient.getRecommendation(siteId),
        mlClient.getSystemStatus(),
      ]);

      if (!site)
      {
        return res.status(404).json({ error: `Site '${siteId}' not found` });
      }

      return res.json({
        site,
        kpis: MockDataService.getKpis(),
        currentForecast: forecastRes.forecast,
        riskEvents,
        recommendation,
        systemStatus,
        meta: {
          source: "ml_service",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Otherwise use graceful mock data
    const dashboardPayload = MockDataService.getDashboard(siteId);
    return res.json(dashboardPayload);
  } catch (error: any)
  {
    console.error("[Dashboard] Error building dashboard response:", error);
    // Fallback to mock data on unhandled error to maintain dashboard availability
    return res.json(MockDataService.getDashboard(siteId));
  }
});

export default router;

