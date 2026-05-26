import type { ClientInputMessage } from './messages';

export const MAX_MOVE_SPEED = 6.0;
export const MAX_SPRINT_SPEED = 10.8;
export const MAX_COORDINATE = 500;
export const MIN_COORDINATE = -500;
export const MAX_Y = 100;
export const MIN_Y = -10;
export const MAX_DT = 0.2; // reject inputs with dt > 200ms (lagging hard)
export const MIN_DT = 0.001;
export const MAX_CHAT_LENGTH = 250;

export function validateInput(input: ClientInputMessage): boolean {
  // Check type
  if (input.type !== 'input') {
    return false;
  }

  // Check seq is integer >= 0
  if (!Number.isInteger(input.seq) || input.seq < 0) {
    return false;
  }

  // Check moveX/moveZ in [-1, 1]
  if (
    typeof input.moveX !== 'number' ||
    typeof input.moveZ !== 'number' ||
    input.moveX < -1 ||
    input.moveX > 1 ||
    input.moveZ < -1 ||
    input.moveZ > 1
  ) {
    return false;
  }

  // Check yaw is finite
  if (typeof input.yaw !== 'number' || !Number.isFinite(input.yaw)) {
    return false;
  }

  // Check dt in [MIN_DT, MAX_DT]
  if (
    typeof input.dt !== 'number' ||
    !Number.isFinite(input.dt) ||
    input.dt < MIN_DT ||
    input.dt > MAX_DT
  ) {
    return false;
  }

  // Check sprint/jump are booleans
  if (typeof input.sprint !== 'boolean' || typeof input.jump !== 'boolean') {
    return false;
  }

  return true;
}

export function validateChatMessage(content: string): string | null {
  if (typeof content !== 'string') {
    return null;
  }

  const trimmed = content.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_CHAT_LENGTH) {
    return null;
  }

  return trimmed;
}

export function clampPosition(
  x: number,
  y: number,
  z: number
): { x: number; y: number; z: number } {
  return {
    x: Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, x)),
    y: Math.max(MIN_Y, Math.min(MAX_Y, y)),
    z: Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, z)),
  };
}

export function isWithinBounds(x: number, y: number, z: number): boolean {
  return (
    x >= MIN_COORDINATE &&
    x <= MAX_COORDINATE &&
    y >= MIN_Y &&
    y <= MAX_Y &&
    z >= MIN_COORDINATE &&
    z <= MAX_COORDINATE
  );
}
