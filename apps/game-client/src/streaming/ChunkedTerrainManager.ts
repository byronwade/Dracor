import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
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
    this.material.diffuseColor = new Color3(0.14, 0.13, 0.09);
    this.material.specularColor = new Color3(0.01, 0.01, 0.01);
    this.material.roughness = 1.0;
    this.material.ambientColor = new Color3(0.04, 0.05, 0.03);
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

  getChunksInRadius(playerX: number, playerZ: number, radius: number): Array<{ gridX: number; gridZ: number }> {
    const player = this.worldToGrid(playerX, playerZ);
    const chunkRadius = Math.ceil(radius / this._chunkSize);
    const result: Array<{ gridX: number; gridZ: number }> = [];

    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const gx = player.gridX + dx;
        const gz = player.gridZ + dz;
        const center = this.getChunkWorldCenter(gx, gz);
        const dist = Math.sqrt((playerX - center.x) ** 2 + (playerZ - center.z) ** 2);
        if (dist <= radius) {
          result.push({ gridX: gx, gridZ: gz });
        }
      }
    }

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
    const mesh = MeshBuilder.CreateGround(
      `terrain_${key}`,
      { width: this._chunkSize, height: this._chunkSize, subdivisions: targetSubs, updatable: false },
      this.scene
    );

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const worldX = positions[i] + center.x;
        const worldZ = positions[i + 2] + center.z;
        positions[i + 1] = this.chunkGen.getHeightAt(worldX, worldZ);
      }
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
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

    for (const [key, chunk] of this.loadedChunks) {
      if (!neededKeys.has(key)) {
        const center = this.getChunkWorldCenter(chunk.gridX, chunk.gridZ);
        const dist = Math.sqrt((playerPosition.x - center.x) ** 2 + (playerPosition.z - center.z) ** 2);
        if (dist > unloadDist) {
          this.unloadChunk(chunk.gridX, chunk.gridZ);
        }
      }
    }

    for (const coord of needed) {
      const key = `${coord.gridX}_${coord.gridZ}`;
      if (!this.loadedChunks.has(key)) {
        const center = this.getChunkWorldCenter(coord.gridX, coord.gridZ);
        const dist = Math.sqrt((playerPosition.x - center.x) ** 2 + (playerPosition.z - center.z) ** 2);
        this.loadChunk(coord.gridX, coord.gridZ, dist);
      }
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
