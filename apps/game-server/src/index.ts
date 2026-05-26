import { env, logStartupConfig } from "./env";
import { createHttpServer } from "./server/createHttpServer";
import { createGameServer } from "./server/createGameServer";
import { registerRoutes } from "./server/routes";
import { persistenceQueue } from "./persistence/persistenceQueue";
import { logger } from "./logging/logger";

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const { app, httpServer } = createHttpServer();
const gameServer = createGameServer(httpServer);

registerRoutes(app, gameServer);

persistenceQueue.start();

// ─── Listen ──────────────────────────────────────────────────────────────────

httpServer.listen(env.port, "0.0.0.0", () => {
  logger.info("Dracor Game Server started", { version: "0.2.0" });
  logStartupConfig();
  logger.info(`Health check: http://localhost:${env.port}/health`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  try {
    await gameServer.gracefullyShutdown(false);
    logger.info("Game server shut down");
  } catch (err) {
    const msg = String(err);
    // Colyseus may already be shutting down from transport close
    if (!msg.includes("already_shutting_down")) {
      logger.error("Error shutting down game server", { error: msg });
    }
  }

  // Flush any pending persistence data
  persistenceQueue.stop();
  try {
    await persistenceQueue.flush();
    logger.info("Persistence queue flushed");
  } catch (err) {
    logger.error("Error flushing persistence queue", {
      error: String(err),
    });
  }

  // Close HTTP server
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if close takes too long
  setTimeout(() => {
    logger.warn("Forced exit after timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
