import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { WaterMaterial } from '@babylonjs/materials/water/waterMaterial';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { WaterBodyDefinition } from '../scenes/IronvaleOutskirtsScene';

let sharedWaterMat: WaterMaterial | null = null;

function getOrCreateWaterMaterial(scene: Scene): WaterMaterial {
  if (sharedWaterMat) return sharedWaterMat;

  const mat = new WaterMaterial('waterPBR', scene, new Vector2(512, 512));

  const bump = new Texture('/textures/terrain/water_normal.webp', scene);
  bump.wrapU = Texture.WRAP_ADDRESSMODE;
  bump.wrapV = Texture.WRAP_ADDRESSMODE;
  mat.bumpTexture = bump;

  // Dark fantasy water — deep blue-black with cool fresnel
  mat.waterColor = new Color3(0.02, 0.05, 0.09);
  mat.colorBlendFactor = 0.18;
  mat.waterColor2 = new Color3(0.05, 0.10, 0.18);
  mat.colorBlendFactor2 = 0.4;

  // Wave configuration — slow rolling waves, no chop
  mat.windForce = -6;
  mat.windDirection.set(0.7, 0.7);
  mat.waveHeight = 0.05;
  mat.waveLength = 0.25;
  mat.waveSpeed = 35;
  mat.bumpHeight = 0.6;

  mat.backFaceCulling = true;

  sharedWaterMat = mat;
  return mat;
}

export function getSharedWaterMaterial(): WaterMaterial | null {
  return sharedWaterMat;
}

export function resetSharedWaterMaterial(): void {
  sharedWaterMat = null;
}

export function createWater(
  water: WaterBodyDefinition,
  scene: Scene,
): Mesh {
  const pos = water.position;

  // Use the manifest Y directly. Sampling getHeightAt at scene-build time gives placeholder
  // noise values (worldgen is async); the water would float well above the real terrain.
  // The manifest author is responsible for placing water at a sensible elevation.
  const waterY = pos.y;

  const mesh = MeshBuilder.CreateGround(
    `water_${water.id}`,
    { width: water.size.width, height: water.size.depth, subdivisions: 32 },
    scene,
  );
  mesh.position = new Vector3(pos.x, waterY, pos.z);
  if (water.flowDirection) {
    mesh.rotation.y = Math.atan2(water.flowDirection[0], water.flowDirection[1]);
  }

  const mat = getOrCreateWaterMaterial(scene);
  mesh.material = mat;
  mesh.isPickable = false;

  return mesh;
}

/**
 * Register a mesh as something the water surface should reflect and refract.
 * Call this after each major scene element is created (terrain, mountains, sky, foliage).
 */
export function addToWaterReflectionList(mesh: Mesh): void {
  if (!sharedWaterMat) return;
  sharedWaterMat.addToRenderList(mesh);
}
