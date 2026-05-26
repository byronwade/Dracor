import type { QualityMode, QualityAtmosphereSettings, VisibilitySettings } from './types';

export const QUALITY_SETTINGS: Record<QualityMode, QualityAtmosphereSettings> = {
  low: {
    volumetricFogEnabled: false,
    volumetricFogSamples: 0,
    cloudResolution: 64,
    fogSampleCount: 8,
    skyResolution: 256,
    shadowInteraction: false,
    maxLocalFogVolumes: 0,
    particleDensityMultiplier: 0.3,
  },
  medium: {
    volumetricFogEnabled: false,
    volumetricFogSamples: 16,
    cloudResolution: 128,
    fogSampleCount: 16,
    skyResolution: 512,
    shadowInteraction: false,
    maxLocalFogVolumes: 4,
    particleDensityMultiplier: 0.6,
  },
  high: {
    volumetricFogEnabled: true,
    volumetricFogSamples: 32,
    cloudResolution: 256,
    fogSampleCount: 32,
    skyResolution: 1024,
    shadowInteraction: true,
    maxLocalFogVolumes: 8,
    particleDensityMultiplier: 0.8,
  },
  ultra: {
    volumetricFogEnabled: true,
    volumetricFogSamples: 64,
    cloudResolution: 512,
    fogSampleCount: 48,
    skyResolution: 1024,
    shadowInteraction: true,
    maxLocalFogVolumes: 16,
    particleDensityMultiplier: 1.0,
  },
  cinematic: {
    volumetricFogEnabled: true,
    volumetricFogSamples: 128,
    cloudResolution: 1024,
    fogSampleCount: 64,
    skyResolution: 2048,
    shadowInteraction: true,
    maxLocalFogVolumes: 32,
    particleDensityMultiplier: 1.5,
  },
};

export function getVisibilityForQuality(mode: QualityMode): VisibilitySettings {
  switch (mode) {
    case 'low':
      return { farClipDistance: 300, fogStartDistance: 50, fogEndDistance: 200, objectCullDistance: 150, terrainLODDistance: 200, foliageCullDistance: 100 };
    case 'medium':
      return { farClipDistance: 500, fogStartDistance: 80, fogEndDistance: 350, objectCullDistance: 250, terrainLODDistance: 350, foliageCullDistance: 180 };
    case 'high':
      return { farClipDistance: 800, fogStartDistance: 100, fogEndDistance: 500, objectCullDistance: 400, terrainLODDistance: 500, foliageCullDistance: 300 };
    case 'ultra':
      return { farClipDistance: 1200, fogStartDistance: 150, fogEndDistance: 700, objectCullDistance: 600, terrainLODDistance: 700, foliageCullDistance: 450 };
    case 'cinematic':
      return { farClipDistance: 2000, fogStartDistance: 200, fogEndDistance: 1200, objectCullDistance: 1000, terrainLODDistance: 1200, foliageCullDistance: 800 };
  }
}
