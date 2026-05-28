import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { WaterBodyDefinition } from '../scenes/IronvaleOutskirtsScene';

let sharedWaterMat: StandardMaterial | null = null;

function getWaterMaterial(scene: Scene): StandardMaterial {
  if (sharedWaterMat) return sharedWaterMat;

  const mat = new StandardMaterial('waterEnhanced', scene);

  // Deep water base color
  mat.diffuseColor = new Color3(0.02, 0.06, 0.12);
  mat.specularColor = new Color3(0.8, 0.85, 0.9);
  mat.specularPower = 256;
  mat.emissiveColor = new Color3(0.008, 0.02, 0.04);
  mat.alpha = 0.55;
  mat.backFaceCulling = false;

  // Fresnel — more reflective at grazing angles like real water
  mat.diffuseFresnelParameters = new FresnelParameters();
  mat.diffuseFresnelParameters.leftColor = new Color3(1, 1, 1);
  mat.diffuseFresnelParameters.rightColor = new Color3(0.02, 0.06, 0.12);
  mat.diffuseFresnelParameters.bias = 0.4;
  mat.diffuseFresnelParameters.power = 2;

  mat.emissiveFresnelParameters = new FresnelParameters();
  mat.emissiveFresnelParameters.leftColor = new Color3(0.08, 0.15, 0.25);
  mat.emissiveFresnelParameters.rightColor = new Color3(0, 0, 0);
  mat.emissiveFresnelParameters.bias = 0.1;
  mat.emissiveFresnelParameters.power = 3;

  mat.reflectionFresnelParameters = new FresnelParameters();
  mat.reflectionFresnelParameters.leftColor = new Color3(0.5, 0.55, 0.6);
  mat.reflectionFresnelParameters.rightColor = new Color3(0, 0, 0);
  mat.reflectionFresnelParameters.bias = 0.2;
  mat.reflectionFresnelParameters.power = 2;

  // Normal map for wave detail
  const bumpTex = new Texture('/textures/terrain/water_normal.webp', scene);
  bumpTex.uScale = 6;
  bumpTex.vScale = 6;
  mat.bumpTexture = bumpTex;

  // Second normal map layer for wave complexity (use same texture, different scale)
  // Babylon StandardMaterial only supports one bump, so we animate UV for visual complexity

  // Animate water: scroll UV + pulse emissive for shimmer + subtle color shift
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.001;

    // Two-layer UV scroll (creates crossing wave pattern)
    bumpTex.uOffset = t * 0.08;
    bumpTex.vOffset = t * 0.05 + Math.sin(t * 0.3) * 0.02;

    // Pulsing emissive shimmer
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
    const deepPulse = 0.5 + 0.5 * Math.sin(t * 0.15);
    mat.emissiveColor = new Color3(
      0.008 + 0.012 * pulse,
      0.025 + 0.02 * deepPulse,
      0.05 + 0.035 * pulse
    );

    // Subtle alpha variation (waves catching light)
    mat.alpha = 0.6 + 0.08 * Math.sin(t * 0.4);
  });

  sharedWaterMat = mat;
  return mat;
}

export function createWater(
  water: WaterBodyDefinition,
  scene: Scene,
  getHeightAt: (x: number, z: number) => number
): Mesh {
  const pos = water.position;
  const halfW = water.size.width * 0.5;
  const halfD = water.size.depth * 0.5;

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
      subdivisions: 24,
    },
    scene
  );
  waterMesh.position = new Vector3(pos.x, waterY, pos.z);

  if (water.flowDirection) {
    const angle = Math.atan2(water.flowDirection[0], water.flowDirection[1]);
    waterMesh.rotation.y = angle;
  }

  waterMesh.material = getWaterMaterial(scene);
  waterMesh.isPickable = false;

  return waterMesh;
}
