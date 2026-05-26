import type { QualityTier } from '../quality/renderQuality';

export interface PerformanceBudget {
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMemoryMB: number;
  maxActiveParticles: number;
  maxShadowCasters: number;
  maxFoliageInstances: number;
  targetFps: number;
}

const BUDGETS: Record<QualityTier, PerformanceBudget> = {
  ultra: {
    maxDrawCalls: 3000,
    maxTriangles: 2_000_000,
    maxTextureMemoryMB: 1024,
    maxActiveParticles: 10000,
    maxShadowCasters: 64,
    maxFoliageInstances: 50000,
    targetFps: 60,
  },
  high: {
    maxDrawCalls: 2000,
    maxTriangles: 1_000_000,
    maxTextureMemoryMB: 512,
    maxActiveParticles: 5000,
    maxShadowCasters: 32,
    maxFoliageInstances: 30000,
    targetFps: 60,
  },
  medium: {
    maxDrawCalls: 1000,
    maxTriangles: 500_000,
    maxTextureMemoryMB: 256,
    maxActiveParticles: 2000,
    maxShadowCasters: 16,
    maxFoliageInstances: 15000,
    targetFps: 45,
  },
  low: {
    maxDrawCalls: 500,
    maxTriangles: 200_000,
    maxTextureMemoryMB: 128,
    maxActiveParticles: 500,
    maxShadowCasters: 4,
    maxFoliageInstances: 5000,
    targetFps: 30,
  },
};

export function getBudgetForTier(tier: QualityTier): PerformanceBudget {
  return { ...BUDGETS[tier] };
}
