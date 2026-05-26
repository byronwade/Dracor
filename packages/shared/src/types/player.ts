export interface PlayerState {
  id: string;
  userId?: string;
  characterId?: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  health: number;
  maxHealth: number;
  level: number;
  weapon: string;
  memory: string;
  isMoving: boolean;
}

export interface MovementMessage {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  isMoving: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

export interface ChatInput {
  content: string;
}
