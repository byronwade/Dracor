import { validateInput, validateChatMessage } from "@dracor/netcode";
import type { ClientInputMessage } from "@dracor/netcode";
import { logger } from "../logging/logger";

// Re-export netcode validation utilities for convenience
export { validateInput, validateChatMessage } from "@dracor/netcode";

const MAX_INPUTS_PER_SECOND = 30;
const RATE_LIMIT_WINDOW_MS = 1000;

interface PlayerInputState {
  lastSeq: number;
  recentTimestamps: number[];
}

const playerInputStates = new Map<string, PlayerInputState>();

/**
 * Initialize tracking state for a player.
 */
export function registerPlayer(sessionId: string): void {
  playerInputStates.set(sessionId, {
    lastSeq: -1,
    recentTimestamps: [],
  });
}

/**
 * Remove tracking state for a player. Call this on leave to prevent leaks.
 */
export function unregisterPlayer(sessionId: string): void {
  playerInputStates.delete(sessionId);
}

/**
 * Validate an input message with both @dracor/netcode validation
 * and server-specific checks (rate limiting, sequence ordering).
 *
 * Returns true if the input is valid and should be processed.
 */
export function validatePlayerInput(
  sessionId: string,
  input: ClientInputMessage
): boolean {
  // Run base netcode validation first
  if (!validateInput(input)) {
    logger.debug("Input failed netcode validation", { sessionId, seq: input.seq });
    return false;
  }

  const state = playerInputStates.get(sessionId);
  if (!state) {
    logger.warn("No input state for player", { sessionId });
    return false;
  }

  // Sequence number must increase
  if (input.seq <= state.lastSeq) {
    logger.debug("Stale sequence number", {
      sessionId,
      received: input.seq,
      lastSeq: state.lastSeq,
    });
    return false;
  }

  // Rate limiting: prune old timestamps, then check count
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  state.recentTimestamps = state.recentTimestamps.filter((t) => t > cutoff);

  if (state.recentTimestamps.length >= MAX_INPUTS_PER_SECOND) {
    logger.warn("Input rate limit exceeded", { sessionId });
    return false;
  }

  // Input is valid - update state
  state.lastSeq = input.seq;
  state.recentTimestamps.push(now);

  return true;
}
