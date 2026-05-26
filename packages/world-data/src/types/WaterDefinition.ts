export interface WaterBodyDefinition {
  id: string;
  type: 'stream' | 'pond' | 'river' | 'puddle';
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number };
  flowDirection?: [number, number];
  opacity: number;
}
