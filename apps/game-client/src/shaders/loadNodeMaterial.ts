import { NodeMaterial, NodeMaterialParse } from '@babylonjs/core/Materials/Node/nodeMaterial';
import type { Scene } from '@babylonjs/core/scene';

const materialCache = new Map<string, NodeMaterial>();

export async function loadNodeMaterial(scene: Scene, path: string, name: string): Promise<NodeMaterial> {
  const cached = materialCache.get(name);
  if (cached) return cached;

  const response = await fetch(path);
  const json = await response.json();
  const mat = NodeMaterialParse(json, scene, '');
  mat.name = name;
  mat.build();
  materialCache.set(name, mat);
  return mat;
}

export function getCachedMaterial(name: string): NodeMaterial | undefined {
  return materialCache.get(name);
}
