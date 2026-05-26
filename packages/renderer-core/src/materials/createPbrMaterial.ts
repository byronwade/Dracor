import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

export interface PbrMaterialOptions {
  baseColor: [number, number, number];
  roughness: number;
  metallic: number;
  emissiveColor?: [number, number, number];
  emissiveIntensity?: number;
  alpha?: number;
}

export function createPbrMaterial(
  name: string,
  scene: Scene,
  options: PbrMaterialOptions
): PBRMaterial {
  const mat = new PBRMaterial(name, scene);

  mat.albedoColor = new Color3(
    options.baseColor[0],
    options.baseColor[1],
    options.baseColor[2]
  );
  mat.roughness = options.roughness;
  mat.metallic = options.metallic;

  if (options.emissiveColor) {
    const intensity = options.emissiveIntensity ?? 1.0;
    mat.emissiveColor = new Color3(
      options.emissiveColor[0] * intensity,
      options.emissiveColor[1] * intensity,
      options.emissiveColor[2] * intensity
    );
  }

  if (options.alpha !== undefined) {
    mat.alpha = options.alpha;
    if (options.alpha < 1.0) {
      mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      mat.needDepthPrePass = true;
    }
  }

  mat.useRadianceOverAlpha = false;
  mat.useSpecularOverAlpha = false;
  mat.forceIrradianceInFragment = true;

  return mat;
}
