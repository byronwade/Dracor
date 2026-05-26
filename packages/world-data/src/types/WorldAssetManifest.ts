export interface WorldAssetManifest {
  zoneId: string;
  version: string;
  meshes: AssetEntry[];
  textures: AssetEntry[];
  audio: AssetEntry[];
}

export interface AssetEntry {
  id: string;
  path: string;
  type: string;
  sizeMB: number;
  required: boolean;
  lodLevel?: number;
}
