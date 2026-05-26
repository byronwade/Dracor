import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import type { QualitySettings, ZoneManifest } from '../scenes/IronvaleOutskirtsScene';
import type { StreamingConfig, HeightSampler } from './types';
import { ChunkedTerrainManager } from './ChunkedTerrainManager';
import { FoliageStreamingManager } from './FoliageStreamingManager';
import { VRAMBudgetManager } from './VRAMBudgetManager';
import type { ExclusionData } from '../world/placementEngine';

import { createRoadFromManifest } from '../world/createRoadFromManifest';
import { createShrineFromManifest } from '../world/createShrineFromManifest';
import { createLandmarksFromManifest } from '../world/createLandmarksFromManifest';
import { createWater } from '../world/createWater';
import { createSkyAndAtmosphere, type SkyResult } from '../world/createSkyAndAtmosphere';
import { createDistantMountains } from '../world/createDistantMountains';

export interface StreamingSceneResult {
  getHeightAt: HeightSampler;
  updateWind: (dt: number) => void;
  sky: SkyResult;
}

const STREAMING_CONFIGS: Record<string, StreamingConfig> = {
  ultra: {
    loadDistance: 300,
    unloadDistance: 400,
    maxLoadedCells: 25,
    maxConcurrentLoads: 4,
    rebuildThreshold: 15,
    foliageDensityFalloff: [
      { distance: 60, density: 1.0 },
      { distance: 120, density: 0.7 },
      { distance: 200, density: 0.4 },
      { distance: 300, density: 0.15 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 128 },
      { distance: 200, subdivisions: 64 },
      { distance: 300, subdivisions: 32 },
      { distance: 400, subdivisions: 16 },
    ],
  },
  high: {
    loadDistance: 200,
    unloadDistance: 300,
    maxLoadedCells: 17,
    maxConcurrentLoads: 3,
    rebuildThreshold: 18,
    foliageDensityFalloff: [
      { distance: 50, density: 1.0 },
      { distance: 100, density: 0.6 },
      { distance: 150, density: 0.3 },
      { distance: 200, density: 0.1 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 96 },
      { distance: 200, subdivisions: 48 },
      { distance: 300, subdivisions: 16 },
    ],
  },
  medium: {
    loadDistance: 150,
    unloadDistance: 200,
    maxLoadedCells: 13,
    maxConcurrentLoads: 2,
    rebuildThreshold: 20,
    foliageDensityFalloff: [
      { distance: 40, density: 1.0 },
      { distance: 80, density: 0.5 },
      { distance: 120, density: 0.2 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 64 },
      { distance: 200, subdivisions: 32 },
    ],
  },
  low: {
    loadDistance: 100,
    unloadDistance: 150,
    maxLoadedCells: 9,
    maxConcurrentLoads: 1,
    rebuildThreshold: 25,
    foliageDensityFalloff: [
      { distance: 30, density: 1.0 },
      { distance: 60, density: 0.4 },
      { distance: 100, density: 0.1 },
    ],
    terrainLODDistances: [
      { distance: 80, subdivisions: 48 },
      { distance: 150, subdivisions: 16 },
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

  async loadInitialArea(spawnPosition: Vector3): Promise<StreamingSceneResult> {
    console.log('[Streaming] Loading initial area...');

    const sky = createSkyAndAtmosphere(this.scene, this.quality);

    await this.foliage.generateAllPlacements(
      this.manifest.foliage, this.manifest.rocks, this.exclusions
    );

    this.terrain.updateAroundPlayer(spawnPosition);

    this.foliage.updateInstanceBuffers(spawnPosition);

    const chunkCount = this.terrain.getChunksInRadius(
      spawnPosition.x, spawnPosition.z, this.config.loadDistance
    ).length;
    console.log(`[Streaming] Initial load complete. ${chunkCount} terrain chunks loaded.`);

    return {
      getHeightAt: this.terrain.getHeightAt,
      updateWind: this.foliage.getUpdateWind(),
      sky,
    };
  }

  update(playerPosition: Vector3, _cameraForward: Vector3, _dt: number): void {
    this.foliage.updateInstanceBuffers(playerPosition);

    this.updateCounter++;
    if (this.updateCounter % 10 !== 0) return;

    this.terrain.updateLOD(playerPosition);

  }

  getStreamingStats(): {
    loadedCells: number;
    totalCells: number;
    loadingCells: number;
    vramUsage: { textureMB: number; meshMB: number; totalMB: number };
  } {
    return {
      loadedCells: 0,
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
