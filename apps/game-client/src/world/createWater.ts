import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { WaterBodyDefinition } from '../scenes/IronvaleOutskirtsScene';

/**
 * Create a semi-transparent water surface for streams and ponds.
 */
export function createWater(
  water: WaterBodyDefinition,
  scene: Scene
): Mesh {
  const pos = water.position;

  const waterMesh = MeshBuilder.CreateGround(
    `water_${water.id}`,
    {
      width: water.size.width,
      height: water.size.depth,
      subdivisions: 8,
    },
    scene
  );
  waterMesh.position = new Vector3(pos.x, pos.y, pos.z);

  // Rotate water plane if flow direction suggests it
  if (water.flowDirection) {
    const angle = Math.atan2(water.flowDirection[0], water.flowDirection[1]);
    waterMesh.rotation.y = angle;
  }

  // Water material - dark blue, semi-transparent, slightly emissive for reflective feel
  const waterMat = new StandardMaterial(`waterMat_${water.id}`, scene);
  waterMat.diffuseColor = new Color3(0.08, 0.12, 0.2);
  waterMat.specularColor = new Color3(0.15, 0.2, 0.3);
  waterMat.emissiveColor = new Color3(0.02, 0.04, 0.08); // Subtle blue shimmer
  waterMat.alpha = water.opacity ?? 0.4;
  waterMat.backFaceCulling = false;

  // Higher specular power for sharp water highlights
  waterMat.specularPower = 128;

  waterMesh.material = waterMat;
  waterMesh.isPickable = false;

  return waterMesh;
}
