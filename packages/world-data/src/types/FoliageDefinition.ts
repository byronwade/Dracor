export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'tree_broadleaf' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  modelId: string;
  modelFile?: string;
  modelVariant?: string;
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
}

export interface RockGroup {
  id: string;
  type: 'boulder_large' | 'boulder_medium' | 'stone_cluster' | 'cliff_face';
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
}
