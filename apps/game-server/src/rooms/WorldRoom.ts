import { Room, Client } from "@colyseus/core";
import type { ClientInputMessage } from "@dracor/netcode";
import { TICK_RATE, MAX_CHAT_LENGTH } from "@dracor/netcode";
import {
  addEntity,
  addComponent,
  removeEntity,
  createDracorWorld,
  type DracorWorld,
  createInputSystem,
  movementSystem,
  syncSystem,
  hashSessionId,
  type QueuedInput,
  type SyncTarget,
} from "@dracor/ecs";
import { WorldState } from "../schema/WorldState";
import { PlayerState } from "../schema/PlayerState";
import { ChatState } from "../schema/ChatState";
import { createFixedTickLoop } from "../simulation/fixedTickLoop";
import type { FixedTickLoop } from "../simulation/fixedTickLoop";
import {
  validatePlayerInput,
  registerPlayer,
  unregisterPlayer,
} from "../simulation/validatePlayerInput";
import { persistenceQueue } from "../persistence/persistenceQueue";
import { logger } from "../logging/logger";

interface EcsQueuedInput {
  sessionId: string;
  seq: number;
  ecsInput: QueuedInput;
}

interface ChatRateState {
  timestamps: number[];
}

interface PlayerMapping {
  eid: number;
  hash: number;
  syncTarget: SyncTarget;
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
  if (content.length === 0 || content.length > MAX_CHAT_LENGTH) return null;
  return content;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 50;
  private tickLoop: FixedTickLoop | null = null;
  private inputQueue: EcsQueuedInput[] = [];
  private chatRates = new Map<string, ChatRateState>();
  private usedNames = new Set<string>();

  private ecsWorld!: DracorWorld;
  private inputSystem!: ReturnType<typeof createInputSystem>;
  private playerMappings = new Map<string, PlayerMapping>();
  private syncTargets = new Map<number, SyncTarget>();

  onCreate(_options: any): void {
    this.setState(new WorldState());

    this.ecsWorld = createDracorWorld();
    this.inputSystem = createInputSystem();

    this.tickLoop = createFixedTickLoop(TICK_RATE, (tick, dt) => {
      this.simulationTick(tick, dt);
    });
    this.tickLoop.start();

    this.onMessage("input", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const mapping = this.playerMappings.get(client.sessionId);
      if (!mapping) return;

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

      player.lastInputSeq = input.seq;

      this.inputQueue.push({
        sessionId: client.sessionId,
        seq: input.seq,
        ecsInput: {
          sessionHash: mapping.hash,
          moveX: input.moveX,
          moveZ: input.moveZ,
          yaw: input.yaw,
          sprint: !!input.sprint,
          jump: !!input.jump,
        },
      });
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

    // Create ECS entity
    const eid = addEntity(this.ecsWorld);
    const { Position, Rotation, Velocity, InputState, NetworkId, Health, IsPlayer } =
      this.ecsWorld.components;

    addComponent(this.ecsWorld, eid, Position);
    addComponent(this.ecsWorld, eid, Rotation);
    addComponent(this.ecsWorld, eid, Velocity);
    addComponent(this.ecsWorld, eid, InputState);
    addComponent(this.ecsWorld, eid, NetworkId);
    addComponent(this.ecsWorld, eid, Health);
    addComponent(this.ecsWorld, eid, IsPlayer);

    // Initialize component data
    Position.x[eid] = 0;
    Position.y[eid] = 0;
    Position.z[eid] = 0;
    Rotation.yaw[eid] = 0;
    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;
    Velocity.vz[eid] = 0;
    InputState.moveX[eid] = 0;
    InputState.moveZ[eid] = 0;
    InputState.yaw[eid] = 0;
    InputState.sprint[eid] = 0;
    InputState.jump[eid] = 0;
    Health.current[eid] = 100;
    Health.max[eid] = 100;

    const hash = hashSessionId(client.sessionId);
    NetworkId.sessionHash[eid] = hash;

    const syncTarget: SyncTarget = { x: 0, y: 0, z: 0, yaw: 0, isMoving: false };

    this.playerMappings.set(client.sessionId, { eid, hash, syncTarget });
    this.syncTargets.set(hash, syncTarget);

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

    // Clean up ECS entity
    const mapping = this.playerMappings.get(client.sessionId);
    if (mapping) {
      removeEntity(this.ecsWorld, mapping.eid);
      this.syncTargets.delete(mapping.hash);
      this.playerMappings.delete(client.sessionId);
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
    this.playerMappings.clear();
    this.syncTargets.clear();
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
    // Drain and convert input queue to ECS format
    const inputs = this.inputQueue;
    this.inputQueue = [];

    const ecsQueue: QueuedInput[] = [];
    for (const queued of inputs) {
      ecsQueue.push(queued.ecsInput);
    }

    // Set ECS world time
    this.ecsWorld.time.delta = 1 / TICK_RATE;
    this.ecsWorld.time.tick = tick;

    // Run ECS systems pipeline
    this.inputSystem(this.ecsWorld, ecsQueue);
    movementSystem(this.ecsWorld, () => 0);
    syncSystem(this.ecsWorld, this.syncTargets);

    // Write ECS sync targets back to Colyseus PlayerState schemas
    for (const [sessionId, mapping] of this.playerMappings) {
      const player = this.state.players.get(sessionId);
      if (!player) continue;

      const target = mapping.syncTarget;
      player.x = target.x;
      player.y = target.y;
      player.z = target.z;
      player.yaw = target.yaw;
      player.isMoving = target.isMoving;
    }

    this.state.tick = tick;
    this.state.worldTime += Math.round(1000 / TICK_RATE);
  }
}
