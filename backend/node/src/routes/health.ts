import { Request, Response, Router } from "express";
import { mlClient } from "../services/mlClient.js";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const mlHealth = await mlClient.checkHealth();

  res.status(200).json({
    status: "ok",
    gateway: "operational",
    service: "GridSense AI Node.js Gateway",
    timestamp: new Date().toISOString(),
    ml_service: {
      status: mlHealth.status,
      details: mlHealth.error ?? "Connected to FastAPI ML Service",
    },
  });
});

export default router;

