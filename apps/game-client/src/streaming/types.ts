export type CellState = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'unloading';
export type CellPriority = 'critical' | 'high' | 'medium' | 'low';

export interface StreamingConfig {
  loadDistance: number;
  unloadDistance: number;
  maxLoadedCells: number;
  maxConcurrentLoads: number;
  rebuildThreshold: number;
  foliageDensityFalloff: Array<{ distance: number; density: number }>;
  terrainLODDistances: Array<{ distance: number; subdivisions: number }>;
}

export type HeightSampler = (x: number, z: number) => number;
