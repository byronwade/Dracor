import { createFractalNoise2D, createRidgeNoise2D, createWarpedNoise2D, type NoiseFn2D } from './noise';
import { createContinentalMap, type ContinentalFn } from './continental';
import { hashCombine, type WorldSeed } from './seed';
import { SEA_LEVEL, MIN_HEIGHT, MAX_HEIGHT } from './config';

export type ElevationFn = (worldX: number, worldZ: number) => number;

export interface ElevationMapResult {
  getElevation: ElevationFn;
  getContinental: ContinentalFn;
}

export function createElevationMap(worldSeed: WorldSeed): ElevationMapResult {
  const elevSeed = worldSeed.getLayerSeed('elevation');
  const mountSeed = worldSeed.getLayerSeed('mountain');
  const detailSeed = worldSeed.getLayerSeed('detail');
  const contSeed = worldSeed.getLayerSeed('continental');

  const continental = createContinentalMap(contSeed);

  const baseNoise = createWarpedNoise2D(elevSeed, 6, 0.3);
  const mountainNoise = createRidgeNoise2D(mountSeed, 4, 2.2, 0.55);
  const mountainMask = createFractalNoise2D(hashCombine(mountSeed, 88888), 3);

  const hillNoise = createFractalNoise2D(hashCombine(detailSeed, 22222), 4, 2.0, 0.5);
  const bumpNoise = createFractalNoise2D(hashCombine(detailSeed, 33333), 3, 2.5, 0.45);
  const microNoise = createFractalNoise2D(detailSeed, 2, 3.0, 0.3);

  const plateauNoise = createFractalNoise2D(hashCombine(elevSeed, 11111), 2, 1.8, 0.7);

  const getElevation = (worldX: number, worldZ: number): number => {
    const cont = continental(worldX, worldZ);

    // --- Ocean branch ---
    const computeOcean = (): number => {
      const oceanDepth = SEA_LEVEL + MIN_HEIGHT * (1 - cont / 0.05);
      const oceanDetail = microNoise(worldX * 0.005, worldZ * 0.005) * 8;
      return oceanDepth + oceanDetail;
    };

    if (cont < 0.05) {
      return computeOcean();
    }

    // --- Land branch ---
    const computeLand = (): number => {
      const coastFactor = smoothstep01(Math.max(0, Math.min(1, (cont - 0.2) / 0.3)));

      const base = baseNoise(worldX * 0.0006, worldZ * 0.0006) * 60;

      const mMask = (mountainMask(worldX * 0.00015, worldZ * 0.00015) + 1) * 0.5;
      const mRaw = mountainNoise(worldX * 0.0003, worldZ * 0.0003);
      const mountains = mRaw * 220 * Math.pow(mMask, 2.5);

      const hills = hillNoise(worldX * 0.003, worldZ * 0.003) * 25;
      const bumps = bumpNoise(worldX * 0.01, worldZ * 0.01) * 8;
      const micro = microNoise(worldX * 0.04, worldZ * 0.04) * 2.5;

      const plateau = plateauNoise(worldX * 0.0004, worldZ * 0.0004);
      const plateauEffect = Math.max(0, plateau) * 50;

      let elevation = base + mountains + hills + bumps + micro + plateauEffect;

      elevation *= coastFactor;

      if (cont < 0.35) {
        const shallowT = cont / 0.35;
        elevation = lerp(SEA_LEVEL - 8, elevation, shallowT);
      }

      return clamp(elevation, MIN_HEIGHT, MAX_HEIGHT);
    };

    // --- Coastal blend zone [0.05, 0.15] ---
    // Smoothly blend between the ocean and land branches to avoid the ~7m
    // elevation cliff that existed at the hard cont=0.05 boundary.
    if (cont < 0.15) {
      const blendT = smoothstep01((cont - 0.05) / 0.10);
      const oceanElev = computeOcean();
      const landElev = computeLand();
      return lerp(oceanElev, landElev, blendT);
    }

    return computeLand();
  };

  return { getElevation, getContinental: continental };
}

function smoothstep01(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
