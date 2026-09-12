import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";
import { resolveSiteId } from "../utils/siteResolver.js";

const router = Router();

router.get("/forecast/:site_id", async (req: Request, res: Response) =>
{
  try
  {
    const rawSiteId = Array.isArray(req.params.site_id) ? req.params.site_id[0] : req.params.site_id;
    if (!rawSiteId)
    {
      return res.status(400).json({ error: "Missing site_id parameter" });
    }
    const siteId = resolveSiteId(rawSiteId);
    const hoursParam = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
    const hours = [24, 48, 72].includes(hoursParam) ? hoursParam : 24;

    const forecast = await mlClient.getForecast(siteId, hours);
    res.json(forecast);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to fetch forecast", details: error.message });
  }
});

export default router;

