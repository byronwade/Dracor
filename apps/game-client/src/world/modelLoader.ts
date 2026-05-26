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
    containerCache.set(fileName, container);
    return container;
  } catch {
    return null;
  }
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
      const variantPattern = config.variant.toLowerCase();
      const lodSuffix = config?.lodLevel !== undefined ? `lod${config.lodLevel}` : 'lod0';
      meshes = meshes.filter((m) => {
        const name = m.name.toLowerCase();
        return name.includes(variantPattern) && name.includes(lodSuffix);
      });
    }

    if (meshes.length === 0) {
      console.warn(`[Foliage] No matching meshes for ${modelId} in ${fileName}`);
      return null;
    }

    console.log(`[Foliage] Found ${meshes.length} meshes for ${modelId}: ${meshes.map(m => m.name).join(', ')}`);

    const clones = meshes.map((m) => {
      const clone = m.clone(`${modelId}_${m.name}`, null);
      if (!clone) return null;
      clone.setEnabled(true);
      clone.isVisible = true;
      return clone;
    }).filter((c): c is Mesh => c !== null);

    if (clones.length === 0) {
      console.warn(`[Foliage] Failed to clone meshes for ${modelId}`);
      return null;
    }

    let sourceMesh: Mesh;

    if (clones.length === 1) {
      sourceMesh = clones[0];
    } else {
      const merged = Mesh.MergeMeshes(clones, true, true, undefined, false, true);
      if (!merged) {
        console.warn(`[Foliage] Failed to merge meshes for ${modelId}`);
        return null;
      }
      sourceMesh = merged;
    }

    sourceMesh.name = `foliage_${modelId}`;
    sourceMesh.isVisible = false;
    sourceMesh.setEnabled(true);

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
