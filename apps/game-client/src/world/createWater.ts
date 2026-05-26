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
 * Samples surrounding terrain heights to place water in a natural depression
 * and adds an animated shimmer effect.
 */
export function createWater(
  water: WaterBodyDefinition,
  scene: Scene,
  getHeightAt: (x: number, z: number) => number
): Mesh {
  const pos = water.position;
  const halfW = water.size.width * 0.5;
  const halfD = water.size.depth * 0.5;

  // Sample terrain height at 9 points across the water body and use the minimum
  const samplePoints = [
    getHeightAt(pos.x, pos.z),
    getHeightAt(pos.x - halfW, pos.z - halfD),
    getHeightAt(pos.x + halfW, pos.z - halfD),
    getHeightAt(pos.x - halfW, pos.z + halfD),
    getHeightAt(pos.x + halfW, pos.z + halfD),
    getHeightAt(pos.x - halfW, pos.z),
    getHeightAt(pos.x + halfW, pos.z),
    getHeightAt(pos.x, pos.z - halfD),
    getHeightAt(pos.x, pos.z + halfD),
  ];
  const minHeight = Math.min(...samplePoints);
  const waterY = minHeight - 0.1;

  const waterMesh = MeshBuilder.CreateGround(
    `water_${water.id}`,
    {
      width: water.size.width,
      height: water.size.depth,
      subdivisions: 8,
    },
    scene
  );
  waterMesh.position = new Vector3(pos.x, waterY, pos.z);

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

  // Animated shimmer: gently pulse the emissive color
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.001;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    waterMat.emissiveColor = new Color3(
      0.02 + 0.01 * pulse,
      0.04 + 0.02 * pulse,
      0.08 + 0.04 * pulse
    );
  });

  return waterMesh;
}
