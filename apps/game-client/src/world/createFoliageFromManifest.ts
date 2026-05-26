import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';

import type { QualitySettings, FoliageGroup } from '../scenes/IronvaleOutskirtsScene';

// Materials cache
let pineNeedleMat: StandardMaterial | null = null;
let pineTrunkMat: StandardMaterial | null = null;
let deadTreeMat: StandardMaterial | null = null;
let bushMat: StandardMaterial | null = null;
let grassMat: StandardMaterial | null = null;

function ensureMaterials(scene: Scene): void {
  if (pineNeedleMat) return;

  pineNeedleMat = new StandardMaterial('pineNeedleMat', scene);
  pineNeedleMat.diffuseColor = new Color3(0.15, 0.35, 0.12);
  pineNeedleMat.specularColor = new Color3(0.02, 0.03, 0.01);
  pineNeedleMat.ambientColor = new Color3(0.05, 0.1, 0.04);

  pineTrunkMat = new StandardMaterial('pineTrunkMat', scene);
  pineTrunkMat.diffuseColor = new Color3(0.35, 0.22, 0.12);
  pineTrunkMat.specularColor = new Color3(0.03, 0.03, 0.02);

  deadTreeMat = new StandardMaterial('deadTreeMat', scene);
  deadTreeMat.diffuseColor = new Color3(0.3, 0.25, 0.2);
  deadTreeMat.specularColor = new Color3(0.03, 0.03, 0.02);

  bushMat = new StandardMaterial('bushMat', scene);
  bushMat.diffuseColor = new Color3(0.2, 0.38, 0.15);
  bushMat.specularColor = new Color3(0.02, 0.03, 0.01);

  grassMat = new StandardMaterial('grassMat', scene);
  grassMat.diffuseColor = new Color3(0.25, 0.45, 0.18);
  grassMat.specularColor = Color3.Black();
  grassMat.backFaceCulling = false;
  grassMat.alpha = 0.85;
}

function createPineTreeSource(scene: Scene): Mesh {
  const parent = new Mesh('pineSource', scene);

  // Trunk
  const trunk = MeshBuilder.CreateCylinder(
    'pineSourceTrunk',
    { diameter: 0.4, height: 4, tessellation: 8 },
    scene
  );
  trunk.position.y = 2;
  trunk.material = pineTrunkMat;
  trunk.parent = parent;

  // Three cone layers for canopy
  const coneBottom = MeshBuilder.CreateCylinder(
    'pineSourceConeB',
    { diameterTop: 0, diameterBottom: 4, height: 4, tessellation: 8 },
    scene
  );
  coneBottom.position.y = 4.5;
  coneBottom.material = pineNeedleMat;
  coneBottom.parent = parent;

  const coneMid = MeshBuilder.CreateCylinder(
    'pineSourceConeM',
    { diameterTop: 0, diameterBottom: 3, height: 3.5, tessellation: 8 },
    scene
  );
  coneMid.position.y = 6.5;
  coneMid.material = pineNeedleMat;
  coneMid.parent = parent;

  const coneTop = MeshBuilder.CreateCylinder(
    'pineSourceConeT',
    { diameterTop: 0, diameterBottom: 2, height: 3, tessellation: 8 },
    scene
  );
  coneTop.position.y = 8.5;
  coneTop.material = pineNeedleMat;
  coneTop.parent = parent;

  parent.isVisible = false;
  return parent;
}

function createDeadTreeSource(scene: Scene): Mesh {
  const parent = new Mesh('deadTreeSource', scene);

  // Main trunk - thicker, twisted look via slight scaling
  const trunk = MeshBuilder.CreateCylinder(
    'deadTreeTrunk',
    { diameterTop: 0.2, diameterBottom: 0.6, height: 5, tessellation: 6 },
    scene
  );
  trunk.position.y = 2.5;
  trunk.material = deadTreeMat;
  trunk.parent = parent;

  // Broken branch stubs
  const branch1 = MeshBuilder.CreateCylinder(
    'deadBranch1',
    { diameterTop: 0.05, diameterBottom: 0.15, height: 2, tessellation: 5 },
    scene
  );
  branch1.position.set(0.4, 3.5, 0);
  branch1.rotation.z = -0.8;
  branch1.material = deadTreeMat;
  branch1.parent = parent;

  const branch2 = MeshBuilder.CreateCylinder(
    'deadBranch2',
    { diameterTop: 0.04, diameterBottom: 0.12, height: 1.5, tessellation: 5 },
    scene
  );
  branch2.position.set(-0.3, 4.0, 0.2);
  branch2.rotation.z = 0.6;
  branch2.rotation.y = 1.2;
  branch2.material = deadTreeMat;
  branch2.parent = parent;

  parent.isVisible = false;
  return parent;
}

function createBushSource(scene: Scene): Mesh {
  const bush = MeshBuilder.CreateBox(
    'bushSource',
    { width: 1.5, height: 1, depth: 1.5 },
    scene
  );
  bush.material = bushMat;
  bush.isVisible = false;
  return bush;
}

function createGrassSource(scene: Scene): Mesh {
  const grass = MeshBuilder.CreatePlane(
    'grassSource',
    { width: 0.4, height: 0.8 },
    scene
  );
  grass.material = grassMat;
  grass.isVisible = false;
  return grass;
}

/**
 * Create instanced foliage from manifest foliage groups.
 * Every placed object samples terrain height so it sits on the ground.
 */
export function createFoliageFromManifest(
  foliageGroups: FoliageGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number
): void {
  ensureMaterials(scene);

  // Create source meshes lazily
  let pineSource: Mesh | null = null;
  let deadSource: Mesh | null = null;
  let bushSource: Mesh | null = null;
  let grassSource: Mesh | null = null;

  for (const group of foliageGroups) {
    const count = Math.max(1, Math.floor(group.count * quality.foliageDensity));

    if (group.type === 'tree_pine') {
      if (!pineSource) pineSource = createPineTreeSource(scene);
      spawnInstances(pineSource, group, count, scene, true, getHeightAt);
    } else if (group.type === 'tree_dead') {
      if (!deadSource) deadSource = createDeadTreeSource(scene);
      spawnInstances(deadSource, group, count, scene, true, getHeightAt);
    } else if (group.type === 'bush') {
      if (!bushSource) bushSource = createBushSource(scene);
      spawnInstances(bushSource, group, count, scene, false, getHeightAt);
    } else if (group.type === 'grass_tall' || group.type === 'grass_short') {
      if (!grassSource) grassSource = createGrassSource(scene);
      spawnGrass(grassSource, group, count, scene, getHeightAt);
    }
  }
}

function spawnInstances(
  source: Mesh,
  group: FoliageGroup,
  count: number,
  scene: Scene,
  _isTree: boolean,
  getHeightAt: (x: number, z: number) => number
): void {
  const parent = new TransformNode(`foliage_${group.id}`, scene);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * group.area.radius;
    const x = group.area.centerX + Math.cos(angle) * dist;
    const z = group.area.centerZ + Math.sin(angle) * dist;
    const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);

    const y = getHeightAt(x, z);

    // Clone the multi-mesh tree as a hierarchy
    const clone = source.clone(`${group.id}_${i}`, parent);
    if (clone) {
      clone.position = new Vector3(x, y, z);
      clone.scaling.setAll(scale);
      clone.rotation.y = Math.random() * Math.PI * 2;
      clone.isVisible = true;

      // Make children visible
      for (const child of clone.getChildMeshes()) {
        child.isVisible = true;
      }
    }
  }
}

function spawnGrass(
  source: Mesh,
  group: FoliageGroup,
  count: number,
  scene: Scene,
  getHeightAt: (x: number, z: number) => number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * group.area.radius;
    const x = group.area.centerX + Math.cos(angle) * dist;
    const z = group.area.centerZ + Math.sin(angle) * dist;
    const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);

    const y = getHeightAt(x, z);

    const instance = source.createInstance(`grass_${group.id}_${i}`);
    instance.position = new Vector3(x, y + scale * 0.4, z);
    instance.scaling.setAll(scale);
    instance.rotation.y = Math.random() * Math.PI * 2;
    // Billboard grass slightly for cheap volume effect
    instance.rotation.x = (Math.random() - 0.5) * 0.3;
  }
}
