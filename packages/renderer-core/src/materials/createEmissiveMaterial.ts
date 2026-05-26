import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

export interface EmissiveMaterialOptions {
  baseColor: [number, number, number];
  emissiveColor: [number, number, number];
  emissiveIntensity: number;
  alpha?: number;
}

export function createEmissiveMaterial(
  name: string,
  scene: Scene,
  options: EmissiveMaterialOptions
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);

  mat.diffuseColor = new Color3(
    options.baseColor[0],
    options.baseColor[1],
    options.baseColor[2]
  );

  mat.emissiveColor = new Color3(
    options.emissiveColor[0] * options.emissiveIntensity,
    options.emissiveColor[1] * options.emissiveIntensity,
    options.emissiveColor[2] * options.emissiveIntensity
  );

  mat.specularColor = Color3.Black();
  mat.disableLighting = false;

  if (options.alpha !== undefined) {
    mat.alpha = options.alpha;
    if (options.alpha < 1.0) {
      mat.needDepthPrePass = true;
    }
  }

  return mat;
}
