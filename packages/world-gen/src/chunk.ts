import { WorldSeed } from './seed';
import { createElevationMap, type ElevationMapResult } from './elevation';
import { CHUNK_SIZE, CHUNK_RESOLUTION, HALF_WORLD, GRID_SIZE } from './config';
import type { ChunkCoord, ChunkHeightData } from './types';

export class ChunkGenerator {
  private readonly elevationMap: ElevationMapResult;
  private readonly cache: Map<string, ChunkHeightData>;
  private readonly cacheOrder: string[];
  private readonly maxCacheSize: number;

  constructor(
    private readonly worldSeed: WorldSeed,
    maxCacheSize: number = 256
  ) {
    this.elevationMap = createElevationMap(worldSeed);
    this.cache = new Map();
    this.cacheOrder = [];
    this.maxCacheSize = maxCacheSize;
  }

  generateChunk(gridX: number, gridZ: number): ChunkHeightData {
    const key = chunkKey(gridX, gridZ);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const worldX = gridX * CHUNK_SIZE - HALF_WORLD;
    const worldZ = gridZ * CHUNK_SIZE - HALF_WORLD;
    const res = CHUNK_RESOLUTION;
    const heights = new Float32Array(res * res);
    const step = CHUNK_SIZE / (res - 1);

    let minH = Infinity;
    let maxH = -Infinity;

    for (let iz = 0; iz < res; iz++) {
      for (let ix = 0; ix < res; ix++) {
        const wx = worldX + ix * step;
        const wz = worldZ + iz * step;
        const h = this.elevationMap.getElevation(wx, wz);
        heights[iz * res + ix] = h;
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }

    const data: ChunkHeightData = {
      coord: { gridX, gridZ },
      heights,
      resolution: res,
      worldX,
      worldZ,
      chunkSize: CHUNK_SIZE,
      minHeight: minH,
      maxHeight: maxH,
    };

    this.addToCache(key, data);
    return data;
  }

  getHeightAt(worldX: number, worldZ: number): number {
    const localX = worldX + HALF_WORLD;
    const localZ = worldZ + HALF_WORLD;
    const gridX = Math.floor(localX / CHUNK_SIZE);
    const gridZ = Math.floor(localZ / CHUNK_SIZE);

    if (gridX < 0 || gridX >= GRID_SIZE || gridZ < 0 || gridZ >= GRID_SIZE) {
      return this.elevationMap.getElevation(worldX, worldZ);
    }

    const chunk = this.generateChunk(gridX, gridZ);
    return sampleChunkHeight(chunk, worldX, worldZ);
  }

  getContinentalValue(worldX: number, worldZ: number): number {
    return this.elevationMap.getContinental(worldX, worldZ);
  }

  getElevationDirect(worldX: number, worldZ: number): number {
    return this.elevationMap.getElevation(worldX, worldZ);
  }

  isChunkValid(gridX: number, gridZ: number): boolean {
    return gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE;
  }

  getChunksInRadius(centerGridX: number, centerGridZ: number, radius: number): ChunkCoord[] {
    const coords: ChunkCoord[] = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = centerGridX + dx;
        const gz = centerGridZ + dz;
        if (this.isChunkValid(gx, gz)) {
          coords.push({ gridX: gx, gridZ: gz });
        }
      }
    }
    return coords;
  }

  worldToGrid(worldX: number, worldZ: number): ChunkCoord {
    return {
      gridX: Math.floor((worldX + HALF_WORLD) / CHUNK_SIZE),
      gridZ: Math.floor((worldZ + HALF_WORLD) / CHUNK_SIZE),
    };
  }

  gridToWorld(gridX: number, gridZ: number): { x: number; z: number } {
    return {
      x: gridX * CHUNK_SIZE - HALF_WORLD + CHUNK_SIZE / 2,
      z: gridZ * CHUNK_SIZE - HALF_WORLD + CHUNK_SIZE / 2,
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder.length = 0;
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  private addToCache(key: string, data: ChunkHeightData): void {
    if (this.cache.size >= this.maxCacheSize) {
      const evictKey = this.cacheOrder.shift();
      if (evictKey) this.cache.delete(evictKey);
    }
    this.cache.set(key, data);
    this.cacheOrder.push(key);
  }
}

function sampleChunkHeight(chunk: ChunkHeightData, worldX: number, worldZ: number): number {
  const res = chunk.resolution;
  const step = chunk.chunkSize / (res - 1);

  const lx = (worldX - chunk.worldX) / step;
  const lz = (worldZ - chunk.worldZ) / step;

  const ix = Math.floor(lx);
  const iz = Math.floor(lz);

  const cix = Math.max(0, Math.min(res - 2, ix));
  const ciz = Math.max(0, Math.min(res - 2, iz));

  const fx = lx - cix;
  const fz = lz - ciz;

  const h00 = chunk.heights[ciz * res + cix];
  const h10 = chunk.heights[ciz * res + cix + 1];
  const h01 = chunk.heights[(ciz + 1) * res + cix];
  const h11 = chunk.heights[(ciz + 1) * res + cix + 1];

  const top = h00 + (h10 - h00) * fx;
  const bottom = h01 + (h11 - h01) * fx;
  return top + (bottom - top) * fz;
}

function chunkKey(gridX: number, gridZ: number): string {
  return `${gridX},${gridZ}`;
}
