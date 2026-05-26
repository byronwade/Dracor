import { createFractalNoise2D, createWarpedNoise2D, type NoiseFn2D } from './noise';
import { hashCombine } from './seed';
import { HALF_WORLD } from './config';

export type ContinentalFn = (worldX: number, worldZ: number) => number;

export function createContinentalMap(seed: number): ContinentalFn {
  const coastNoise = createWarpedNoise2D(seed, 5, 0.4);
  const detailNoise = createFractalNoise2D(hashCombine(seed, 54321), 3);
  const peninsulaNoise = createFractalNoise2D(hashCombine(seed, 12345), 2, 2.0, 0.6);

  const coastFreq = 0.0004;
  const detailFreq = 0.002;
  const peninsulaFreq = 0.0008;

  const landRadius = HALF_WORLD * 0.78;
  const coastAmplitude = HALF_WORLD * 0.18;
  const peninsulaAmplitude = HALF_WORLD * 0.12;

  return (worldX: number, worldZ: number): number => {
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);

    const angle = Math.atan2(worldZ, worldX);
    const coastOffset = coastNoise(worldX * coastFreq, worldZ * coastFreq) * coastAmplitude;
    const peninsulaOffset = peninsulaNoise(
      worldX * peninsulaFreq + Math.cos(angle) * 500,
      worldZ * peninsulaFreq + Math.sin(angle) * 500
    ) * peninsulaAmplitude;

    const effectiveRadius = landRadius + coastOffset + peninsulaOffset;

    let continentalValue: number;
    if (dist < effectiveRadius * 0.7) {
      continentalValue = 1.0;
    } else if (dist > effectiveRadius * 1.1) {
      continentalValue = 0.0;
    } else {
      const t = (dist - effectiveRadius * 0.7) / (effectiveRadius * 0.4);
      continentalValue = 1.0 - smoothstepClamp(t);
    }

    const detail = detailNoise(worldX * detailFreq, worldZ * detailFreq) * 0.08;
    continentalValue = clamp01(continentalValue + detail);

    return continentalValue;
  };
}

export function isLand(continentalValue: number): boolean {
  return continentalValue > 0.35;
}

export function isCoast(continentalValue: number): boolean {
  return continentalValue > 0.2 && continentalValue < 0.5;
}

export function isDeepOcean(continentalValue: number): boolean {
  return continentalValue < 0.1;
}

function smoothstepClamp(t: number): number {
  const ct = Math.max(0, Math.min(1, t));
  return ct * ct * (3 - 2 * ct);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
