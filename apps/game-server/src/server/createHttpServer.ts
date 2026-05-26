import express from "express";
import cors from "cors";
import http from "http";
import { env } from "../env";

export function createHttpServer(): {
  app: express.Express;
  httpServer: http.Server;
} {
  const app = express();

  const corsOrigin = env.allowedOrigins.length > 0
    ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      }
    : true;

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  const httpServer = http.createServer(app);

  return { app, httpServer };
}
