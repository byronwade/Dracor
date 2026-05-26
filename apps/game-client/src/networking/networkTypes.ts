/** Input message sent from client to server each tick */
export interface ClientInputMessage {
  type: 'input';
  seq: number;
  moveX: number;
  moveZ: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
  dt: number;
}

/** Chat message sent from client to server */
export interface ChatMessagePayload {
  content: string;
}

/** Player state received from server */
export interface RemotePlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Connection state for UI display */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';
