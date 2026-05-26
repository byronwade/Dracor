import { createFractalNoise2D, createRidgeNoise2D, createWarpedNoise2D, type NoiseFn2D } from './noise';
import { createContinentalMap, isLand, type ContinentalFn } from './continental';
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
  const detailNoise = createFractalNoise2D(detailSeed, 4, 2.5, 0.4);
  const plateauNoise = createFractalNoise2D(hashCombine(elevSeed, 11111), 2, 1.8, 0.7);

  const baseFreq = 0.0006;
  const mountFreq = 0.0003;
  const mountMaskFreq = 0.00015;
  const detailFreq = 0.003;
  const plateauFreq = 0.0004;

  const baseAmplitude = 40;
  const mountAmplitude = 120;
  const detailAmplitude = 5;

  const getElevation = (worldX: number, worldZ: number): number => {
    const cont = continental(worldX, worldZ);

    if (cont < 0.05) {
      const oceanDepth = SEA_LEVEL + MIN_HEIGHT * (1 - cont / 0.05);
      const oceanDetail = detailNoise(worldX * detailFreq, worldZ * detailFreq) * 3;
      return oceanDepth + oceanDetail;
    }

    const landFactor = Math.min(1, (cont - 0.35) / 0.3);
    const coastFactor = smoothstep01(Math.max(0, Math.min(1, (cont - 0.2) / 0.3)));

    const base = baseNoise(worldX * baseFreq, worldZ * baseFreq) * baseAmplitude;

    const mMask = (mountainMask(worldX * mountMaskFreq, worldZ * mountMaskFreq) + 1) * 0.5;
    const mRaw = mountainNoise(worldX * mountFreq, worldZ * mountFreq);
    const mountains = mRaw * mountAmplitude * Math.pow(mMask, 2.5);

    const detail = detailNoise(worldX * detailFreq, worldZ * detailFreq) * detailAmplitude;

    const plateau = plateauNoise(worldX * plateauFreq, worldZ * plateauFreq);
    const plateauEffect = Math.max(0, plateau) * 25;

    let elevation = base + mountains + detail + plateauEffect;

    elevation *= coastFactor;

    if (cont < 0.35) {
      const shallowT = cont / 0.35;
      elevation = lerp(SEA_LEVEL - 8, elevation, shallowT);
    }

    return clamp(elevation, MIN_HEIGHT, MAX_HEIGHT);
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
