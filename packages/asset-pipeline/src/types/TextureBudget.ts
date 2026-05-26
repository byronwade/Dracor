export interface TextureBudget {
  maxSingleTextureSize: number;
  maxTotalTextureMemoryMB: number;
  preferredFormat: 'ktx2' | 'basis' | 'png';
  mipMapsRequired: boolean;
  maxResolution: number;
}

export function getTextureBudget(qualityTier: string): TextureBudget {
  switch (qualityTier) {
    case 'low':
      return {
        maxSingleTextureSize: 512,
        maxTotalTextureMemoryMB: 64,
        preferredFormat: 'basis',
        mipMapsRequired: true,
        maxResolution: 1024,
      };
    case 'medium':
      return {
        maxSingleTextureSize: 1024,
        maxTotalTextureMemoryMB: 128,
        preferredFormat: 'ktx2',
        mipMapsRequired: true,
        maxResolution: 2048,
      };
    case 'high':
      return {
        maxSingleTextureSize: 2048,
        maxTotalTextureMemoryMB: 256,
        preferredFormat: 'ktx2',
        mipMapsRequired: true,
        maxResolution: 4096,
      };
    case 'ultra':
      return {
        maxSingleTextureSize: 4096,
        maxTotalTextureMemoryMB: 512,
        preferredFormat: 'ktx2',
        mipMapsRequired: true,
        maxResolution: 8192,
      };
    default:
      return {
        maxSingleTextureSize: 1024,
        maxTotalTextureMemoryMB: 128,
        preferredFormat: 'ktx2',
        mipMapsRequired: true,
        maxResolution: 2048,
      };
  }
}
