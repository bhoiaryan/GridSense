import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () =>
{
  console.log(`=======================================================`);
  console.log(`⚡ GridSense AI Node.js Gateway running on port ${env.PORT}`);
  console.log(`📡 Connected ML Service URL: ${env.ML_SERVICE_URL}`);
  console.log(`🛡️ Fallback Mode Enabled: ${env.USE_MOCK_FALLBACK}`);
  console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
process.on("SIGTERM", () =>
{
  console.log("[Node Gateway] SIGTERM signal received: closing HTTP server");
  server.close(() =>
  {
    console.log("[Node Gateway] HTTP server closed");
  });
});

process.on("SIGINT", () =>
{
  console.log("[Node Gateway] SIGINT signal received: closing HTTP server");
  server.close(() =>
  {
    console.log("[Node Gateway] HTTP server closed");
  });
});

