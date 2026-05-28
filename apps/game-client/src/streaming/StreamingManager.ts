import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import type { QualitySettings, ZoneManifest } from '../scenes/IronvaleOutskirtsScene';
import type { StreamingConfig, HeightSampler } from './types';
import { ChunkedTerrainManager } from './ChunkedTerrainManager';
import { FoliageStreamingManager } from './FoliageStreamingManager';
import { VRAMBudgetManager } from './VRAMBudgetManager';
import type { ExclusionData } from '../world/placementEngine';

export interface StreamingSceneResult {
  getHeightAt: HeightSampler;
  updateWind: (dt: number) => void;
}

const STREAMING_CONFIGS: Record<string, StreamingConfig> = {
  ultra: {
    loadDistance: 800,
    unloadDistance: 1000,
    maxLoadedCells: 120,
    maxConcurrentLoads: 6,
    rebuildThreshold: 15,
    foliageDensityFalloff: [
      { distance: 60, density: 1.0 },
      { distance: 150, density: 0.5 },
      { distance: 300, density: 0.15 },
      { distance: 500, density: 0.03 },
      { distance: 800, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 16 },
      { distance: 250, subdivisions: 8 },
      { distance: 500, subdivisions: 4 },
      { distance: 800, subdivisions: 2 },
    ],
  },
  high: {
    loadDistance: 600,
    unloadDistance: 800,
    maxLoadedCells: 80,
    maxConcurrentLoads: 4,
    rebuildThreshold: 18,
    foliageDensityFalloff: [
      { distance: 50, density: 1.0 },
      { distance: 120, density: 0.4 },
      { distance: 250, density: 0.1 },
      { distance: 600, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 12 },
      { distance: 200, subdivisions: 6 },
      { distance: 400, subdivisions: 3 },
      { distance: 600, subdivisions: 2 },
    ],
  },
  medium: {
    loadDistance: 400,
    unloadDistance: 550,
    maxLoadedCells: 50,
    maxConcurrentLoads: 3,
    rebuildThreshold: 20,
    foliageDensityFalloff: [
      { distance: 40, density: 1.0 },
      { distance: 100, density: 0.3 },
      { distance: 200, density: 0.05 },
      { distance: 400, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 80, subdivisions: 8 },
      { distance: 200, subdivisions: 4 },
      { distance: 400, subdivisions: 2 },
    ],
  },
  low: {
    loadDistance: 250,
    unloadDistance: 400,
    maxLoadedCells: 30,
    maxConcurrentLoads: 2,
    rebuildThreshold: 25,
    foliageDensityFalloff: [
      { distance: 30, density: 1.0 },
      { distance: 80, density: 0.2 },
      { distance: 150, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 60, subdivisions: 6 },
      { distance: 150, subdivisions: 3 },
      { distance: 250, subdivisions: 2 },
    ],
  },
};

function buildExclusionData(manifest: ZoneManifest): ExclusionData {
  const roadSegments: ExclusionData['roadSegments'] = [];
  for (const road of manifest.roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      roadSegments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, width: road.width });
    }
  }

  const waterBodies: ExclusionData['waterBodies'] = manifest.water.map(w => ({
    x: w.position.x, z: w.position.z,
    radiusX: w.size.width * 0.5, radiusZ: w.size.depth * 0.5,
  }));

  const landmarks: ExclusionData['landmarks'] = manifest.landmarks.map(lm => ({
    x: lm.position.x, z: lm.position.z, radius: (lm.scale ?? 1) * 5,
  }));

  const spawns: ExclusionData['spawns'] = manifest.spawns.map(sp => ({
    x: sp.position.x, z: sp.position.z, radius: sp.radius ?? 5,
  }));

  return { roadSegments, waterBodies, landmarks, spawns };
}

export class StreamingManager {
  private scene: Scene;
  private quality: QualitySettings;
  private manifest: ZoneManifest;
  private config: StreamingConfig;
  private terrain: ChunkedTerrainManager;
  private foliage: FoliageStreamingManager;
  private vramBudget: VRAMBudgetManager;
  private exclusions: ExclusionData;
  private updateCounter = 0;

  constructor(scene: Scene, quality: QualitySettings, manifest: ZoneManifest) {
    this.scene = scene;
    this.quality = quality;
    this.manifest = manifest;
    this.config = STREAMING_CONFIGS[quality.tier] ?? STREAMING_CONFIGS.medium;

    this.terrain = new ChunkedTerrainManager(scene, manifest.terrain, this.config);

    const maxMB = quality.tier === 'ultra' ? 1024 : quality.tier === 'high' ? 512 : quality.tier === 'medium' ? 256 : 128;
    this.vramBudget = new VRAMBudgetManager(maxMB, (asset) => {
      // Parse cellId "gridX_gridZ" and unload the terrain chunk
      const parts = asset.cellId.split('_');
      if (parts.length === 2) {
        const gridX = parseInt(parts[0], 10);
        const gridZ = parseInt(parts[1], 10);
        if (!isNaN(gridX) && !isNaN(gridZ)) {
          this.terrain.unloadChunk(gridX, gridZ);
        }
      }
    });
    this.exclusions = buildExclusionData(manifest);

    this.foliage = new FoliageStreamingManager(
      scene, quality, this.config,
      this.terrain.getHeightAt
    );

  }

  private foliageReady = false;

  async loadInitialArea(spawnPosition: Vector3): Promise<StreamingSceneResult> {
    console.log('[Streaming] Loading initial area (fast path)...');

    const spawnGX = Math.floor(spawnPosition.x / this.terrain.chunkSize);
    const spawnGZ = Math.floor(spawnPosition.z / this.terrain.chunkSize);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.terrain.loadChunkFast(spawnGX + dx, spawnGZ + dz);
      }
    }
    console.log('[Streaming] 9 spawn chunks loaded — rest will stream');

    this.loadFoliageAsync(spawnPosition);

    return {
      getHeightAt: this.terrain.getHeightAt,
      updateWind: this.foliage.getUpdateWind(),
    };
  }

  private async loadFoliageAsync(spawnPosition: Vector3): Promise<void> {
    await new Promise(r => setTimeout(r, 500));
    try {
      console.log('[Streaming] Initializing world gen...');
      await this.terrain.initWorldGen();

      console.log('[Streaming] Generating foliage...');
      await this.foliage.generateAllPlacements(
        this.manifest.foliage, this.manifest.rocks, this.exclusions
      );
      this.foliage.updateInstanceBuffers(spawnPosition);
      this.foliageReady = true;
      console.log('[Streaming] World gen + foliage ready');
    } catch (err) {
      console.warn('[Streaming] Async load failed:', err);
    }
  }

  update(playerPosition: Vector3, _cameraForward: Vector3, _dt: number): void {
    this.foliage.updateInstanceBuffers(playerPosition);

    this.updateCounter++;
    if (this.updateCounter % 15 !== 0) return;

    this.terrain.updateLOD(playerPosition);

  }

  getStreamingStats(): {
    loadedCells: number;
    totalCells: number;
    loadingCells: number;
    vramUsage: { textureMB: number; meshMB: number; totalMB: number };
  } {
    return {
      loadedCells: this.terrain.getLoadedChunkCount(),
      totalCells: 0,
      loadingCells: 0,
      vramUsage: this.vramBudget.getUsage(),
    };
  }

  dispose(): void {
    this.terrain.dispose();
    this.foliage.dispose();
    this.vramBudget.dispose();
  }
}
