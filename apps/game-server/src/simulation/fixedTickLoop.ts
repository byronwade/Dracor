export type TickCallback = (tick: number, dt: number) => void;

export interface FixedTickLoop {
  start(): void;
  stop(): void;
  getTick(): number;
}

export function createFixedTickLoop(
  tickRate: number,
  callback: TickCallback
): FixedTickLoop {
  let tick = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  const dt = 1 / tickRate;
  const intervalMs = Math.floor(1000 / tickRate);

  return {
    start(): void {
      if (interval !== null) {
        return;
      }
      interval = setInterval(() => {
        tick++;
        callback(tick, dt);
      }, intervalMs);
    },

    stop(): void {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    },

    getTick(): number {
      return tick;
    },
  };
}
