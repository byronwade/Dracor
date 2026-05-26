import { Room, Client } from "@colyseus/core";
import type { ClientInputMessage } from "@dracor/netcode";
import { TICK_RATE } from "@dracor/netcode";
import { WorldState } from "../schema/WorldState";
import { PlayerState } from "../schema/PlayerState";
import { ChatState } from "../schema/ChatState";
import { createFixedTickLoop } from "../simulation/fixedTickLoop";
import type { FixedTickLoop } from "../simulation/fixedTickLoop";
import { simulatePlayerMovement } from "../simulation/simulatePlayerMovement";
import {
  validatePlayerInput,
  registerPlayer,
  unregisterPlayer,
} from "../simulation/validatePlayerInput";
import { clampToWorldBounds } from "../simulation/worldBounds";
import { persistenceQueue } from "../persistence/persistenceQueue";
import { logger } from "../logging/logger";

interface QueuedInput {
  sessionId: string;
  input: ClientInputMessage;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 50;
  private tickLoop: FixedTickLoop | null = null;
  private inputQueue: QueuedInput[] = [];

  onCreate(_options: any): void {
    this.setState(new WorldState());

    // Create and start the fixed-tick simulation loop
    this.tickLoop = createFixedTickLoop(TICK_RATE, (tick, dt) => {
      this.simulationTick(tick, dt);
    });
    this.tickLoop.start();

    // -----------------------------------------------------------
    // Message handler: "input" (new netcode-based input pipeline)
    // -----------------------------------------------------------
    this.onMessage("input", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Cast and validate — the message from the client should match ClientInputMessage
      const input: ClientInputMessage = {
        type: "input",
        seq: data.seq,
        moveX: data.moveX,
        moveZ: data.moveZ,
        yaw: data.yaw,
        sprint: data.sprint,
        jump: data.jump,
        dt: data.dt,
      };

      if (!validatePlayerInput(client.sessionId, input)) {
        return;
      }

      // Queue input for processing in the next tick
      this.inputQueue.push({ sessionId: client.sessionId, input });
    });

    // -----------------------------------------------------------
    // Message handler: "move" (LEGACY — backward compatibility)
    // -----------------------------------------------------------
    this.onMessage("move", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { x, y, z, rotationY } = data;

      // Validate movement data
      if (typeof x !== "number" || !isFinite(x)) return;
      if (typeof y !== "number" || !isFinite(y)) return;
      if (typeof z !== "number" || !isFinite(z)) return;

      // Clamp positions within bounds
      const clamped = clampToWorldBounds(x, y, z);
      player.x = clamped.x;
      player.y = clamped.y;
      player.z = clamped.z;

      // Handle rotation if provided (legacy clients send rotationY)
      if (rotationY !== undefined) {
        if (typeof rotationY !== "number" || !isFinite(rotationY)) return;
        player.yaw = rotationY;
      }

      player.isMoving = true;

      // Reset isMoving after a short delay
      this.clock.setTimeout(() => {
        if (player) {
          player.isMoving = false;
        }
      }, 100);
    });

    // -----------------------------------------------------------
    // Message handler: "chat"
    // -----------------------------------------------------------
    this.onMessage("chat", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { content } = data;

      // Validate chat content
      if (typeof content !== "string") return;
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      if (trimmed.length > 250) return;

      // Create chat message
      const message = new ChatState();
      message.id = `${client.sessionId}-${Date.now()}`;
      message.senderId = client.sessionId;
      message.senderName = player.name;
      message.content = trimmed;
      message.timestamp = Date.now();

      this.state.messages.push(message);

      // Keep only the last 50 messages
      while (this.state.messages.length > 50) {
        this.state.messages.shift();
      }
    });

    logger.info("WorldRoom created");
  }

  onJoin(client: Client, options: any): void {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = options?.name || "Wanderer";
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.yaw = 0;
    player.health = 100;
    player.maxHealth = 100;
    player.level = 1;
    player.weapon = "blade";
    player.memory = "ember";
    player.isMoving = false;
    player.lastInputSeq = 0;

    if (options?.userId) {
      player.userId = options.userId;
    }
    if (options?.characterId) {
      player.characterId = options.characterId;
    }

    this.state.players.set(client.sessionId, player);

    // Register player for input validation tracking
    registerPlayer(client.sessionId);

    logger.info("Player joined", {
      name: player.name,
      sessionId: client.sessionId,
    });
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const name = player?.name || "Unknown";

    // Enqueue a final position save if the player has a characterId
    if (player && player.characterId) {
      persistenceQueue.enqueue(
        player.characterId,
        player.x,
        player.y,
        player.z,
        this.state.currentZone
      );
    }

    // Clean up input validation state
    unregisterPlayer(client.sessionId);

    this.state.players.delete(client.sessionId);

    logger.info("Player left", { name, sessionId: client.sessionId });
  }

  onDispose(): void {
    if (this.tickLoop) {
      this.tickLoop.stop();
      this.tickLoop = null;
    }
    logger.info("WorldRoom disposed");
  }

  /**
   * Called every tick by the fixed tick loop.
   * Processes all queued inputs and advances world time.
   */
  private simulationTick(tick: number, _dt: number): void {
    // Process all queued inputs
    const inputs = this.inputQueue;
    this.inputQueue = [];

    for (const queued of inputs) {
      const player = this.state.players.get(queued.sessionId);
      if (!player) continue;

      simulatePlayerMovement(
        player,
        {
          moveX: queued.input.moveX,
          moveZ: queued.input.moveZ,
          yaw: queued.input.yaw,
          sprint: queued.input.sprint,
          jump: queued.input.jump,
          dt: queued.input.dt,
        },
        // No terrain yet — flat ground at y=0
        () => 0
      );

      // Update the last processed input sequence number
      player.lastInputSeq = queued.input.seq;
    }

    // Advance world time and tick
    this.state.tick = tick;
    this.state.worldTime += 50; // 50ms per tick at 20Hz
  }
}
