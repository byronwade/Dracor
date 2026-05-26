import type { RendererCapabilities } from '../capabilities/detectRendererCapabilities';

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  tier: QualityTier;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  shadowMapSize: number;
  textureResolution: number;
  foliageDensity: number;
  maxRenderDistance: number;
  postProcessingEnabled: boolean;
  particleDensity: number;
  targetFps: number;
  terrainChunkRadius: number;
  lodBias: number;
  ssaoEnabled: boolean;
  bloomEnabled: boolean;
}

const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  ultra: {
    tier: 'ultra',
    shadowQuality: 'high',
    shadowMapSize: 2048,
    textureResolution: 2048,
    foliageDensity: 1.0,
    maxRenderDistance: 300,
    postProcessingEnabled: true,
    particleDensity: 1.0,
    targetFps: 60,
    terrainChunkRadius: 5,
    lodBias: 0,
    ssaoEnabled: true,
    bloomEnabled: true,
  },
  high: {
    tier: 'high',
    shadowQuality: 'high',
    shadowMapSize: 1024,
    textureResolution: 1024,
    foliageDensity: 0.7,
    maxRenderDistance: 200,
    postProcessingEnabled: true,
    particleDensity: 0.8,
    targetFps: 60,
    terrainChunkRadius: 4,
    lodBias: 0.5,
    ssaoEnabled: true,
    bloomEnabled: true,
  },
  medium: {
    tier: 'medium',
    shadowQuality: 'medium',
    shadowMapSize: 512,
    textureResolution: 512,
    foliageDensity: 0.4,
    maxRenderDistance: 150,
    postProcessingEnabled: false,
    particleDensity: 0.5,
    targetFps: 45,
    terrainChunkRadius: 3,
    lodBias: 1.0,
    ssaoEnabled: false,
    bloomEnabled: false,
  },
  low: {
    tier: 'low',
    shadowQuality: 'low',
    shadowMapSize: 256,
    textureResolution: 256,
    foliageDensity: 0.2,
    maxRenderDistance: 100,
    postProcessingEnabled: false,
    particleDensity: 0.3,
    targetFps: 30,
    terrainChunkRadius: 2,
    lodBias: 2.0,
    ssaoEnabled: false,
    bloomEnabled: false,
  },
};

export function getQualitySettings(tier: QualityTier): QualitySettings {
  return { ...QUALITY_PRESETS[tier] };
}

export function autoSelectQuality(caps: RendererCapabilities): QualityTier {
  if (caps.webgpu) {
    return 'ultra';
  }
  if (caps.deviceTier === 'high') {
    return 'high';
  }
  if (caps.deviceTier === 'mid') {
    return 'medium';
  }
  return 'low';
}
