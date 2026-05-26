export interface ClientInputMessage {
  type: 'input';
  seq: number;
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1
  yaw: number; // radians
  sprint: boolean;
  jump: boolean;
  dt: number; // client delta time for this input
}

export interface ChatMessagePayload {
  type: 'chat';
  content: string;
}

export interface JoinOptions {
  name: string;
  userId?: string;
  characterId?: string;
}

export type ClientMessage = ClientInputMessage | ChatMessagePayload;
