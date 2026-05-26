import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

import type { QualitySettings, ZoneManifest, RockGroup } from '../scenes/IronvaleOutskirtsScene';
import { createTerrainFromManifest, type TerrainResult } from './createTerrainFromManifest';
import { createFoliageFromManifest } from './createFoliageFromManifest';
import { createRoadFromManifest } from './createRoadFromManifest';
import { createShrineFromManifest } from './createShrineFromManifest';
import { createLandmarksFromManifest } from './createLandmarksFromManifest';
import { createSkyAndAtmosphere } from './createSkyAndAtmosphere';
import { createWater } from './createWater';
import { createDistantMountains } from './createDistantMountains';

export interface ZoneLoadResult {
  terrain: TerrainResult;
}

/**
 * Load a complete zone from its manifest data, creating all world geometry.
 */
export function loadZoneFromManifest(
  manifest: ZoneManifest,
  scene: Scene,
  quality: QualitySettings
): ZoneLoadResult {
  // Create terrain
  const terrain = createTerrainFromManifest(manifest.terrain, scene, quality);

  // Create foliage (trees, bushes, grass)
  createFoliageFromManifest(manifest.foliage, scene, quality);

  // Create rocks
  createRocksFromManifest(manifest.rocks, scene, quality);

  // Create roads
  for (const road of manifest.roads) {
    createRoadFromManifest(road, scene);
  }

  // Create landmarks (shrine, gate, bridge)
  for (const landmark of manifest.landmarks) {
    if (landmark.type === 'shrine') {
      createShrineFromManifest(landmark, scene);
    } else {
      createLandmarksFromManifest(landmark, scene);
    }
  }

  // Create water bodies
  for (const water of manifest.water) {
    createWater(water, scene);
  }

  // Create sky and atmosphere
  createSkyAndAtmosphere(scene, quality);

  // Create distant mountains
  createDistantMountains(scene);

  return { terrain };
}

function createRocksFromManifest(
  rocks: RockGroup[],
  scene: Scene,
  quality: QualitySettings
): void {
  const rockMat = new StandardMaterial('rockMat', scene);
  rockMat.diffuseColor = new Color3(0.2, 0.2, 0.22);
  rockMat.specularColor = new Color3(0.05, 0.05, 0.05);
  rockMat.roughness = 1.0;

  for (const group of rocks) {
    const count = Math.max(1, Math.floor(group.count * quality.foliageDensity));

    const sourceMesh = MeshBuilder.CreateBox(
      `rock_source_${group.id}`,
      { width: 2, height: 1.5, depth: 2 },
      scene
    );
    sourceMesh.material = rockMat;
    sourceMesh.isVisible = false;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * group.area.radius;
      const x = group.area.centerX + Math.cos(angle) * dist;
      const z = group.area.centerZ + Math.sin(angle) * dist;
      const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);

      const instance = sourceMesh.createInstance(`${group.id}_${i}`);
      instance.position = new Vector3(x, scale * 0.5, z);
      instance.scaling.set(
        scale * (0.7 + Math.random() * 0.6),
        scale * (0.5 + Math.random() * 0.5),
        scale * (0.7 + Math.random() * 0.6)
      );
      instance.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
      );
    }
  }
}
