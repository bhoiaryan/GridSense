import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";

const router = Router();

router.get("/risk/:site_id", async (req: Request, res: Response) =>
{
  try
  {
    const siteId = Array.isArray(req.params.site_id) ? req.params.site_id[0] : req.params.site_id;
    if (!siteId)
    {
      return res.status(400).json({ error: "Missing site_id parameter" });
    }
    const events = await mlClient.getRiskEvents(siteId);
    const overallRisk = events.some((e) => e.risk === "HIGH")
      ? "HIGH"
      : events.some((e) => e.risk === "MEDIUM")
        ? "MEDIUM"
        : "LOW";

    res.json({
      site_id: siteId,
      overall_risk: overallRisk,
      active_events_count: events.length,
      events,
    });
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to evaluate risk", details: error.message });
  }
});

router.get("/events/:site_id", async (req: Request, res: Response) =>
{
  try
  {
    const siteId = Array.isArray(req.params.site_id) ? req.params.site_id[0] : req.params.site_id;
    if (!siteId)
    {
      return res.status(400).json({ error: "Missing site_id parameter" });
    }
    const events = await mlClient.getRiskEvents(siteId);
    res.json(events);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to fetch events", details: error.message });
  }
});

export default router;

