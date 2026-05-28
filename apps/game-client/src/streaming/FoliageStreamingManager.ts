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

const LOD0_DIST = 25;
const LOD1_DIST = 120;

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

      if (!this.sourceMeshes.has(group.id)) {
        // LOD0: full detail GLB
        const lod0 = await this.loadSourceMesh(group, 0);
        // LOD1: simplified GLB
        const lod1 = await this.loadSourceMesh(group, 1);
        // LOD2: reuse LOD1 GLB if available — its lower poly count is fine at distance,
        // and it looks dramatically better than a procedural cone silhouette.
        // Fall back to procedural mesh only if no GLB loaded at all.
        const lod2GlbBase = lod1 ?? lod0;
        let lod2: Mesh | null = null;
        if (lod2GlbBase) {
          // Same source mesh reference — Babylon's thin-instance buffer is per-mesh, so
          // we need a distinct mesh for the lod2 buffer. Clone it.
          lod2 = lod2GlbBase.clone(`${group.id}_lod2_src`, null, true);
          if (lod2) {
            this.tagFoliage(lod2, group.type);
            lod2.isVisible = false;
            lod2.setEnabled(false);
          }
        }
        if (!lod2) lod2 = this.createFallbackMesh(group.type);

        if (lod0) this.sourceMeshes.set(group.id + '_lod0', lod0);
        if (lod1) this.sourceMeshes.set(group.id + '_lod1', lod1);
        else if (lod0) this.sourceMeshes.set(group.id + '_lod1', lod0);
        if (lod2) this.sourceMeshes.set(group.id + '_lod2', lod2);

        this.sourceMeshes.set(group.id, lod0 ?? lod2!);
      }

      this.globalPlacements.set(group.id, {
        sourceKey: group.id,
        allMatrices: matrices,
      });
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

  private tagFoliage(mesh: Mesh, type: string): void {
    const isTree = type === 'tree_pine' || type === 'tree_dead' || type === 'tree_broadleaf';
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      foliage: true,
      foliageType: type,
      castsShadow: isTree,
      reflectsInWater: isTree,
    };
  }

  private async loadSourceMesh(group: FoliageGroup, lodLevel = 0): Promise<Mesh | null> {
    if (group.modelId) {
      const config: ModelLoadConfig | undefined =
        group.modelFile || group.modelVariant
          ? { fileName: group.modelFile ?? `${group.modelId}.glb`, variant: group.modelVariant, lodLevel }
          : undefined;

      const mesh = await loadModel(group.modelId, this.scene, config);
      if (mesh) {
        if (mesh.material) {
          const mat = mesh.material as any;
          if (mat.backFaceCulling !== undefined) {
            mat.backFaceCulling = false;
          }
        }
        mesh.isVisible = false;
        mesh.setEnabled(false);
        this.tagFoliage(mesh, group.type);
        return mesh;
      }
    }
    const fallback = this.createFallbackMesh(group.type);
    if (fallback) this.tagFoliage(fallback, group.type);
    return fallback;
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
      const isRock = groupId === '__rock';
      const all = data.allMatrices;
      const lod0Buf: number[] = [];
      const lod1Buf: number[] = [];
      const lod2Buf: number[] = [];

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

        const buf = isRock ? lod0Buf
          : dist < LOD0_DIST ? lod0Buf
          : dist < LOD1_DIST ? lod1Buf
          : lod2Buf;
        for (let j = 0; j < 16; j++) buf.push(all[i + j]);
      }

      if (isRock) {
        this.applyBuffer(data.sourceKey, lod0Buf);
      } else {
        this.applyBuffer(groupId + '_lod0', lod0Buf);
        this.applyBuffer(groupId + '_lod1', lod1Buf);
        this.applyBuffer(groupId + '_lod2', lod2Buf);
      }

      if (isFirst) {
        const total = lod0Buf.length / 16 + lod1Buf.length / 16 + lod2Buf.length / 16;
        console.log(`[Foliage] ${groupId}: ${Math.floor(lod0Buf.length / 16)} hi + ${Math.floor(lod1Buf.length / 16)} med + ${Math.floor(lod2Buf.length / 16)} low = ${Math.floor(total)} total`);
      }
    }
  }

  private applyBuffer(meshKey: string, buf: number[]): void {
    const mesh = this.sourceMeshes.get(meshKey);
    if (!mesh) return;
    if (buf.length > 0) {
      mesh.isVisible = true;
      mesh.setEnabled(true);
      mesh.thinInstanceSetBuffer('matrix', new Float32Array(buf), 16, false);
    } else {
      mesh.isVisible = false;
      mesh.setEnabled(false);
      mesh.thinInstanceSetBuffer('matrix', new Float32Array(0), 16, false);
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
    // Three-tier silhouette (trunk + canopy + spire) — feels more like a fir than a cone
    const trunk = MeshBuilder.CreateCylinder('_spt', { diameter: 0.5, height: 5, tessellation: 6 }, this.scene);
    trunk.position.y = 2.5;
    const canopy = MeshBuilder.CreateCylinder('_spc', { diameterTop: 1.4, diameterBottom: 4.5, height: 4.5, tessellation: 7 }, this.scene);
    canopy.position.y = 5.0;
    const spire = MeshBuilder.CreateCylinder('_sps', { diameterTop: 0, diameterBottom: 1.4, height: 2.5, tessellation: 6 }, this.scene);
    spire.position.y = 8.5;
    trunk.material = this.fallbackMaterials['trunk'];
    canopy.material = this.fallbackMaterials['pine'];
    spire.material = this.fallbackMaterials['pine'];
    const merged = Mesh.MergeMeshes([trunk, canopy, spire], true, true, undefined, false, true);
    if (!merged) throw new Error('Failed to merge pine');
    merged.name = 'stream_pine_fb';
    // Apply the wind shader with SSS / cloud-shadow lighting on top of the diffuse color
    merged.material = createWindMaterial(this.scene, this.fallbackMaterials['pine'], 'pine_fb');
    merged.isVisible = false;
    merged.setEnabled(false);
    return merged;
  }

  private createFallbackDeadTree(): Mesh {
    const trunk = MeshBuilder.CreateCylinder('_sdt', { diameterTop: 0.2, diameterBottom: 0.6, height: 5, tessellation: 5 }, this.scene);
    trunk.position.y = 2.5;
    trunk.material = createWindMaterial(this.scene, this.fallbackMaterials['dead'], 'dead_fb');
    trunk.name = 'stream_dead_fb';
    trunk.isVisible = false;
    trunk.setEnabled(false);
    return trunk;
  }

  private createFallbackBush(): Mesh {
    // Three overlapping spheres look like foliage clumps, not a flat box
    const a = MeshBuilder.CreateSphere('_sba', { diameter: 1.2, segments: 4 }, this.scene);
    a.position.set(0, 0.5, 0);
    const b = MeshBuilder.CreateSphere('_sbb', { diameter: 1.0, segments: 4 }, this.scene);
    b.position.set(0.5, 0.4, 0.2);
    const c = MeshBuilder.CreateSphere('_sbc', { diameter: 0.9, segments: 4 }, this.scene);
    c.position.set(-0.4, 0.4, 0.3);
    a.material = this.fallbackMaterials['bush'];
    b.material = this.fallbackMaterials['bush'];
    c.material = this.fallbackMaterials['bush'];
    const merged = Mesh.MergeMeshes([a, b, c], true, true, undefined, false, true);
    if (!merged) throw new Error('Failed to merge bush');
    merged.name = 'stream_bush_fb';
    merged.material = createWindMaterial(this.scene, this.fallbackMaterials['bush'], 'bush_fb');
    merged.isVisible = false;
    merged.setEnabled(false);
    return merged;
  }

  private createFallbackGrass(): Mesh {
    const grass = MeshBuilder.CreatePlane('stream_grass_fb', { width: 0.4, height: 0.8 }, this.scene);
    grass.material = createWindMaterial(this.scene, this.fallbackMaterials['grass'], 'grass_fb');
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
    rock.metadata = { rock: true, castsShadow: true, reflectsInWater: true };
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
