import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/thinInstanceMesh';

import type { QualitySettings, FoliageGroup } from '../scenes/IronvaleOutskirtsScene';

let pineNeedleMat: StandardMaterial | null = null;
let pineTrunkMat: StandardMaterial | null = null;
let deadTreeMat: StandardMaterial | null = null;
let bushMat: StandardMaterial | null = null;
let grassMat: StandardMaterial | null = null;

function ensureMaterials(scene: Scene): void {
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

function createMergedPine(scene: Scene): Mesh {
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
  if (!merged) throw new Error('Failed to merge pine');
  merged.name = 'pineTree';
  merged.material = pineNeedleMat;
  merged.isVisible = true;
  return merged;
}

function createMergedDeadTree(scene: Scene): Mesh {
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
  if (!merged) throw new Error('Failed to merge dead tree');
  merged.name = 'deadTree';
  merged.material = deadTreeMat;
  merged.isVisible = true;
  return merged;
}

function addThinInstances(
  source: Mesh,
  group: FoliageGroup,
  count: number,
  getHeightAt: (x: number, z: number) => number
): void {
  const matrices = new Float32Array(count * 16);
  const tmpPos = new Vector3();
  const tmpRot = new Quaternion();
  const tmpScale = new Vector3();
  const tmpMat = new Matrix();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * group.area.radius;
    const x = group.area.centerX + Math.cos(angle) * dist;
    const z = group.area.centerZ + Math.sin(angle) * dist;
    const y = getHeightAt(x, z);
    const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);
    const rotY = Math.random() * Math.PI * 2;

    tmpPos.set(x, y, z);
    Quaternion.FromEulerAnglesToRef(0, rotY, 0, tmpRot);
    tmpScale.set(scale, scale, scale);
    Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);
    tmpMat.copyToArray(matrices, i * 16);
  }

  source.thinInstanceSetBuffer('matrix', matrices, 16, false);
}

export function createFoliageFromManifest(
  foliageGroups: FoliageGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number
): void {
  ensureMaterials(scene);

  let pineSource: Mesh | null = null;
  let deadSource: Mesh | null = null;
  let bushSource: Mesh | null = null;
  let grassSource: Mesh | null = null;

  for (const group of foliageGroups) {
    const count = Math.max(1, Math.floor(group.count * quality.foliageDensity));

    if (group.type === 'tree_pine') {
      if (!pineSource) pineSource = createMergedPine(scene);
      addThinInstances(pineSource, group, count, getHeightAt);
    } else if (group.type === 'tree_dead') {
      if (!deadSource) deadSource = createMergedDeadTree(scene);
      addThinInstances(deadSource, group, count, getHeightAt);
    } else if (group.type === 'bush') {
      if (!bushSource) {
        bushSource = MeshBuilder.CreateBox('bush', { width: 1.5, height: 1, depth: 1.5 }, scene);
        bushSource.material = bushMat;
      }
      addThinInstances(bushSource, group, count, getHeightAt);
    } else if (group.type === 'grass_tall' || group.type === 'grass_short') {
      if (!grassSource) {
        grassSource = MeshBuilder.CreatePlane('grass', { width: 0.4, height: 0.8 }, scene);
        grassSource.material = grassMat;
      }
      addThinInstancesGrass(grassSource, group, count, getHeightAt);
    }
  }
}

function addThinInstancesGrass(
  source: Mesh,
  group: FoliageGroup,
  count: number,
  getHeightAt: (x: number, z: number) => number
): void {
  const matrices = new Float32Array(count * 16);
  const tmpPos = new Vector3();
  const tmpRot = new Quaternion();
  const tmpScale = new Vector3();
  const tmpMat = new Matrix();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * group.area.radius;
    const x = group.area.centerX + Math.cos(angle) * dist;
    const z = group.area.centerZ + Math.sin(angle) * dist;
    const y = getHeightAt(x, z);
    const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);
    const rotY = Math.random() * Math.PI * 2;
    const tiltX = (Math.random() - 0.5) * 0.3;

    tmpPos.set(x, y + scale * 0.4, z);
    Quaternion.FromEulerAnglesToRef(tiltX, rotY, 0, tmpRot);
    tmpScale.set(scale, scale, scale);
    Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);
    tmpMat.copyToArray(matrices, i * 16);
  }

  source.thinInstanceSetBuffer('matrix', matrices, 16, false);
}
