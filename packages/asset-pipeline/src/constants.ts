/** Maximum total size of all assets in a single zone, in megabytes. */
export const MAX_ZONE_SIZE_MB = 256;

/** Maximum size of assets loaded during the initial zone load, in megabytes. */
export const MAX_INITIAL_LOAD_MB = 32;

/** Maximum size of a single streaming chunk, in megabytes. */
export const MAX_STREAMING_CHUNK_MB = 8;

/** Supported mesh file formats for the asset pipeline. */
export const SUPPORTED_MESH_FORMATS = ['glb', 'gltf'] as const;

/** Supported texture file formats for the asset pipeline. */
export const SUPPORTED_TEXTURE_FORMATS = ['ktx2', 'basis', 'png'] as const;

/** Supported audio file formats for the asset pipeline. */
export const SUPPORTED_AUDIO_FORMATS = ['ogg', 'mp3'] as const;

/** Supported heightmap file formats. */
export const SUPPORTED_HEIGHTMAP_FORMATS = ['png', 'raw'] as const;

/** Maximum number of LOD levels for any single mesh. */
export const MAX_LOD_LEVELS = 5;

/** Default streaming load distance in world units. */
export const DEFAULT_LOAD_DISTANCE = 150;

/** Default streaming unload distance in world units. */
export const DEFAULT_UNLOAD_DISTANCE = 200;
