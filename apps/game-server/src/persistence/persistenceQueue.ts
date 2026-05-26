import { saveCharacterSnapshot } from "./saveCharacterSnapshot";
import { logger } from "../logging/logger";

interface PositionSnapshot {
  characterId: string;
  x: number;
  y: number;
  z: number;
  zoneId: string;
}

export class PersistenceQueue {
  private queue: Map<string, PositionSnapshot> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private flushIntervalMs: number;

  constructor(flushIntervalMs: number = 30_000) {
    this.flushIntervalMs = flushIntervalMs;
  }

  /**
   * Enqueue a position update for a character.
   * Overwrites any previous pending update for the same character (last-write-wins).
   */
  enqueue(
    characterId: string,
    x: number,
    y: number,
    z: number,
    zoneId: string
  ): void {
    this.queue.set(characterId, { characterId, x, y, z, zoneId });
  }

  /**
   * Start the periodic flush timer.
   */
  start(): void {
    if (this.interval !== null) {
      return;
    }
    logger.info("PersistenceQueue started", {
      flushIntervalMs: this.flushIntervalMs,
    });
    this.interval = setInterval(() => {
      this.flush().catch((err) => {
        logger.error("PersistenceQueue flush error", {
          error: String(err),
        });
      });
    }, this.flushIntervalMs);
  }

  /**
   * Stop the periodic flush timer.
   */
  stop(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info("PersistenceQueue stopped");
    }
  }

  /**
   * Flush all pending snapshots. Drains the queue.
   */
  async flush(): Promise<void> {
    if (this.queue.size === 0) {
      return;
    }

    const entries = Array.from(this.queue.values());
    this.queue.clear();

    logger.info("Flushing character snapshots", { count: entries.length });

    const results = await Promise.allSettled(
      entries.map((snap) =>
        saveCharacterSnapshot(
          snap.characterId,
          snap.x,
          snap.y,
          snap.z,
          snap.zoneId
        )
      )
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      logger.error("Some character snapshots failed to save", {
        failed,
        total: entries.length,
      });
    }
  }
}

/**
 * Module-level singleton instance.
 * Start/stop this from the main entry point.
 */
export const persistenceQueue = new PersistenceQueue(30_000);
