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

interface ChatRateState {
  timestamps: number[];
}

const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 10_000;
const MAX_NAME_LENGTH = 24;
const MIN_NAME_LENGTH = 2;
const NAME_PATTERN = /^[a-zA-Z0-9_ \-']+$/;

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let name = raw.trim().slice(0, MAX_NAME_LENGTH);
  name = name.replace(/[\x00-\x1f\x7f]/g, "");
  if (!NAME_PATTERN.test(name)) {
    name = name.replace(/[^a-zA-Z0-9_ \-']/g, "");
  }
  return name.length >= MIN_NAME_LENGTH ? name : "";
}

function sanitizeChatContent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let content = raw.trim();
  content = content.replace(/[\x00-\x1f\x7f]/g, "");
  if (content.length === 0 || content.length > 250) return null;
  return content;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 50;
  private tickLoop: FixedTickLoop | null = null;
  private inputQueue: QueuedInput[] = [];
  private chatRates = new Map<string, ChatRateState>();
  private usedNames = new Set<string>();

  onCreate(_options: any): void {
    this.setState(new WorldState());

    this.tickLoop = createFixedTickLoop(TICK_RATE, (tick, dt) => {
      this.simulationTick(tick, dt);
    });
    this.tickLoop.start();

    this.onMessage("input", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

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

      if (!validatePlayerInput(client.sessionId, input)) return;

      this.inputQueue.push({ sessionId: client.sessionId, input });
    });

    this.onMessage("move", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const { x, y, z, rotationY } = data;
      if (typeof x !== "number" || !isFinite(x)) return;
      if (typeof y !== "number" || !isFinite(y)) return;
      if (typeof z !== "number" || !isFinite(z)) return;

      const clamped = clampToWorldBounds(x, y, z);
      player.x = clamped.x;
      player.y = clamped.y;
      player.z = clamped.z;

      if (rotationY !== undefined) {
        if (typeof rotationY !== "number" || !isFinite(rotationY)) return;
        player.yaw = rotationY;
      }

      player.isMoving = true;
      this.clock.setTimeout(() => {
        if (player) player.isMoving = false;
      }, 100);
    });

    this.onMessage("chat", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const content = sanitizeChatContent(data.content);
      if (!content) return;

      if (!this.checkChatRate(client.sessionId)) {
        logger.debug("Chat rate limited", { sessionId: client.sessionId });
        return;
      }

      this.addChatMessage(client.sessionId, player.name, content);
    });

    this.onMessage("ping", (client: Client, data: any) => {
      client.send("pong", { t: data?.t ?? 0 });
    });

    logger.info("WorldRoom created");
  }

  onJoin(client: Client, options: any): void {
    let name = sanitizeName(options?.name);
    if (!name) name = "Wanderer";

    name = this.makeUniqueName(name);

    const validWeapons = ["blade", "bow", "staff"];
    const validMemories = ["ember", "stone", "storm"];

    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = name;
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.yaw = 0;
    player.health = 100;
    player.maxHealth = 100;
    player.level = Math.max(1, Math.min(100, parseInt(options?.level, 10) || 1));
    player.weapon = validWeapons.includes(options?.weapon) ? options.weapon : "blade";
    player.memory = validMemories.includes(options?.memory) ? options.memory : "ember";
    player.isMoving = false;
    player.lastInputSeq = 0;

    if (options?.userId) player.userId = String(options.userId).slice(0, 64);
    if (options?.characterId) player.characterId = String(options.characterId).slice(0, 64);

    this.state.players.set(client.sessionId, player);
    this.usedNames.add(name.toLowerCase());
    this.chatRates.set(client.sessionId, { timestamps: [] });

    registerPlayer(client.sessionId);

    this.addSystemMessage(`${name} entered Ironvale.`);

    logger.info("Player joined", {
      name: player.name,
      sessionId: client.sessionId,
      playerCount: this.state.players.size,
    });
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const name = player?.name || "Unknown";

    if (player && player.characterId) {
      persistenceQueue.enqueue(
        player.characterId,
        player.x,
        player.y,
        player.z,
        this.state.currentZone
      );
    }

    this.usedNames.delete(name.toLowerCase());
    this.chatRates.delete(client.sessionId);
    unregisterPlayer(client.sessionId);
    this.state.players.delete(client.sessionId);

    this.addSystemMessage(`${name} left Ironvale.`);

    logger.info("Player left", {
      name,
      sessionId: client.sessionId,
      playerCount: this.state.players.size,
    });
  }

  onDispose(): void {
    if (this.tickLoop) {
      this.tickLoop.stop();
      this.tickLoop = null;
    }
    this.chatRates.clear();
    this.usedNames.clear();
    logger.info("WorldRoom disposed");
  }

  private makeUniqueName(desired: string): string {
    const lower = desired.toLowerCase();
    if (!this.usedNames.has(lower)) return desired;

    for (let i = 2; i <= 99; i++) {
      const candidate = `${desired}${i}`;
      if (!this.usedNames.has(candidate.toLowerCase())) return candidate;
    }
    return `${desired}_${Date.now() % 10000}`;
  }

  private checkChatRate(sessionId: string): boolean {
    const state = this.chatRates.get(sessionId);
    if (!state) return false;

    const now = Date.now();
    state.timestamps = state.timestamps.filter((t) => t > now - CHAT_WINDOW_MS);

    if (state.timestamps.length >= MAX_CHAT_PER_WINDOW) return false;

    state.timestamps.push(now);
    return true;
  }

  private addChatMessage(senderId: string, senderName: string, content: string): void {
    const message = new ChatState();
    message.id = `${senderId}-${Date.now()}`;
    message.senderId = senderId;
    message.senderName = senderName;
    message.content = content;
    message.timestamp = Date.now();

    this.state.messages.push(message);

    while (this.state.messages.length > 50) {
      this.state.messages.shift();
    }
  }

  private addSystemMessage(content: string): void {
    const message = new ChatState();
    message.id = `system-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    message.senderId = "__system__";
    message.senderName = "";
    message.content = content;
    message.timestamp = Date.now();

    this.state.messages.push(message);

    while (this.state.messages.length > 50) {
      this.state.messages.shift();
    }
  }

  private simulationTick(tick: number, _dt: number): void {
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
        () => 0
      );

      player.lastInputSeq = queued.input.seq;
    }

    this.state.tick = tick;
    this.state.worldTime += 50;
  }
}
