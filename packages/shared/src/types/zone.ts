export interface Zone {
  id: string;
  name: string;
  description: string;
  levelRange: [number, number];
  type: 'town' | 'road' | 'wilderness' | 'dungeon';
  connections: string[];
}
