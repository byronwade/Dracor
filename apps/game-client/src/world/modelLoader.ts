import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { AssetContainer } from '@babylonjs/core/assetContainer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import '@babylonjs/core/Meshes/thinInstanceMesh';

const modelCache = new Map<string, Mesh>();
const containerCache = new Map<string, AssetContainer>();
let loadersRegistered = false;

function ensureLoaders(): void {
  if (loadersRegistered) return;
  registerBuiltInLoaders();
  loadersRegistered = true;
}

export function getModelBasePath(): string {
  return '/models/foliage/';
}

async function loadContainer(fileName: string, scene: Scene): Promise<AssetContainer | null> {
  const cached = containerCache.get(fileName);
  if (cached) return cached;

  ensureLoaders();

  const url = `${getModelBasePath()}${fileName}`;

  try {
    const container = await LoadAssetContainerAsync(url, scene);
    container.addAllToScene();
    containerCache.set(fileName, container);
    return container;
  } catch {
    return null;
  }
}

function mergeMeshes(meshes: Mesh[], name: string): Mesh | null {
  if (meshes.length === 0) return null;
  if (meshes.length === 1) {
    const m = meshes[0];
    m.name = name;
    m.isVisible = true;
    m.setEnabled(true);
    return m;
  }

  const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
  if (!merged) return null;
  merged.name = name;
  merged.isVisible = true;
  merged.setEnabled(true);
  return merged;
}

export interface ModelLoadConfig {
  fileName: string;
  variant?: string;
  lodLevel?: number;
}

export async function loadModel(modelId: string, scene: Scene, config?: ModelLoadConfig): Promise<Mesh | null> {
  const cached = modelCache.get(modelId);
  if (cached) return cached;

  const fileName = config?.fileName ?? `${modelId}.glb`;

  try {
    const container = await loadContainer(fileName, scene);
    if (!container) {
      console.warn(`[Foliage] Model ${fileName} not found, using procedural fallback`);
      return null;
    }

    let meshes = container.meshes.filter(
      (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0
    );

    if (config?.variant) {
      const variantPattern = config.variant;
      const lodSuffix = config?.lodLevel !== undefined ? `LOD${config.lodLevel}` : 'LOD0';
      meshes = meshes.filter((m) => {
        const name = m.name.toLowerCase();
        return name.includes(variantPattern.toLowerCase()) && name.includes(lodSuffix.toLowerCase());
      });
    }

    if (meshes.length === 0) {
      console.warn(`[Foliage] No matching meshes for ${modelId} in ${fileName}`);
      return null;
    }

    const sourceMesh = mergeMeshes(meshes, `foliage_${modelId}`);
    if (!sourceMesh) {
      console.warn(`[Foliage] Failed to merge meshes for ${modelId}`);
      return null;
    }

    modelCache.set(modelId, sourceMesh);
    return sourceMesh;
  } catch {
    console.warn(`[Foliage] Model ${fileName} not found, using procedural fallback`);
    return null;
  }
}

export function clearModelCache(): void {
  modelCache.clear();
  containerCache.clear();
}
