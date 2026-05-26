// Messages
export type {
  ClientInputMessage,
  ChatMessagePayload,
  JoinOptions,
  ClientMessage,
} from './messages';

// Snapshots
export type { PlayerSnapshot, WorldSnapshot } from './snapshots';

// Tick rate constants
export {
  TICK_RATE,
  TICK_INTERVAL_MS,
  MAX_TICKS_PER_FRAME,
  CLIENT_SEND_RATE,
  CLIENT_SEND_INTERVAL_MS,
  INTERPOLATION_DELAY_MS,
  MAX_EXTRAPOLATION_MS,
} from './tickRate';

// Validation
export {
  MAX_MOVE_SPEED,
  MAX_SPRINT_SPEED,
  MAX_COORDINATE,
  MIN_COORDINATE,
  MAX_Y,
  MIN_Y,
  MAX_DT,
  MIN_DT,
  MAX_CHAT_LENGTH,
  validateInput,
  validateChatMessage,
  clampPosition,
  isWithinBounds,
} from './validation';

// Interpolation
export type { InterpolationState } from './interpolation';
export {
  createInterpolationState,
  pushSnapshot,
  interpolatePosition,
} from './interpolation';
