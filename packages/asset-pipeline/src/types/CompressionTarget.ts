export interface CompressionTarget {
  meshFormat: 'glb' | 'gltf';
  meshCompression: 'draco' | 'meshopt' | 'none';
  textureFormat: 'ktx2' | 'basis' | 'png';
  audioFormat: 'ogg' | 'mp3';
  enableGzip: boolean;
}

export const COMPRESSION_TARGETS: Record<string, CompressionTarget> = {
  low: {
    meshFormat: 'glb',
    meshCompression: 'draco',
    textureFormat: 'basis',
    audioFormat: 'mp3',
    enableGzip: true,
  },
  medium: {
    meshFormat: 'glb',
    meshCompression: 'draco',
    textureFormat: 'ktx2',
    audioFormat: 'ogg',
    enableGzip: true,
  },
  high: {
    meshFormat: 'glb',
    meshCompression: 'meshopt',
    textureFormat: 'ktx2',
    audioFormat: 'ogg',
    enableGzip: true,
  },
  ultra: {
    meshFormat: 'gltf',
    meshCompression: 'none',
    textureFormat: 'png',
    audioFormat: 'ogg',
    enableGzip: false,
  },
  web: {
    meshFormat: 'glb',
    meshCompression: 'draco',
    textureFormat: 'basis',
    audioFormat: 'mp3',
    enableGzip: true,
  },
  desktop: {
    meshFormat: 'glb',
    meshCompression: 'meshopt',
    textureFormat: 'ktx2',
    audioFormat: 'ogg',
    enableGzip: false,
  },
};
