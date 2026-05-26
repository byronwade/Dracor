export const WORLD_MIN_X = -500;
export const WORLD_MAX_X = 500;
export const WORLD_MIN_Z = -500;
export const WORLD_MAX_Z = 500;
export const WORLD_MIN_Y = -10;
export const WORLD_MAX_Y = 100;

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
