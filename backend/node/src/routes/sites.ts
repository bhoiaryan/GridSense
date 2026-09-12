import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";
import { resolveSiteId } from "../utils/siteResolver.js";

const router = Router();

router.get("/sites", async (_req: Request, res: Response) =>
{
  try
  {
    const sites = await mlClient.getSites();
    res.json(sites);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to retrieve sites", details: error.message });
  }
});

router.get("/sites/:id", async (req: Request, res: Response) =>
{
  try
  {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: "Missing site id parameter" });
    }
    const siteId = resolveSiteId(rawId);
    const site = await mlClient.getSiteById(siteId);
    if (!site)
    {
      return res.status(404).json({ error: `Site '${req.params.id}' not found` });
    }
    res.json(site);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to retrieve site", details: error.message });
  }
});

export default router;

