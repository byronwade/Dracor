export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
}

export interface RockGroup {
  id: string;
  type: 'boulder_large' | 'boulder_medium' | 'stone_cluster' | 'cliff_face';
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
}
