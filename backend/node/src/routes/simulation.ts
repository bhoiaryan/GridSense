import { Request, Response, Router } from "express";
import { z } from "zod";
import { mlClient } from "../services/mlClient.js";

const router = Router();

const scenarioSchema = z.object({
  cloudCoverChange: z.number().min(-100).max(100).default(0),
  demandChange: z.number().min(-100).max(100).default(0),
  batteryAvailable: z.boolean().default(true),
  backupAvailable: z.boolean().default(true),
});

router.post("/simulate", async (req: Request, res: Response) =>
{
  try
  {
    const parseResult = scenarioSchema.safeParse(req.body);
    if (!parseResult.success)
    {
      return res.status(400).json({
        error: "Invalid scenario simulation input parameters",
        issues: parseResult.error.issues,
      });
    }

    const scenarioResult = await mlClient.simulate(parseResult.data);
    res.json(scenarioResult);
  } catch (error: any)
  {
    res.status(500).json({ error: "Simulation failed", details: error.message });
  }
});

export default router;

