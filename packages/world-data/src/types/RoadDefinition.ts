export interface RoadDefinition {
  id: string;
  type: 'cobblestone' | 'dirt' | 'broken_stone';
  points: Array<{ x: number; y: number; z: number }>;
  width: number;
  worn: boolean;
  description: string;
}
