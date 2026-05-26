import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { TerrainDefinition, TerrainChunkDef } from '../scenes/IronvaleOutskirtsScene';
import type { HeightSampler, StreamingConfig } from './types';
import { WorldSeed, ChunkGenerator } from '@dracor/world-gen';

interface LoadedChunk {
  mesh: Mesh;
  gridX: number;
  gridZ: number;
  subdivisions: number;
}

const WORLD_SEED = new WorldSeed('dracor-world-001');
const DYNAMIC_CHUNK_SIZE = 100;

const COLOR_DEEP_WATER = new Color4(0.05, 0.12, 0.25, 1);
const COLOR_SHALLOW_WATER = new Color4(0.10, 0.25, 0.40, 1);
const COLOR_SAND = new Color4(0.76, 0.70, 0.55, 1);
const COLOR_GRASS = new Color4(0.30, 0.55, 0.20, 1);
const COLOR_DARK_GRASS = new Color4(0.20, 0.40, 0.12, 1);
const COLOR_FOREST_FLOOR = new Color4(0.25, 0.30, 0.15, 1);
const COLOR_ROCK = new Color4(0.50, 0.48, 0.45, 1);
const COLOR_DARK_ROCK = new Color4(0.35, 0.33, 0.30, 1);
const COLOR_SNOW = new Color4(0.90, 0.92, 0.95, 1);
const COLOR_DIRT = new Color4(0.45, 0.35, 0.22, 1);

function lerpColor(a: Color4, b: Color4, t: number): Color4 {
  const ct = Math.max(0, Math.min(1, t));
  return new Color4(
    a.r + (b.r - a.r) * ct,
    a.g + (b.g - a.g) * ct,
    a.b + (b.b - a.b) * ct,
    1
  );
}

function getTerrainColor(height: number, slopeAngle: number): Color4 {
  if (height < -5) {
    const t = Math.min(1, (-height - 5) / 30);
    return lerpColor(COLOR_SHALLOW_WATER, COLOR_DEEP_WATER, t);
  }

  if (height < 1) {
    const t = (height + 5) / 6;
    return lerpColor(COLOR_SHALLOW_WATER, COLOR_SAND, t);
  }

  if (height < 4) {
    const t = (height - 1) / 3;
    return lerpColor(COLOR_SAND, COLOR_GRASS, t);
  }

  let baseColor: Color4;
  if (height < 30) {
    const t = (height - 4) / 26;
    baseColor = lerpColor(COLOR_GRASS, COLOR_DARK_GRASS, t);
  } else if (height < 60) {
    const t = (height - 30) / 30;
    baseColor = lerpColor(COLOR_DARK_GRASS, COLOR_FOREST_FLOOR, t);
  } else if (height < 100) {
    const t = (height - 60) / 40;
    baseColor = lerpColor(COLOR_FOREST_FLOOR, COLOR_ROCK, t);
  } else if (height < 140) {
    const t = (height - 100) / 40;
    baseColor = lerpColor(COLOR_ROCK, COLOR_SNOW, t);
  } else {
    baseColor = COLOR_SNOW;
  }

  if (slopeAngle > 25) {
    const rockBlend = Math.min(1, (slopeAngle - 25) / 20);
    const rockColor = height > 80 ? COLOR_DARK_ROCK : COLOR_ROCK;
    baseColor = lerpColor(baseColor, rockColor, rockBlend);
  }

  return baseColor;
}

export class ChunkedTerrainManager {
  private scene: Scene;
  private terrain: TerrainDefinition;
  private config: StreamingConfig;
  private loadedChunks = new Map<string, LoadedChunk>();
  private material: StandardMaterial;
  private chunkGen: ChunkGenerator;
  private _chunkSize: number;

  constructor(scene: Scene, terrain: TerrainDefinition, config: StreamingConfig) {
    this.scene = scene;
    this.terrain = terrain;
    this.config = config;
    this.chunkGen = new ChunkGenerator(WORLD_SEED, 512);
    this._chunkSize = DYNAMIC_CHUNK_SIZE;

    this.material = new StandardMaterial('terrainMat', scene);
    this.material.diffuseColor = new Color3(1, 1, 1);
    this.material.specularColor = new Color3(0.02, 0.02, 0.02);
    this.material.roughness = 1.0;
    this.material.ambientColor = new Color3(0.3, 0.3, 0.3);
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

  loadChunk(gridX: number, gridZ: number, playerDistance: number): void {
    const key = `${gridX}_${gridZ}`;
    const targetSubs = this.getSubdivisionsForDistance(playerDistance);

    const existing = this.loadedChunks.get(key);
    if (existing) {
      if (existing.subdivisions === targetSubs) return;
      existing.mesh.dispose();
      this.loadedChunks.delete(key);
    }

    const center = this.getChunkWorldCenter(gridX, gridZ);
    const overlap = 2;
    const renderSize = this._chunkSize + overlap * 2;
    const mesh = MeshBuilder.CreateGround(
      `terrain_${key}`,
      { width: renderSize, height: renderSize, subdivisions: targetSubs, updatable: false },
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

        const color = getTerrainColor(h, slopeAngle);
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

    this.loadedChunks.set(key, { mesh, gridX, gridZ, subdivisions: targetSubs });
  }

  unloadChunk(gridX: number, gridZ: number): void {
    const key = `${gridX}_${gridZ}`;
    const chunk = this.loadedChunks.get(key);
    if (chunk) {
      chunk.mesh.dispose();
      this.loadedChunks.delete(key);
    }
  }

  updateAroundPlayer(playerPosition: Vector3): void {
    const loadDist = this.config.loadDistance;
    const unloadDist = this.config.unloadDistance;

    const needed = this.getChunksInRadius(playerPosition.x, playerPosition.z, loadDist);
    const neededKeys = new Set(needed.map(c => `${c.gridX}_${c.gridZ}`));

    const toUnload: Array<{ gridX: number; gridZ: number }> = [];
    for (const [key, chunk] of this.loadedChunks) {
      if (!neededKeys.has(key)) {
        const center = this.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
        const dist = Math.sqrt((playerPosition.x - center.x) ** 2 + (playerPosition.z - center.z) ** 2);
        if (dist > unloadDist) {
          toUnload.push({ gridX: chunk.gridX, gridZ: chunk.gridZ });
        }
      }
    }
    for (const c of toUnload) this.unloadChunk(c.gridX, c.gridZ);

    let loaded = 0;
    for (const coord of needed) {
      const key = `${coord.gridX}_${coord.gridZ}`;
      if (!this.loadedChunks.has(key)) {
        this.loadChunk(coord.gridX, coord.gridZ, coord.dist);
        loaded++;
      }
    }

    if (loaded > 0) {
      console.log(`[Terrain] Loaded ${loaded} chunks (total: ${this.loadedChunks.size}, needed: ${needed.length})`);
    }
  }

  updateLOD(playerPosition: Vector3): void {
    this.updateAroundPlayer(playerPosition);

    for (const [, chunk] of this.loadedChunks) {
      const center = this.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
      const dx = playerPosition.x - center.x;
      const dz = playerPosition.z - center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const targetSubs = this.getSubdivisionsForDistance(dist);

      if (chunk.subdivisions !== targetSubs) {
        this.loadChunk(chunk.gridX, chunk.gridZ, dist);
      }
    }
  }

  isChunkLoaded(gridX: number, gridZ: number): boolean {
    return this.loadedChunks.has(`${gridX}_${gridZ}`);
  }

  getLoadedSubdivisions(gridX: number, gridZ: number): number {
    return this.loadedChunks.get(`${gridX}_${gridZ}`)?.subdivisions ?? 0;
  }

  getHeightAt: HeightSampler = (x: number, z: number): number => {
    return this.chunkGen.getHeightAt(x, z);
  };

  getAllChunkDefs(): TerrainChunkDef[] {
    return this.terrain.chunks;
  }

  get chunkSize(): number { return this._chunkSize; }

  dispose(): void {
    for (const [, chunk] of this.loadedChunks) {
      chunk.mesh.dispose();
    }
    this.loadedChunks.clear();
    this.material.dispose();
  }
}
