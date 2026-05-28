import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/thinInstanceMesh';

import type { QualitySettings, FoliageGroup } from '../scenes/IronvaleOutskirtsScene';
import { loadModel, type ModelLoadConfig } from './modelLoader';
import { generatePlacements, type PlacementConfig, type ExclusionData } from './placementEngine';
import { updateWind } from './windShader';

export { type ExclusionData } from './placementEngine';

export interface FoliageResult {
  updateWind: (dt: number) => void;
}

let pineNeedleMat: StandardMaterial | null = null;
let pineTrunkMat: StandardMaterial | null = null;
let deadTreeMat: StandardMaterial | null = null;
let bushMat: StandardMaterial | null = null;
let grassMat: StandardMaterial | null = null;

export function resetFoliageMaterials(): void {
  pineNeedleMat = null;
  pineTrunkMat = null;
  deadTreeMat = null;
  bushMat = null;
  grassMat = null;
}

function ensureFallbackMaterials(scene: Scene): void {
  if (pineNeedleMat) return;

  pineNeedleMat = new StandardMaterial('pineNeedleMat', scene);
  pineNeedleMat.diffuseColor = new Color3(0.08, 0.18, 0.06);
  pineNeedleMat.specularColor = new Color3(0.01, 0.02, 0.01);
  pineNeedleMat.ambientColor = new Color3(0.03, 0.06, 0.02);

  pineTrunkMat = new StandardMaterial('pineTrunkMat', scene);
  pineTrunkMat.diffuseColor = new Color3(0.18, 0.12, 0.07);
  pineTrunkMat.specularColor = new Color3(0.02, 0.02, 0.01);

  deadTreeMat = new StandardMaterial('deadTreeMat', scene);
  deadTreeMat.diffuseColor = new Color3(0.16, 0.13, 0.1);
  deadTreeMat.specularColor = new Color3(0.02, 0.02, 0.01);

  bushMat = new StandardMaterial('bushMat', scene);
  bushMat.diffuseColor = new Color3(0.1, 0.2, 0.07);
  bushMat.specularColor = new Color3(0.01, 0.02, 0.01);

  grassMat = new StandardMaterial('grassMat', scene);
  grassMat.diffuseColor = new Color3(0.12, 0.22, 0.08);
  grassMat.specularColor = Color3.Black();
  grassMat.backFaceCulling = false;
  grassMat.alpha = 0.7;
}

function createFallbackPine(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const trunk = MeshBuilder.CreateCylinder('_pt', { diameter: 0.4, height: 4, tessellation: 6 }, scene);
  trunk.position.y = 2;
  const c1 = MeshBuilder.CreateCylinder('_pc1', { diameterTop: 0, diameterBottom: 4, height: 4, tessellation: 6 }, scene);
  c1.position.y = 4.5;
  const c2 = MeshBuilder.CreateCylinder('_pc2', { diameterTop: 0, diameterBottom: 3, height: 3.5, tessellation: 6 }, scene);
  c2.position.y = 6.5;
  const c3 = MeshBuilder.CreateCylinder('_pc3', { diameterTop: 0, diameterBottom: 2, height: 3, tessellation: 6 }, scene);
  c3.position.y = 8.5;
  trunk.material = pineTrunkMat;
  c1.material = pineNeedleMat;
  c2.material = pineNeedleMat;
  c3.material = pineNeedleMat;
  const merged = Mesh.MergeMeshes([trunk, c1, c2, c3], true, true, undefined, false, true);
  if (!merged) throw new Error('Failed to merge pine fallback');
  merged.name = 'pineTree_fallback';
  merged.material = pineNeedleMat;
  return merged;
}

function createFallbackDeadTree(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const trunk = MeshBuilder.CreateCylinder('_dt', { diameterTop: 0.2, diameterBottom: 0.6, height: 5, tessellation: 5 }, scene);
  trunk.position.y = 2.5;
  const b1 = MeshBuilder.CreateCylinder('_db1', { diameterTop: 0.05, diameterBottom: 0.15, height: 2, tessellation: 5 }, scene);
  b1.position.set(0.4, 3.5, 0);
  b1.rotation.z = -0.8;
  const b2 = MeshBuilder.CreateCylinder('_db2', { diameterTop: 0.04, diameterBottom: 0.12, height: 1.5, tessellation: 5 }, scene);
  b2.position.set(-0.3, 4.0, 0.2);
  b2.rotation.z = 0.6;
  trunk.material = deadTreeMat;
  b1.material = deadTreeMat;
  b2.material = deadTreeMat;
  const merged = Mesh.MergeMeshes([trunk, b1, b2], true, true, undefined, false, true);
  if (!merged) throw new Error('Failed to merge dead tree fallback');
  merged.name = 'deadTree_fallback';
  merged.material = deadTreeMat;
  return merged;
}

function createFallbackBush(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const bush = MeshBuilder.CreateBox('bush_fallback', { width: 1.5, height: 1, depth: 1.5 }, scene);
  bush.material = bushMat;
  return bush;
}

function createFallbackGrass(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const grass = MeshBuilder.CreatePlane('grass_fallback', { width: 0.4, height: 0.8 }, scene);
  grass.material = grassMat;
  return grass;
}

function getFallbackMesh(type: string, scene: Scene): Mesh | null {
  switch (type) {
    case 'tree_pine': return createFallbackPine(scene);
    case 'tree_dead': return createFallbackDeadTree(scene);
    case 'tree_broadleaf': return createFallbackPine(scene);
    case 'bush': return createFallbackBush(scene);
    case 'grass_tall':
    case 'grass_short': return createFallbackGrass(scene);
    default: return null;
  }
}

export async function createFoliageFromManifest(
  foliageGroups: FoliageGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number,
  exclusions: ExclusionData
): Promise<FoliageResult> {
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

    let sourceMesh: Mesh | null = null;
    let usedGlb = false;

    if (group.modelId) {
      const config: ModelLoadConfig | undefined =
        group.modelFile || group.modelVariant
          ? {
              fileName: group.modelFile ?? `${group.modelId}.glb`,
              variant: group.modelVariant,
              lodLevel: 0,
            }
          : undefined;

      sourceMesh = await loadModel(group.modelId, scene, config);
      if (sourceMesh) {
        usedGlb = true;
      }
    }

    if (!sourceMesh) {
      sourceMesh = getFallbackMesh(group.type, scene);
      if (!sourceMesh) continue;
    }

    const matrices = generatePlacements(
      placementConfig,
      exclusions,
      getHeightAt,
      quality.foliageDensity
    );

    const instanceCount = matrices.length / 16;
    if (instanceCount > 0) {
      sourceMesh.isVisible = true;
      sourceMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
      console.log(`[Foliage] ${group.id}: ${instanceCount} instances placed (GLB: ${usedGlb})`);
    } else {
      console.warn(`[Foliage] ${group.id}: no valid placements found`);
    }
  }

  return {
    updateWind: (dt: number) => updateWind(dt),
  };
}
