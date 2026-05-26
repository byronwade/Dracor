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

    for (const mesh of container.meshes) {
      mesh.setEnabled(false);
      mesh.isVisible = false;
    }

    containerCache.set(fileName, container);

    const meshNames = container.meshes
      .filter((m) => m instanceof Mesh && (m as Mesh).getTotalVertices() > 0)
      .map((m) => m.name);
    console.log(`[Foliage] Loaded ${fileName}: ${meshNames.length} meshes`);
    if (meshNames.length <= 20) {
      console.log(`[Foliage]   Names: ${meshNames.join(', ')}`);
    } else {
      console.log(`[Foliage]   First 10: ${meshNames.slice(0, 10).join(', ')} ...`);
    }

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
        if (!name.includes(variantPattern)) return false;
        if (!name.includes(lodSuffix)) return false;
        if (name.includes('sphere')) return false;
        if (name.includes('geonodes')) return false;
        return true;
      });
    } else {
      meshes = meshes.filter((m) => {
        const name = m.name.toLowerCase();
        return !name.includes('sphere');
      });
    }

    if (meshes.length === 0) {
      console.warn(`[Foliage] No matching meshes for "${modelId}" (variant: ${config?.variant ?? 'none'}) in ${fileName}`);
      return null;
    }

    console.log(`[Foliage] Matched ${meshes.length} mesh(es) for ${modelId}: ${meshes.map(m => m.name).join(', ')}`);

    let sourceMesh: Mesh;

    if (meshes.length === 1) {
      const clone = meshes[0].clone(`foliage_${modelId}`, null);
      if (!clone) {
        console.warn(`[Foliage] Failed to clone mesh for ${modelId}`);
        return null;
      }
      sourceMesh = clone;
    } else {
      const clones: Mesh[] = [];
      for (const m of meshes) {
        const clone = m.clone(`_tmp_${modelId}_${m.name}`, null);
        if (clone) clones.push(clone);
      }

      if (clones.length === 0) {
        console.warn(`[Foliage] Failed to clone meshes for ${modelId}`);
        return null;
      }

      const merged = Mesh.MergeMeshes(clones, true, true, undefined, false, true);
      if (!merged) {
        for (const c of clones) c.dispose();
        console.warn(`[Foliage] Failed to merge ${clones.length} meshes for ${modelId}`);
        return null;
      }
      sourceMesh = merged;
    }

    sourceMesh.name = `foliage_${modelId}`;
    sourceMesh.isVisible = false;
    sourceMesh.setEnabled(true);

    modelCache.set(modelId, sourceMesh);
    return sourceMesh;
  } catch (e) {
    console.warn(`[Foliage] Error loading ${fileName}:`, e);
    return null;
  }
}

export function clearModelCache(): void {
  modelCache.clear();
  containerCache.clear();
}
