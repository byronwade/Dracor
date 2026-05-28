import {
  MAX_COORDINATE,
  MIN_COORDINATE,
  MAX_Y,
  MIN_Y,
} from "@dracor/netcode";

// Re-export with server-conventional names for readability
export const WORLD_MIN_X = MIN_COORDINATE;
export const WORLD_MAX_X = MAX_COORDINATE;
export const WORLD_MIN_Z = MIN_COORDINATE;
export const WORLD_MAX_Z = MAX_COORDINATE;
export const WORLD_MIN_Y = MIN_Y;
export const WORLD_MAX_Y = MAX_Y;

export function clampToWorldBounds(
  x: number,
  y: number,
  z: number
): { x: number; y: number; z: number } {
  return {
    x: Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, x)),
    y: Math.max(WORLD_MIN_Y, Math.min(WORLD_MAX_Y, y)),
    z: Math.max(WORLD_MIN_Z, Math.min(WORLD_MAX_Z, z)),
  };
}

export function isInBounds(x: number, y: number, z: number): boolean {
  return (
    x >= WORLD_MIN_X &&
    x <= WORLD_MAX_X &&
    y >= WORLD_MIN_Y &&
    y <= WORLD_MAX_Y &&
    z >= WORLD_MIN_Z &&
    z <= WORLD_MAX_Z
  );
}
