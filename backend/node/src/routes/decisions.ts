import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";
import { resolveSiteId } from "../utils/siteResolver.js";

const router = Router();

router.get("/recommendations/:site_id", async (req: Request, res: Response) =>
{
  try
  {
    const rawSiteId = Array.isArray(req.params.site_id) ? req.params.site_id[0] : req.params.site_id;
    if (!rawSiteId)
    {
      return res.status(400).json({ error: "Missing site_id parameter" });
    }
    const siteId = resolveSiteId(rawSiteId);
    const recommendation = await mlClient.getRecommendation(siteId);
    res.json(recommendation);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to fetch recommendation", details: error.message });
  }
});

export default router;

