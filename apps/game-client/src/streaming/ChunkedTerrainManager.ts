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

function hashPos(x: number, z: number): number {
  let h = ((x * 374761393) ^ (z * 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) & 0x7fffffff) / 0x7fffffff;
}

function hashPos2(x: number, z: number): number {
  let h = ((x * 123456789) ^ (z * 987654321)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2654435769);
  return ((h ^ (h >>> 13)) & 0x7fffffff) / 0x7fffffff;
}

function lerpC(ar: number, ag: number, ab: number, br: number, bg: number, bb: number, t: number): Color4 {
  const ct = t < 0 ? 0 : t > 1 ? 1 : t;
  return new Color4(ar + (br - ar) * ct, ag + (bg - ag) * ct, ab + (bb - ab) * ct, 1);
}

function getTerrainColor(height: number, slopeAngle: number, worldX: number, worldZ: number): Color4 {
  const n1 = hashPos(Math.floor(worldX * 0.15), Math.floor(worldZ * 0.15));
  const n2 = hashPos2(Math.floor(worldX * 0.05), Math.floor(worldZ * 0.05));
  const n3 = hashPos(Math.floor(worldX * 0.4), Math.floor(worldZ * 0.4));

  if (height < -5) {
    const t = Math.min(1, (-height - 5) / 30);
    return lerpC(0.08, 0.20, 0.35, 0.03, 0.08, 0.20, t);
  }

  if (height < 1) {
    const t = (height + 5) / 6;
    const sandVar = n1 * 0.1;
    return lerpC(0.08, 0.20, 0.35, 0.72 + sandVar, 0.65 + sandVar, 0.48 + sandVar * 0.5, t);
  }

  if (height < 5) {
    const t = (height - 1) / 4;
    return lerpC(0.72, 0.65, 0.48, 0.45 + n1 * 0.15, 0.55 + n2 * 0.1, 0.25, t);
  }

  let r: number, g: number, b: number;

  if (height < 20) {
    const dirtPatch = n2 > 0.7 ? (n2 - 0.7) / 0.3 : 0;
    const yellowGrass = n1 > 0.6 ? (n1 - 0.6) / 0.4 : 0;
    r = 0.25 + n3 * 0.08 + dirtPatch * 0.2 + yellowGrass * 0.15;
    g = 0.48 + n1 * 0.1 - dirtPatch * 0.15 + yellowGrass * 0.05;
    b = 0.15 + n3 * 0.05 - dirtPatch * 0.05;
  } else if (height < 40) {
    const t = (height - 20) / 20;
    const darkPatch = n1 > 0.5 ? (n1 - 0.5) * 0.3 : 0;
    r = 0.18 + n3 * 0.06 - t * 0.04 - darkPatch;
    g = 0.38 + n2 * 0.08 - t * 0.08 - darkPatch;
    b = 0.10 + n1 * 0.04 + darkPatch * 0.02;
  } else if (height < 65) {
    const t = (height - 40) / 25;
    r = 0.20 + n3 * 0.08 + t * 0.10;
    g = 0.28 + n1 * 0.06 - t * 0.06;
    b = 0.12 + n2 * 0.04 + t * 0.04;
  } else if (height < 100) {
    const t = (height - 65) / 35;
    const mossBlend = n2 > 0.6 ? (n2 - 0.6) * 0.5 : 0;
    r = 0.38 + n3 * 0.08 + t * 0.10 - mossBlend * 0.1;
    g = 0.36 + n1 * 0.06 - t * 0.04 + mossBlend * 0.08;
    b = 0.32 + n2 * 0.06 + t * 0.08 - mossBlend * 0.05;
  } else if (height < 140) {
    const t = (height - 100) / 40;
    const dirtShow = n1 > 0.7 ? (n1 - 0.7) * 0.4 : 0;
    r = 0.55 + t * 0.30 + n3 * 0.05 - dirtShow * 0.15;
    g = 0.53 + t * 0.32 + n1 * 0.04 - dirtShow * 0.10;
    b = 0.48 + t * 0.35 + n2 * 0.04;
  } else {
    r = 0.88 + n3 * 0.06;
    g = 0.90 + n1 * 0.05;
    b = 0.92 + n2 * 0.04;
  }

  if (slopeAngle > 15) {
    const rockBlend = Math.min(1, (slopeAngle - 15) / 25);
    const rockR = 0.40 + n3 * 0.10;
    const rockG = 0.38 + n1 * 0.08;
    const rockB = 0.35 + n2 * 0.06;
    r = r + (rockR - r) * rockBlend;
    g = g + (rockG - g) * rockBlend;
    b = b + (rockB - b) * rockBlend;
  }

  if (slopeAngle > 5 && slopeAngle < 20 && height > 5 && height < 60) {
    const dirtBlend = Math.min(1, (slopeAngle - 5) / 15) * 0.3 * n2;
    r = r + (0.42 - r) * dirtBlend;
    g = g + (0.32 - g) * dirtBlend;
    b = b + (0.20 - b) * dirtBlend;
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

        const color = getTerrainColor(h, slopeAngle, worldX, worldZ);
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
