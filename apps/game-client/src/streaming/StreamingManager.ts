import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

import type { QualitySettings, ZoneManifest } from '../scenes/IronvaleOutskirtsScene';
import type { CellState, CellPriority, StreamingConfig, HeightSampler } from './types';
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

interface CellInfo {
  id: string;
  gridX: number;
  gridZ: number;
  centerX: number;
  centerZ: number;
  state: CellState;
  priority: CellPriority;
}

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
  private cells = new Map<string, CellInfo>();
  private terrain: ChunkedTerrainManager;
  private foliage: FoliageStreamingManager;
  private vramBudget: VRAMBudgetManager;
  private exclusions: ExclusionData;
  private updateCounter = 0;
  private loadingCells = new Set<string>();

  constructor(scene: Scene, quality: QualitySettings, manifest: ZoneManifest) {
    this.scene = scene;
    this.quality = quality;
    this.manifest = manifest;
    this.config = STREAMING_CONFIGS[quality.tier] ?? STREAMING_CONFIGS.medium;

    this.terrain = new ChunkedTerrainManager(scene, manifest.terrain, this.config);

    const maxMB = quality.tier === 'ultra' ? 1024 : quality.tier === 'high' ? 512 : quality.tier === 'medium' ? 256 : 128;
    this.vramBudget = new VRAMBudgetManager(maxMB);
    this.exclusions = buildExclusionData(manifest);

    this.foliage = new FoliageStreamingManager(
      scene, quality, this.config,
      this.terrain.getHeightAt
    );

    for (const chunk of manifest.terrain.chunks) {
      const center = this.terrain.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
      const cellId = `cell_${chunk.gridX}_${chunk.gridZ}`;
      this.cells.set(cellId, {
        id: cellId,
        gridX: chunk.gridX,
        gridZ: chunk.gridZ,
        centerX: center.x,
        centerZ: center.z,
        state: 'unloaded',
        priority: 'low',
      });
    }
  }

  async loadInitialArea(spawnPosition: Vector3): Promise<StreamingSceneResult> {
    console.log('[Streaming] Loading initial area...');

    const sky = createSkyAndAtmosphere(this.scene, this.quality);
    const h = this.terrain.getHeightAt;
    createDistantMountains(this.scene, h);
    for (const road of this.manifest.roads) createRoadFromManifest(road, this.scene, h);
    for (const landmark of this.manifest.landmarks) {
      if (landmark.type === 'shrine') createShrineFromManifest(landmark, this.scene, h);
      else createLandmarksFromManifest(landmark, this.scene, h);
    }
    for (const water of this.manifest.water) createWater(water, this.scene, h);

    // Generate all foliage placements once globally (not per-cell)
    await this.foliage.generateAllPlacements(
      this.manifest.foliage, this.manifest.rocks, this.exclusions
    );

    this.updateCellPriorities(spawnPosition, new Vector3(0, 0, 1));

    const cellsToLoad = [...this.cells.values()]
      .filter(c => this.distanceToCell(spawnPosition, c) < this.config.loadDistance)
      .sort((a, b) => this.distanceToCell(spawnPosition, a) - this.distanceToCell(spawnPosition, b));

    await Promise.all(cellsToLoad.map(cell => this.loadCell(cell, spawnPosition)));

    this.foliage.updateInstanceBuffers(spawnPosition);

    const loaded = cellsToLoad.filter(c => c.state === 'loaded').length;
    console.log(`[Streaming] Initial load complete. ${loaded}/${this.cells.size} cells loaded.`);

    return {
      getHeightAt: this.terrain.getHeightAt,
      updateWind: this.foliage.getUpdateWind(),
      sky,
    };
  }

  update(playerPosition: Vector3, cameraForward: Vector3, _dt: number): void {
    this.foliage.updateInstanceBuffers(playerPosition);

    this.updateCounter++;
    if (this.updateCounter % 10 !== 0) return;

    this.updateCellPriorities(playerPosition, cameraForward);

    for (const [, cell] of this.cells) {
      const dist = this.distanceToCell(playerPosition, cell);

      if (cell.state === 'unloaded' && dist < this.config.loadDistance && !this.loadingCells.has(cell.id)) {
        if (this.getLoadedCellCount() < this.config.maxLoadedCells) {
          this.loadCell(cell, playerPosition);
        }
      }

      if (cell.state === 'loaded' && dist > this.config.unloadDistance) {
        this.unloadCell(cell);
      }
    }

    this.terrain.updateLOD(playerPosition);

    if (this.vramBudget.isOverBudget()) {
      const protectedCells = this.getProtectedCells();
      const evicted = this.vramBudget.evictUntilUnderBudget(protectedCells);
      if (evicted.length > 0) {
        console.log(`[Streaming] Evicted ${evicted.length} assets (VRAM over budget)`);
      }
    }
  }

  private async loadCell(cell: CellInfo, playerPosition: Vector3): Promise<void> {
    if (cell.state !== 'unloaded') return;

    cell.state = 'loading';
    this.loadingCells.add(cell.id);

    try {
      const dist = this.distanceToCell(playerPosition, cell);
      this.terrain.loadChunk(cell.gridX, cell.gridZ, dist);

      const chunkSubs = this.terrain.getLoadedSubdivisions(cell.gridX, cell.gridZ);
      const vertCount = (chunkSubs + 1) * (chunkSubs + 1);
      const chunkMemMB = (vertCount * 12 + chunkSubs * chunkSubs * 6 * 2) / (1024 * 1024);
      this.vramBudget.trackAsset(`terrain_${cell.gridX}_${cell.gridZ}`, 'mesh', chunkMemMB, cell.id);

      cell.state = 'loaded';
    } catch (err) {
      console.warn(`[Streaming] Failed to load cell ${cell.id}:`, err);
      cell.state = 'unloaded';
    } finally {
      this.loadingCells.delete(cell.id);
    }
  }

  private unloadCell(cell: CellInfo): void {
    if (cell.state !== 'loaded') return;

    cell.state = 'unloading';
    this.terrain.unloadChunk(cell.gridX, cell.gridZ);
    this.vramBudget.untrackAsset(`terrain_${cell.gridX}_${cell.gridZ}`);
    cell.state = 'unloaded';
  }

  private updateCellPriorities(playerPosition: Vector3, cameraForward: Vector3): void {
    const chunkSize = this.terrain.chunkSize;

    for (const [, cell] of this.cells) {
      const dist = this.distanceToCell(playerPosition, cell);

      if (dist < chunkSize * 0.7) {
        cell.priority = 'critical';
      } else if (dist < chunkSize * 1.5) {
        cell.priority = 'high';
      } else if (dist < chunkSize * 2.5) {
        const toCellX = cell.centerX - playerPosition.x;
        const toCellZ = cell.centerZ - playerPosition.z;
        const toCellLen = Math.sqrt(toCellX * toCellX + toCellZ * toCellZ);
        if (toCellLen > 0) {
          const dot = (toCellX / toCellLen) * cameraForward.x + (toCellZ / toCellLen) * cameraForward.z;
          cell.priority = dot > 0.5 ? 'high' : 'medium';
        } else {
          cell.priority = 'medium';
        }
      } else {
        cell.priority = 'low';
      }
    }
  }

  private distanceToCell(pos: Vector3, cell: CellInfo): number {
    const dx = pos.x - cell.centerX;
    const dz = pos.z - cell.centerZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private getLoadedCellCount(): number {
    let count = 0;
    for (const [, cell] of this.cells) {
      if (cell.state === 'loaded' || cell.state === 'loading') count++;
    }
    return count;
  }

  private getProtectedCells(): Set<string> {
    const cells = new Set<string>();
    for (const [, cell] of this.cells) {
      if (cell.priority === 'critical' || cell.priority === 'high') cells.add(cell.id);
    }
    return cells;
  }

  getStreamingStats(): {
    loadedCells: number;
    totalCells: number;
    loadingCells: number;
    vramUsage: { textureMB: number; meshMB: number; totalMB: number };
  } {
    let loaded = 0;
    for (const [, cell] of this.cells) {
      if (cell.state === 'loaded') loaded++;
    }
    return {
      loadedCells: loaded,
      totalCells: this.cells.size,
      loadingCells: this.loadingCells.size,
      vramUsage: this.vramBudget.getUsage(),
    };
  }

  getHeightAt(): HeightSampler {
    return this.terrain.getHeightAt;
  }

  dispose(): void {
    this.terrain.dispose();
    this.foliage.dispose();
    this.vramBudget.dispose();
    this.cells.clear();
    this.loadingCells.clear();
  }
}
