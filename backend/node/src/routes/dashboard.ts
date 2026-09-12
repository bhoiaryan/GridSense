import { Request, Response, Router } from "express";
import { MockDataService } from "../services/mockDataService.js";
import { env } from "../config/env.js";
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
      const [site, forecastRes, kpis, riskEvents, recommendation, systemStatus] = await Promise.all([
        mlClient.getSiteById(siteId),
        mlClient.getForecast(siteId, 24),
        mlClient.getDashboardKpis(siteId),
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
        kpis,
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

    if (env.USE_MOCK_FALLBACK)
    {
      return res.json(MockDataService.getDashboard(siteId));
    }

    return res.status(503).json({
      error: "ML service unavailable. Dashboard data cannot be generated.",
      details: mlHealth.error,
    });
  } catch (error: any)
  {
    console.error("[Dashboard] Error building dashboard response:", error);
    if (env.USE_MOCK_FALLBACK)
    {
      return res.json(MockDataService.getDashboard(siteId));
    }
    return res.status(502).json({
      error: "ML service request failed. Dashboard data cannot be generated.",
      details: error?.message,
    });
  }
});

export default router;

