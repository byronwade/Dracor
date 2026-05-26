import http from "http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "../rooms/WorldRoom";

export function createGameServer(httpServer: http.Server): Server {
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  gameServer.define("world_room", WorldRoom);

  return gameServer;
}
