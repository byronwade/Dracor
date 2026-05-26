export interface PlayerSnapshot {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  maxHealth: number;
  level: number;
  isMoving: boolean;
  weapon: string;
  memory: string;
  lastInputSeq: number;
}

export interface WorldSnapshot {
  tick: number;
  timestamp: number;
  worldTime: number;
  players: Map<string, PlayerSnapshot>;
}
