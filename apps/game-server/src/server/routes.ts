import type { Express } from "express";
import type { Server } from "@colyseus/core";
import { env } from "../env";

export function registerRoutes(app: Express, gameServer: Server): void {
  app.get("/", (_req, res) => {
    res.json({
      name: "Dracor Game Server",
      version: "0.2.0",
      status: "online",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      uptime: process.uptime(),
      players: getTotalPlayers(gameServer),
      rooms: getRoomCount(gameServer),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/status", (_req, res) => {
    res.json({
      service: "dracor-game-server",
      version: "0.2.0",
      uptime: process.uptime(),
      nodeEnv: env.nodeEnv,
      rooms: getRoomCount(gameServer),
      timestamp: new Date().toISOString(),
    });
  });
}

function getTotalPlayers(gameServer: Server): number {
  try {
    let count = 0;
    const matchMaker = (gameServer as any).matchMaker;
    if (!matchMaker) return 0;

    const rooms = matchMaker.rooms;
    if (rooms) {
      for (const [, room] of rooms) {
        count += room.clients?.length || 0;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

function getRoomCount(gameServer: Server): number {
  try {
    const matchMaker = (gameServer as any).matchMaker;
    if (!matchMaker) return 0;

    const rooms = matchMaker.rooms;
    if (rooms && typeof rooms.size === "number") {
      return rooms.size;
    }
    return 0;
  } catch {
    return 0;
  }
}
