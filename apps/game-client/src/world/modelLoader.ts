import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import '@babylonjs/core/Meshes/thinInstanceMesh';

const modelCache = new Map<string, Mesh>();
let loadersRegistered = false;

function ensureLoaders(): void {
  if (loadersRegistered) return;
  registerBuiltInLoaders();
  loadersRegistered = true;
}

export function getModelBasePath(): string {
  return '/models/foliage/';
}

export async function loadModel(modelId: string, scene: Scene): Promise<Mesh | null> {
  const cached = modelCache.get(modelId);
  if (cached) return cached;

  ensureLoaders();

  const url = `${getModelBasePath()}${modelId}.glb`;

  try {
    const container = await LoadAssetContainerAsync(url, scene);

    const meshes = container.meshes.filter(
      (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0
    );

    if (meshes.length === 0) {
      console.warn(`[Foliage] Model ${modelId}.glb has no geometry`);
      container.dispose();
      return null;
    }

    let sourceMesh: Mesh;

    if (meshes.length === 1) {
      sourceMesh = meshes[0];
      container.addAllToScene();
    } else {
      container.addAllToScene();
      const merged = Mesh.MergeMeshes(
        meshes,
        true,
        true,
        undefined,
        false,
        true
      );
      if (!merged) {
        console.warn(`[Foliage] Failed to merge meshes for ${modelId}.glb`);
        container.dispose();
        return null;
      }
      sourceMesh = merged;
    }

    sourceMesh.name = `foliage_${modelId}`;
    sourceMesh.isVisible = true;
    sourceMesh.setEnabled(true);

    modelCache.set(modelId, sourceMesh);
    return sourceMesh;
  } catch (e) {
    console.warn(`[Foliage] Model ${modelId}.glb not found, using procedural fallback`);
    return null;
  }
}

export function clearModelCache(): void {
  modelCache.clear();
}
