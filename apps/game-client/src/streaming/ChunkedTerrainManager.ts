import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { createTerrainPBRMaterial } from '../materials/terrainMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { TerrainDefinition, TerrainChunkDef } from '../scenes/IronvaleOutskirtsScene';
import type { HeightSampler, StreamingConfig } from './types';
import {
  WorldSeed, ChunkGenerator,
  createElevationMap, createClimateMap, createBiomeResolver,
  type BiomeType, type BiomeResolver,
} from '@dracor/world-gen';

interface LoadedChunk {
  mesh: Mesh;
  body: PhysicsBody | null;
  shape: PhysicsShapeMesh | null;
  gridX: number;
  gridZ: number;
  subdivisions: number;
  isFast: boolean;
}

const WORLD_SEED = new WorldSeed('dracor-world-001');
const DYNAMIC_CHUNK_SIZE = 100;

function noise(x: number, z: number): number {
  let h = ((x * 374761393) ^ (z * 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) & 0x7fffffff) / 0x7fffffff;
}

const BIOME_COLORS: Record<string, [number, number, number, number, number, number]> = {
  deep_ocean:      [0.03, 0.06, 0.18,  0.05, 0.10, 0.25],
  shallow_ocean:   [0.06, 0.15, 0.30,  0.10, 0.22, 0.40],
  beach:           [0.70, 0.65, 0.48,  0.78, 0.72, 0.55],
  tropical_beach:  [0.75, 0.70, 0.50,  0.82, 0.75, 0.55],
  grassland:       [0.30, 0.50, 0.18,  0.45, 0.58, 0.22],
  plains:          [0.42, 0.52, 0.22,  0.55, 0.60, 0.28],
  forest:          [0.15, 0.35, 0.10,  0.25, 0.45, 0.15],
  dense_forest:    [0.10, 0.25, 0.08,  0.18, 0.35, 0.10],
  pine_forest:     [0.12, 0.30, 0.12,  0.20, 0.38, 0.18],
  jungle:          [0.08, 0.30, 0.06,  0.15, 0.40, 0.10],
  swamp:           [0.18, 0.25, 0.12,  0.28, 0.32, 0.18],
  desert:          [0.72, 0.60, 0.35,  0.82, 0.68, 0.42],
  badlands:        [0.60, 0.38, 0.20,  0.72, 0.45, 0.25],
  savanna:         [0.55, 0.52, 0.25,  0.65, 0.58, 0.30],
  tundra:          [0.50, 0.55, 0.48,  0.60, 0.62, 0.55],
  snowy_peaks:     [0.82, 0.85, 0.88,  0.92, 0.94, 0.96],
  mountain:        [0.38, 0.36, 0.32,  0.50, 0.48, 0.44],
  alpine_meadow:   [0.35, 0.50, 0.25,  0.45, 0.58, 0.30],
  volcanic:        [0.22, 0.18, 0.15,  0.35, 0.25, 0.20],
  wetlands:        [0.20, 0.32, 0.15,  0.30, 0.40, 0.20],
  cliff:           [0.35, 0.33, 0.30,  0.48, 0.46, 0.42],
  river_valley:    [0.22, 0.38, 0.15,  0.32, 0.48, 0.20],
};

function getBiomeColor(biome: BiomeType, slopeAngle: number, wx: number, wz: number): Color4 {
  const palette = BIOME_COLORS[biome] ?? BIOME_COLORS.grassland;
  const n1 = noise(Math.floor(wx * 0.12), Math.floor(wz * 0.12));
  const n2 = noise(Math.floor(wx * 0.35), Math.floor(wz * 0.35));
  const n3 = noise(Math.floor(wx * 0.06), Math.floor(wz * 0.06));

  let r = palette[0] + (palette[3] - palette[0]) * n1;
  let g = palette[1] + (palette[4] - palette[1]) * n2;
  let b = palette[2] + (palette[5] - palette[2]) * n3;

  const dirtChance = n3 > 0.72 ? (n3 - 0.72) / 0.28 : 0;
  if (dirtChance > 0 && biome !== 'deep_ocean' && biome !== 'shallow_ocean' && biome !== 'snowy_peaks') {
    r = r + (0.40 - r) * dirtChance * 0.4;
    g = g + (0.30 - g) * dirtChance * 0.4;
    b = b + (0.18 - b) * dirtChance * 0.4;
  }

  if (slopeAngle > 12) {
    const rockBlend = Math.min(1, (slopeAngle - 12) / 25);
    r = r + (0.42 + n1 * 0.08 - r) * rockBlend;
    g = g + (0.40 + n2 * 0.06 - g) * rockBlend;
    b = b + (0.36 + n3 * 0.05 - b) * rockBlend;
  }

  return new Color4(
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
    1
  );
}

export class ChunkedTerrainManager {
  private scene: Scene;
  private terrain: TerrainDefinition;
  private config: StreamingConfig;
  private loadedChunks = new Map<string, LoadedChunk>();
  private material: Material;
  private chunkGen: ChunkGenerator | null = null;
  private biomeResolver: BiomeResolver | null = null;
  private _chunkSize: number;
  private worldGenReady = false;

  constructor(scene: Scene, terrain: TerrainDefinition, config: StreamingConfig) {
    this.scene = scene;
    this.terrain = terrain;
    this.config = config;
    this._chunkSize = DYNAMIC_CHUNK_SIZE;

    this.material = createTerrainPBRMaterial(scene);
  }

  async initWorldGen(): Promise<void> {
    if (this.worldGenReady) return;
    this.chunkGen = new ChunkGenerator(WORLD_SEED, 512);
    const elevMap = createElevationMap(WORLD_SEED);
    const climate = createClimateMap(WORLD_SEED, elevMap.getElevation, elevMap.getContinental);
    this.biomeResolver = createBiomeResolver(WORLD_SEED, elevMap.getElevation, elevMap.getContinental, climate);
    this.worldGenReady = true;
    console.log('[Terrain] World gen initialized');
  }

  worldToGrid(worldX: number, worldZ: number): { gridX: number; gridZ: number } {
    return {
      gridX: Math.floor(worldX / this._chunkSize),
      gridZ: Math.floor(worldZ / this._chunkSize),
    };
  }

  getChunkWorldCenter(gridX: number, gridZ: number): { x: number; z: number } {
    return {
      x: gridX * this._chunkSize + this._chunkSize * 0.5,
      z: gridZ * this._chunkSize + this._chunkSize * 0.5,
    };
  }

  getChunksInRadius(playerX: number, playerZ: number, radius: number): Array<{ gridX: number; gridZ: number; dist: number }> {
    const player = this.worldToGrid(playerX, playerZ);
    const chunkRadius = Math.ceil(radius / this._chunkSize);
    const result: Array<{ gridX: number; gridZ: number; dist: number }> = [];

    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const gx = player.gridX + dx;
        const gz = player.gridZ + dz;
        const center = this.getChunkWorldCenter(gx, gz);
        const dist = Math.sqrt((playerX - center.x) ** 2 + (playerZ - center.z) ** 2);
        if (dist <= radius) {
          result.push({ gridX: gx, gridZ: gz, dist });
        }
      }
    }

    result.sort((a, b) => a.dist - b.dist);
    return result;
  }

  private getSubdivisionsForDistance(distance: number): number {
    for (const lod of this.config.terrainLODDistances) {
      if (distance <= lod.distance) return lod.subdivisions;
    }
    return 16;
  }

  private static simpleHeight(x: number, z: number): number {
    let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
    h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
    h += Math.sin(x * 0.07 + 3.1) * Math.cos(z * 0.06 + 2.1) * 0.08;
    h += Math.sin(x * 0.15 + 5.0) * Math.sin(z * 0.12 + 4.0) * 0.03;
    const dist = Math.sqrt(x * x + z * z);
    return h * 30 * Math.min(1, dist / 60);
  }

  loadChunkFast(gridX: number, gridZ: number): void {
    const key = `${gridX}_${gridZ}`;
    if (this.loadedChunks.has(key)) return;

    const center = this.getChunkWorldCenter(gridX, gridZ);
    const subs = 8;
    const mesh = MeshBuilder.CreateGround(
      `terrain_${key}`,
      { width: this._chunkSize, height: this._chunkSize, subdivisions: subs, updatable: true },
      this.scene
    );

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] = ChunkedTerrainManager.simpleHeight(
          positions[i] + center.x, positions[i + 2] + center.z
        );
      }
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      mesh.createNormals(false);
    }

    mesh.material = this.material;
    mesh.receiveShadows = true;
    mesh.position = new Vector3(center.x, 0, center.z);
    mesh.freezeWorldMatrix();

    this.loadedChunks.set(key, { mesh, body: null, shape: null, gridX, gridZ, subdivisions: subs, isFast: true });
  }

  loadChunk(gridX: number, gridZ: number, playerDistance: number): void {
    if (!this.worldGenReady || !this.chunkGen) {
      console.log(`[Terrain] loadChunk(${gridX},${gridZ}) skipped: worldGen=${this.worldGenReady} chunkGen=${!!this.chunkGen}`);
      return;
    }

    const key = `${gridX}_${gridZ}`;
    const targetSubs = this.getSubdivisionsForDistance(playerDistance);

    const existing = this.loadedChunks.get(key);
    if (existing) {
      if (existing.subdivisions === targetSubs && !existing.isFast) return;
      if (existing.body) existing.body.dispose();
      if (existing.shape) existing.shape.dispose();
      existing.mesh.dispose();
      this.loadedChunks.delete(key);
    }

    const center = this.getChunkWorldCenter(gridX, gridZ);
    const overlap = 2;
    const renderSize = this._chunkSize + overlap * 2;
    const mesh = MeshBuilder.CreateGround(
      `terrain_${key}`,
      { width: renderSize, height: renderSize, subdivisions: targetSubs, updatable: true },
      this.scene
    );

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      const vertCount = positions.length / 3;
      const colors = new Float32Array(vertCount * 4);
      const step = renderSize / targetSubs;
      const computeSlope = targetSubs >= 8;

      for (let i = 0; i < positions.length; i += 3) {
        const worldX = positions[i] + center.x;
        const worldZ = positions[i + 2] + center.z;
        const h = this.chunkGen.getHeightAt(worldX, worldZ);
        positions[i + 1] = h;

        let slopeAngle = 0;
        if (computeSlope) {
          const hR = this.chunkGen.getHeightAt(worldX + step, worldZ);
          const hF = this.chunkGen.getHeightAt(worldX, worldZ + step);
          const slopeX = (hR - h) / step;
          const slopeZ = (hF - h) / step;
          slopeAngle = Math.atan(Math.sqrt(slopeX * slopeX + slopeZ * slopeZ)) * (180 / Math.PI);
        }

        const biome = this.biomeResolver!.getBiomeType(worldX, worldZ);
        const color = getBiomeColor(biome, slopeAngle, worldX, worldZ);
        const vi = (i / 3) * 4;
        colors[vi] = color.r;
        colors[vi + 1] = color.g;
        colors[vi + 2] = color.b;
        colors[vi + 3] = 1;
      }

      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      mesh.setVerticesData(VertexBuffer.ColorKind, colors);
      mesh.hasVertexAlpha = false;
      mesh.createNormals(false);
    }

    mesh.material = this.material;
    mesh.receiveShadows = true;
    mesh.position = new Vector3(center.x, 0, center.z);
    mesh.freezeWorldMatrix();

    // Create static physics collider from terrain mesh geometry
    let body: PhysicsBody | null = null;
    let shape: PhysicsShapeMesh | null = null;
    if (this.scene.getPhysicsEngine()) {
      shape = new PhysicsShapeMesh(mesh, this.scene);
      body = new PhysicsBody(mesh, PhysicsMotionType.STATIC, false, this.scene);
      body.shape = shape;
    }

    this.loadedChunks.set(key, { mesh, body, shape, gridX, gridZ, subdivisions: targetSubs, isFast: false });
  }

  unloadChunk(gridX: number, gridZ: number): void {
    const key = `${gridX}_${gridZ}`;
    const chunk = this.loadedChunks.get(key);
    if (chunk) {
      if (chunk.body) chunk.body.dispose();
      if (chunk.shape) chunk.shape.dispose();
      chunk.mesh.dispose();
      this.loadedChunks.delete(key);
    }
  }

  private static MAX_CHUNKS_PER_FRAME = 2;
  private static MAX_LOD_CHANGES_PER_FRAME = 1;

  updateAroundPlayer(playerPosition: Vector3): void {
    const loadDist = this.config.loadDistance;
    const unloadDist = this.config.unloadDistance;

    const needed = this.getChunksInRadius(playerPosition.x, playerPosition.z, loadDist);
    const neededKeys = new Set(needed.map(c => `${c.gridX}_${c.gridZ}`));

    for (const [key, chunk] of this.loadedChunks) {
      if (!neededKeys.has(key)) {
        const center = this.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
        const dist = Math.sqrt((playerPosition.x - center.x) ** 2 + (playerPosition.z - center.z) ** 2);
        if (dist > unloadDist) {
          this.unloadChunk(chunk.gridX, chunk.gridZ);
        }
      }
    }

    let loaded = 0;
    for (const coord of needed) {
      if (loaded >= ChunkedTerrainManager.MAX_CHUNKS_PER_FRAME) break;
      const key = `${coord.gridX}_${coord.gridZ}`;
      if (!this.loadedChunks.has(key)) {
        this.loadChunk(coord.gridX, coord.gridZ, coord.dist);
        loaded++;
      }
    }
  }

  updateLOD(playerPosition: Vector3): void {
    this.updateAroundPlayer(playerPosition);

    let changes = 0;
    for (const [, chunk] of this.loadedChunks) {
      if (changes >= ChunkedTerrainManager.MAX_LOD_CHANGES_PER_FRAME) break;
      const center = this.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
      const dist = Math.sqrt(
        (playerPosition.x - center.x) ** 2 + (playerPosition.z - center.z) ** 2
      );
      const targetSubs = this.getSubdivisionsForDistance(dist);

      const needsUpgrade = chunk.subdivisions !== targetSubs || (chunk.isFast && this.worldGenReady);
      if (needsUpgrade) {
        this.loadChunk(chunk.gridX, chunk.gridZ, dist);
        changes++;
      }
    }
  }

  getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  isChunkLoaded(gridX: number, gridZ: number): boolean {
    return this.loadedChunks.has(`${gridX}_${gridZ}`);
  }

  getLoadedSubdivisions(gridX: number, gridZ: number): number {
    return this.loadedChunks.get(`${gridX}_${gridZ}`)?.subdivisions ?? 0;
  }

  getHeightAt: HeightSampler = (x: number, z: number): number => {
    if (this.chunkGen) return this.chunkGen.getHeightAt(x, z);
    return ChunkedTerrainManager.simpleHeight(x, z);
  };

  getAllChunkDefs(): TerrainChunkDef[] {
    return this.terrain.chunks;
  }

  get chunkSize(): number { return this._chunkSize; }

  dispose(): void {
    for (const [, chunk] of this.loadedChunks) {
      if (chunk.body) chunk.body.dispose();
      if (chunk.shape) chunk.shape.dispose();
      chunk.mesh.dispose();
    }
    this.loadedChunks.clear();
    this.material.dispose();
  }
}
