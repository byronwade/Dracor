export interface LandmarkDefinition {
  id: string;
  type: 'shrine' | 'ruin' | 'monument' | 'bridge' | 'gate' | 'tower';
  name: string;
  position: { x: number; y: number; z: number };
  rotation?: number;
  scale?: number;
  interactable: boolean;
  description: string;
  emissive?: { color: [number, number, number]; intensity: number };
  particles?: string;
}
