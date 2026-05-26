// Types
export type { AssetType, AssetManifestEntry, FullAssetManifest } from './types/AssetManifest';
export type { TextureBudget } from './types/TextureBudget';
export { getTextureBudget } from './types/TextureBudget';
export type { MeshBudget } from './types/MeshBudget';
export { getMeshBudget } from './types/MeshBudget';
export type { CompressionTarget } from './types/CompressionTarget';
export { COMPRESSION_TARGETS } from './types/CompressionTarget';

// Validation
export type { ValidationResult } from './validation/validateManifest';
export { validateZoneManifest, validateAssetManifest } from './validation/validateManifest';

// Constants
export {
  MAX_ZONE_SIZE_MB,
  MAX_INITIAL_LOAD_MB,
  MAX_STREAMING_CHUNK_MB,
  SUPPORTED_MESH_FORMATS,
  SUPPORTED_TEXTURE_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_HEIGHTMAP_FORMATS,
  MAX_LOD_LEVELS,
  DEFAULT_LOAD_DISTANCE,
  DEFAULT_UNLOAD_DISTANCE,
} from './constants';
