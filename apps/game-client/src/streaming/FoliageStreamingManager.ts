import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';

import type { QualitySettings, FoliageGroup, RockGroup } from '../scenes/IronvaleOutskirtsScene';
import type { HeightSampler, StreamingConfig } from './types';
import { generatePlacements, type PlacementConfig, type ExclusionData } from '../world/placementEngine';
import { loadModel, clearModelCache, type ModelLoadConfig } from '../world/modelLoader';
import { createWindMaterial, updateWind, resetWindState } from '../world/windShader';
import { resetFoliageMaterials } from '../world/createFoliageFromManifest';

interface GlobalFoliageData {
  sourceKey: string;
  allMatrices: Float32Array;
}

function seededRandom(seed: number): () => number {
  let s = Math.abs(seed) | 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class FoliageStreamingManager {
  private scene: Scene;
  private quality: QualitySettings;
  private config: StreamingConfig;
  private getHeightAt: HeightSampler;
  private lastRebuildPos = new Vector3(Infinity, 0, Infinity);
  private sourceMeshes = new Map<string, Mesh>();
  private globalPlacements = new Map<string, GlobalFoliageData>();
  private fallbackMaterials: Record<string, StandardMaterial> = {};
  private placementsGenerated = false;

  constructor(
    scene: Scene,
    quality: QualitySettings,
    config: StreamingConfig,
    getHeightAt: HeightSampler,
  ) {
    this.scene = scene;
    this.quality = quality;
    this.config = config;
    this.getHeightAt = getHeightAt;
  }

  async generateAllPlacements(
    foliageGroups: FoliageGroup[],
    rocks: RockGroup[],
    exclusions: ExclusionData
  ): Promise<void> {
    if (this.placementsGenerated) return;

    for (const group of foliageGroups) {
      const placementConfig: PlacementConfig = {
        count: group.count,
        density: group.density,
        minScale: group.minScale,
        maxScale: group.maxScale,
        maxSlope: group.maxSlope,
        alignToSlope: group.alignToSlope,
        exclusionRadii: group.exclusionRadii,
        area: group.area,
      };

      const matrices = generatePlacements(
        placementConfig, exclusions, this.getHeightAt, this.quality.foliageDensity
      );

      if (matrices.length === 0) continue;

      let sourceMesh = this.sourceMeshes.get(group.id);
      if (!sourceMesh) {
        const loaded = await this.loadSourceMesh(group);
        if (loaded) {
          this.sourceMeshes.set(group.id, loaded);
          sourceMesh = loaded;
        }
      }

      if (sourceMesh) {
        this.globalPlacements.set(group.id, {
          sourceKey: group.id,
          allMatrices: matrices,
        });
      }
    }

    const rockSourceMesh = this.createRockSourceMesh();
    this.sourceMeshes.set('__rock', rockSourceMesh);

    const allRockMatrices: number[] = [];
    for (const group of rocks) {
      const matrices = this.generateRockPlacements(group);
      for (let i = 0; i < matrices.length; i++) allRockMatrices.push(matrices[i]);
    }

    if (allRockMatrices.length > 0) {
      this.globalPlacements.set('__rock', {
        sourceKey: '__rock',
        allMatrices: new Float32Array(allRockMatrices),
      });
    }

    this.placementsGenerated = true;
    console.log(`[Foliage] Generated ${this.globalPlacements.size} foliage groups globally`);
  }

  private generateRockPlacements(group: RockGroup): Float32Array {
    const count = Math.max(1, Math.floor(group.count * this.quality.foliageDensity));
    const matrices: number[] = [];
    const tmpPos = new Vector3();
    const tmpRot = Quaternion.Identity();
    const tmpScale = new Vector3();
    const tmpMat = Matrix.Identity();
    const rng = seededRandom(Math.floor(group.area.centerX * 1000 + group.area.centerZ));

    for (let i = 0; i < count * 8 && matrices.length / 16 < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * group.area.radius;
      const x = group.area.centerX + Math.cos(angle) * dist;
      const z = group.area.centerZ + Math.sin(angle) * dist;
      const scale = group.minScale + rng() * (group.maxScale - group.minScale);
      const y = this.getHeightAt(x, z);
      tmpPos.set(x, y + scale * 0.2, z);
      Quaternion.FromEulerAnglesToRef((rng() - 0.5) * 0.3, rng() * Math.PI * 2, (rng() - 0.5) * 0.3, tmpRot);
      tmpScale.set(scale * (0.7 + rng() * 0.6), scale * (0.5 + rng() * 0.5), scale * (0.7 + rng() * 0.6));
      Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);
      const arr = new Array(16);
      tmpMat.copyToArray(arr, 0);
      for (let j = 0; j < 16; j++) matrices.push(arr[j]);
    }

    return new Float32Array(matrices);
  }

  private async loadSourceMesh(group: FoliageGroup): Promise<Mesh | null> {
    if (group.modelId) {
      const config: ModelLoadConfig | undefined =
        group.modelFile || group.modelVariant
          ? { fileName: group.modelFile ?? `${group.modelId}.glb`, variant: group.modelVariant, lodLevel: 0 }
          : undefined;

      const mesh = await loadModel(group.modelId, this.scene, config);
      if (mesh) {
        if (mesh.material) {
          const mat = mesh.material as any;
          if (mat.transparencyMode !== undefined) {
            mat.transparencyMode = 1;
          }
          if (mat.alphaMode !== undefined) {
            mat.alphaMode = 1;
          }
          if (mat.backFaceCulling !== undefined) {
            mat.backFaceCulling = false;
          }
          if (mat.forceDepthWrite !== undefined) {
            mat.forceDepthWrite = true;
          }
        }
        mesh.hasVertexAlpha = false;
        mesh.isVisible = false;
        mesh.setEnabled(false);
        return mesh;
      }
    }
    return this.createFallbackMesh(group.type);
  }

  updateInstanceBuffers(playerPosition: Vector3): void {
    if (!this.placementsGenerated) return;

    const dx = playerPosition.x - this.lastRebuildPos.x;
    const dz = playerPosition.z - this.lastRebuildPos.z;
    if (dx * dx + dz * dz < this.config.rebuildThreshold * this.config.rebuildThreshold
        && this.lastRebuildPos.x !== Infinity) {
      return;
    }

    this.lastRebuildPos.copyFrom(playerPosition);
    this.rebuildAllBuffers(playerPosition);
  }

  private rebuildCount = 0;
  private rebuildAllBuffers(playerPosition: Vector3): void {
    const isFirst = this.rebuildCount === 0;
    this.rebuildCount++;
    for (const [groupId, data] of this.globalPlacements) {
      const sourceMesh = this.sourceMeshes.get(data.sourceKey);
      if (!sourceMesh) continue;

      const all = data.allMatrices;
      const filtered: number[] = [];

      for (let i = 0; i < all.length; i += 16) {
        const wx = all[i + 12];
        const wz = all[i + 14];
        const dist = Math.sqrt((wx - playerPosition.x) ** 2 + (wz - playerPosition.z) ** 2);

        const densityMult = this.getDensityForDistance(dist);
        if (densityMult <= 0) continue;

        if (densityMult < 1.0) {
          const hash = ((Math.abs(wx) * 73856093) ^ (Math.abs(wz) * 19349663)) >>> 0;
          if ((hash % 1000) / 1000 > densityMult) continue;
        }

        for (let j = 0; j < 16; j++) filtered.push(all[i + j]);
      }

      const instanceCount = filtered.length / 16;
      if (isFirst) {
        console.log(`[Foliage] ${groupId}: ${instanceCount}/${data.allMatrices.length / 16} instances in range, mesh: ${sourceMesh.name}, visible: ${instanceCount > 0}`);
      }
      if (instanceCount > 0) {
        sourceMesh.isVisible = true;
        sourceMesh.setEnabled(true);
        sourceMesh.thinInstanceSetBuffer('matrix', new Float32Array(filtered), 16, false);
      } else {
        sourceMesh.isVisible = false;
        sourceMesh.setEnabled(false);
      }
    }
  }

  private getDensityForDistance(distance: number): number {
    const falloff = this.config.foliageDensityFalloff;
    if (falloff.length === 0) return 0;
    if (distance <= falloff[0].distance) return falloff[0].density;

    for (let i = 1; i < falloff.length; i++) {
      if (distance <= falloff[i].distance) {
        const prev = falloff[i - 1];
        const curr = falloff[i];
        const t = (distance - prev.distance) / (curr.distance - prev.distance);
        return prev.density + (curr.density - prev.density) * t;
      }
    }
    return 0;
  }

  forceRebuild(): void {
    this.lastRebuildPos.set(Infinity, 0, Infinity);
  }

  getUpdateWind(): (dt: number) => void {
    return (dt: number) => updateWind(dt);
  }

  // ─── Fallback mesh factories ───

  private createFallbackMesh(type: string): Mesh | null {
    this.ensureFallbackMaterials();
    switch (type) {
      case 'tree_pine':
      case 'tree_broadleaf':
        return this.createFallbackPine();
      case 'tree_dead':
        return this.createFallbackDeadTree();
      case 'bush':
        return this.createFallbackBush();
      case 'grass_tall':
      case 'grass_short':
        return this.createFallbackGrass();
      default:
        return null;
    }
  }

  private ensureFallbackMaterials(): void {
    if (this.fallbackMaterials['pine']) return;

    const pine = new StandardMaterial('stream_fb_pine', this.scene);
    pine.diffuseColor = new Color3(0.08, 0.18, 0.06);
    pine.specularColor = new Color3(0.01, 0.02, 0.01);
    this.fallbackMaterials['pine'] = pine;

    const trunk = new StandardMaterial('stream_fb_trunk', this.scene);
    trunk.diffuseColor = new Color3(0.18, 0.12, 0.07);
    trunk.specularColor = new Color3(0.02, 0.02, 0.01);
    this.fallbackMaterials['trunk'] = trunk;

    const dead = new StandardMaterial('stream_fb_dead', this.scene);
    dead.diffuseColor = new Color3(0.16, 0.13, 0.1);
    dead.specularColor = new Color3(0.02, 0.02, 0.01);
    this.fallbackMaterials['dead'] = dead;

    const bush = new StandardMaterial('stream_fb_bush', this.scene);
    bush.diffuseColor = new Color3(0.1, 0.2, 0.07);
    bush.specularColor = new Color3(0.01, 0.02, 0.01);
    this.fallbackMaterials['bush'] = bush;

    const grass = new StandardMaterial('stream_fb_grass', this.scene);
    grass.diffuseColor = new Color3(0.12, 0.22, 0.08);
    grass.specularColor = Color3.Black();
    grass.backFaceCulling = false;
    grass.alpha = 0.7;
    this.fallbackMaterials['grass'] = grass;
  }

  private createFallbackPine(): Mesh {
    const trunk = MeshBuilder.CreateCylinder('_spt', { diameter: 0.4, height: 4, tessellation: 6 }, this.scene);
    trunk.position.y = 2;
    const canopy = MeshBuilder.CreateCylinder('_spc', { diameterTop: 0, diameterBottom: 4, height: 4, tessellation: 6 }, this.scene);
    canopy.position.y = 4.5;
    trunk.material = this.fallbackMaterials['trunk'];
    canopy.material = this.fallbackMaterials['pine'];
    const merged = Mesh.MergeMeshes([trunk, canopy], true, true, undefined, false, true);
    if (!merged) throw new Error('Failed to merge pine');
    merged.name = 'stream_pine_fb';
    merged.material = this.fallbackMaterials['pine'];
    merged.isVisible = false;
    merged.setEnabled(false);
    return merged;
  }

  private createFallbackDeadTree(): Mesh {
    const trunk = MeshBuilder.CreateCylinder('_sdt', { diameterTop: 0.2, diameterBottom: 0.6, height: 5, tessellation: 5 }, this.scene);
    trunk.position.y = 2.5;
    trunk.material = this.fallbackMaterials['dead'];
    trunk.name = 'stream_dead_fb';
    trunk.isVisible = false;
    trunk.setEnabled(false);
    return trunk;
  }

  private createFallbackBush(): Mesh {
    const bush = MeshBuilder.CreateBox('stream_bush_fb', { width: 1.5, height: 1, depth: 1.5 }, this.scene);
    bush.material = this.fallbackMaterials['bush'];
    bush.isVisible = false;
    bush.setEnabled(false);
    return bush;
  }

  private createFallbackGrass(): Mesh {
    const grass = MeshBuilder.CreatePlane('stream_grass_fb', { width: 0.4, height: 0.8 }, this.scene);
    grass.material = this.fallbackMaterials['grass'];
    grass.isVisible = false;
    grass.setEnabled(false);
    return grass;
  }

  private createRockSourceMesh(): Mesh {
    this.ensureFallbackMaterials();
    if (!this.fallbackMaterials['rock']) {
      const rockMat = new StandardMaterial('stream_fb_rock', this.scene);
      rockMat.diffuseColor = new Color3(0.15, 0.15, 0.16);
      rockMat.specularColor = new Color3(0.03, 0.03, 0.03);
      rockMat.roughness = 1.0;
      this.fallbackMaterials['rock'] = rockMat;
    }
    const rock = MeshBuilder.CreateBox('stream_rock_src', { width: 2, height: 1.5, depth: 2 }, this.scene);
    rock.material = this.fallbackMaterials['rock'];
    rock.isVisible = false;
    rock.setEnabled(false);
    return rock;
  }

  dispose(): void {
    for (const [, mesh] of this.sourceMeshes) {
      mesh.thinInstanceSetBuffer('matrix', new Float32Array(0), 16, false);
      mesh.dispose();
    }
    this.sourceMeshes.clear();
    this.globalPlacements.clear();

    for (const mat of Object.values(this.fallbackMaterials)) mat.dispose();
    this.fallbackMaterials = {};

    clearModelCache();
    resetWindState();
    resetFoliageMaterials();
  }
}
