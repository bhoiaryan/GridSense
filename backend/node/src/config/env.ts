import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ML_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  USE_MOCK_FALLBACK: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("true"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);

