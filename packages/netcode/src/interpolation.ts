import type { PlayerSnapshot } from './snapshots';

export interface InterpolationState {
  buffer: Array<{ snapshot: PlayerSnapshot; timestamp: number }>;
  maxBufferSize: number;
}

export function createInterpolationState(): InterpolationState {
  return {
    buffer: [],
    maxBufferSize: 10,
  };
}

export function pushSnapshot(
  state: InterpolationState,
  snapshot: PlayerSnapshot,
  timestamp: number
): void {
  state.buffer.push({ snapshot, timestamp });

  // Keep buffer trimmed to max size, removing the oldest entries
  while (state.buffer.length > state.maxBufferSize) {
    state.buffer.shift();
  }
}

export function interpolatePosition(
  state: InterpolationState,
  renderTime: number
): { x: number; y: number; z: number; yaw: number } | null {
  const { buffer } = state;

  // Need at least two snapshots to interpolate
  if (buffer.length < 2) {
    // If we have exactly one snapshot, return its position as a fallback
    if (buffer.length === 1) {
      const s = buffer[0].snapshot;
      return { x: s.x, y: s.y, z: s.z, yaw: s.yaw };
    }
    return null;
  }

  // Find the two snapshots that straddle renderTime.
  // We look for the first pair where buffer[i].timestamp <= renderTime <= buffer[i+1].timestamp
  let from: { snapshot: PlayerSnapshot; timestamp: number } | null = null;
  let to: { snapshot: PlayerSnapshot; timestamp: number } | null = null;

  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
      from = buffer[i];
      to = buffer[i + 1];
      break;
    }
  }

  // If renderTime is before all snapshots, use the earliest position
  if (from === null || to === null) {
    if (renderTime <= buffer[0].timestamp) {
      const s = buffer[0].snapshot;
      return { x: s.x, y: s.y, z: s.z, yaw: s.yaw };
    }

    // If renderTime is past all snapshots, use the two most recent for extrapolation
    from = buffer[buffer.length - 2];
    to = buffer[buffer.length - 1];
  }

  const duration = to.timestamp - from.timestamp;

  // Avoid division by zero if timestamps are identical
  if (duration <= 0) {
    const s = to.snapshot;
    return { x: s.x, y: s.y, z: s.z, yaw: s.yaw };
  }

  // Calculate interpolation factor, clamped to [0, 1] for interpolation
  // but allowed > 1 for short extrapolation past the latest snapshot
  const t = (renderTime - from.timestamp) / duration;
  const clampedT = Math.max(0, Math.min(t, 2.0)); // allow up to 2x extrapolation

  const a = from.snapshot;
  const b = to.snapshot;

  // Linear interpolation for position
  const x = a.x + (b.x - a.x) * clampedT;
  const y = a.y + (b.y - a.y) * clampedT;
  const z = a.z + (b.z - a.z) * clampedT;

  // For yaw, interpolate via shortest angular path
  let yawDiff = b.yaw - a.yaw;

  // Normalize to [-PI, PI] for shortest rotation
  while (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;
  while (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;

  const yaw = a.yaw + yawDiff * clampedT;

  return { x, y, z, yaw };
}
