import { logger } from "./logging/logger";

export interface EnvConfig {
  port: number;
  allowedOrigins: string[];
  nodeEnv: string;
}

export function loadEnv(): EnvConfig {
  const port = Number(process.env.PORT) || 2567;
  const nodeEnv = process.env.NODE_ENV || "development";

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  const originsRaw = process.env.GAME_SERVER_ALLOWED_ORIGINS
    || process.env.GAME_SERVER_ALLOWED_ORIGIN
    || "";

  const allowedOrigins = originsRaw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    port,
    allowedOrigins,
    nodeEnv,
  };
}

export const env = loadEnv();

export function logStartupConfig(): void {
  logger.info("Environment configuration", {
    port: env.port,
    nodeEnv: env.nodeEnv,
    allowedOrigins: env.allowedOrigins.length > 0
      ? env.allowedOrigins.join(", ")
      : "(any — no origins configured)",
  });
}
