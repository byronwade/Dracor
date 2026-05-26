export interface SpawnPoint {
  id: string;
  type: 'player' | 'npc' | 'enemy' | 'item' | 'event';
  position: { x: number; y: number; z: number };
  rotation?: number;
  entityId?: string;
  radius?: number;
  maxCount?: number;
  respawnSeconds?: number;
}
