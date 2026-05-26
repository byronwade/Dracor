export interface ChunkCoord {
  gridX: number;
  gridZ: number;
}

export interface ChunkHeightData {
  coord: ChunkCoord;
  heights: Float32Array;
  resolution: number;
  worldX: number;
  worldZ: number;
  chunkSize: number;
  minHeight: number;
  maxHeight: number;
}

export interface WorldGenConfig {
  seed: string | number;
  worldSize?: number;
  chunkSize?: number;
  chunkResolution?: number;
  cacheSize?: number;
}
