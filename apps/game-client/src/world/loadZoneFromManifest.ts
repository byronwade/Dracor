import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

import type { QualitySettings, ZoneManifest, RockGroup } from '../scenes/IronvaleOutskirtsScene';
import { createTerrainFromManifest, type TerrainResult } from './createTerrainFromManifest';
import { createFoliageFromManifest } from './createFoliageFromManifest';
import { createRoadFromManifest } from './createRoadFromManifest';
import { createShrineFromManifest } from './createShrineFromManifest';
import { createLandmarksFromManifest } from './createLandmarksFromManifest';
import { createSkyAndAtmosphere, type SkyResult } from './createSkyAndAtmosphere';
import { createWater } from './createWater';
import { createDistantMountains } from './createDistantMountains';

export type HeightSampler = (x: number, z: number) => number;

export interface ZoneLoadResult {
  terrain: TerrainResult;
  sky: SkyResult;
}

/**
 * Load a complete zone from its manifest data, creating all world geometry.
 * The terrain height sampler is passed to every builder so objects sit on the ground.
 */
export function loadZoneFromManifest(
  manifest: ZoneManifest,
  scene: Scene,
  quality: QualitySettings
): ZoneLoadResult {
  // Create terrain first — we need getHeightAt for all other builders
  const terrain = createTerrainFromManifest(manifest.terrain, scene, quality);
  const h = terrain.getHeightAt;

  // Create foliage (trees, bushes, grass)
  createFoliageFromManifest(manifest.foliage, scene, quality, h);

  // Create rocks
  createRocksFromManifest(manifest.rocks, scene, quality, h);

  // Create roads
  for (const road of manifest.roads) {
    createRoadFromManifest(road, scene, h);
  }

  // Create landmarks (shrine, gate, bridge)
  for (const landmark of manifest.landmarks) {
    if (landmark.type === 'shrine') {
      createShrineFromManifest(landmark, scene, h);
    } else {
      createLandmarksFromManifest(landmark, scene, h);
    }
  }

  // Create water bodies
  for (const water of manifest.water) {
    createWater(water, scene, h);
  }

  const sky = createSkyAndAtmosphere(scene, quality);

  createDistantMountains(scene);

  return { terrain, sky };
}

function createRocksFromManifest(
  rocks: RockGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number
): void {
  const rockMat = new StandardMaterial('rockMat', scene);
  rockMat.diffuseColor = new Color3(0.15, 0.15, 0.16);
  rockMat.specularColor = new Color3(0.03, 0.03, 0.03);
  rockMat.roughness = 1.0;

  const sourceMesh = MeshBuilder.CreateBox('rock', { width: 2, height: 1.5, depth: 2 }, scene);
  sourceMesh.material = rockMat;

  const allMatrices: number[] = [];
  const tmpPos = new Vector3();
  const tmpRot = Quaternion.Identity();
  const tmpScale = new Vector3();
  const tmpMat = Matrix.Identity();

  for (const group of rocks) {
    const count = Math.max(1, Math.floor(group.count * quality.foliageDensity));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * group.area.radius;
      const x = group.area.centerX + Math.cos(angle) * dist;
      const z = group.area.centerZ + Math.sin(angle) * dist;
      const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);
      const y = getHeightAt(x, z);

      tmpPos.set(x, y + scale * 0.5, z);
      Quaternion.FromEulerAnglesToRef(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3,
        tmpRot
      );
      tmpScale.set(
        scale * (0.7 + Math.random() * 0.6),
        scale * (0.5 + Math.random() * 0.5),
        scale * (0.7 + Math.random() * 0.6)
      );
      Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);

      const arr = new Array(16);
      tmpMat.copyToArray(arr, 0);
      for (let j = 0; j < 16; j++) allMatrices.push(arr[j]);
    }
  }

  if (allMatrices.length > 0) {
    sourceMesh.thinInstanceSetBuffer('matrix', new Float32Array(allMatrices), 16, false);
  }
}
