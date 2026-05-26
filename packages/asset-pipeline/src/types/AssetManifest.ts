export type AssetType =
  | 'mesh_glb'
  | 'mesh_gltf'
  | 'texture_png'
  | 'texture_ktx2'
  | 'texture_basis'
  | 'audio_ogg'
  | 'audio_mp3'
  | 'heightmap';

export interface AssetManifestEntry {
  id: string;
  type: AssetType;
  path: string;
  sizeMB: number;
  compressed: boolean;
  lodLevel?: number;
  mipLevels?: number;
  tags: string[];
}

export interface FullAssetManifest {
  version: string;
  zoneId: string;
  totalSizeMB: number;
  entries: AssetManifestEntry[];
}
