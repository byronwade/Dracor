export interface TerrainChunkDef {
  id: string;
  gridX: number;
  gridZ: number;
  size: number;
  resolution: number;
  heightData: 'flat' | 'procedural' | 'heightmap';
  heightmapUrl?: string;
  lodLevels: number;
}
