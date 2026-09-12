import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";

const router = Router();

router.get("/system/status", async (_req: Request, res: Response) =>
{
  try
  {
    const status = await mlClient.getSystemStatus();
    res.json(status);
  } catch (error: any)
  {
    res.status(500).json({ error: "Failed to fetch system status", details: error.message });
  }
});

export default router;

