import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { env } from "./config/env.js";

// Routes
import dashboardRoutes from "./routes/dashboard.js";
import decisionsRoutes from "./routes/decisions.js";
import forecastRoutes from "./routes/forecast.js";
import healthRoutes from "./routes/health.js";
import riskRoutes from "./routes/risk.js";
import simulationRoutes from "./routes/simulation.js";
import sitesRoutes from "./routes/sites.js";
import systemRoutes from "./routes/system.js";

export const app = express();

// Middlewares
app.use(
  cors({
    origin: [env.CORS_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) =>
{
  const start = Date.now();
  res.on("finish", () =>
  {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API Routes
app.use("/api", healthRoutes);
app.use("/api", sitesRoutes);
app.use("/api", forecastRoutes);
app.use("/api", riskRoutes);
app.use("/api", decisionsRoutes);
app.use("/api", simulationRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", systemRoutes);

// Root informational endpoint
app.get("/", (_req: Request, res: Response) =>
{
  res.json({
    name: "GridSense AI - Node.js API Gateway",
    version: "1.0.0",
    docs: "/api/health",
  });
});

// 404 handler
app.use((_req: Request, res: Response) =>
{
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) =>
{
  console.error("[ServerError]", err);
  res.status(500).json({
    error: "Internal Gateway Error",
    message: err?.message || "An unexpected error occurred",
  });
});

