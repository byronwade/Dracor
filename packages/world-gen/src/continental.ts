import { createFractalNoise2D, createWarpedNoise2D, type NoiseFn2D } from './noise';
import { hashCombine } from './seed';
import { HALF_WORLD } from './config';

export type ContinentalFn = (worldX: number, worldZ: number) => number;

export function createContinentalMap(seed: number): ContinentalFn {
  const coastNoise = createWarpedNoise2D(seed, 5, 0.4);
  const detailNoise = createFractalNoise2D(hashCombine(seed, 54321), 3);
  const peninsulaNoise = createFractalNoise2D(hashCombine(seed, 12345), 2, 2.0, 0.6);
  const islandNoise = createFractalNoise2D(hashCombine(seed, 67890), 4, 2.0, 0.5);
  const fjordNoise = createWarpedNoise2D(hashCombine(seed, 11223), 3, 0.6);

  const coastFreq = 0.0004;
  const detailFreq = 0.002;
  const peninsulaFreq = 0.0008;
  const islandFreq = 0.0012;
  const fjordFreq = 0.0006;

  const landRadius = HALF_WORLD * 0.72;
  const coastAmplitude = HALF_WORLD * 0.22;
  const peninsulaAmplitude = HALF_WORLD * 0.15;

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
    if (dist < effectiveRadius * 0.65) {
      continentalValue = 1.0;
    } else if (dist > effectiveRadius * 1.15) {
      continentalValue = 0.0;
    } else {
      const t = (dist - effectiveRadius * 0.65) / (effectiveRadius * 0.5);
      continentalValue = 1.0 - smoothstepClamp(t);
    }

    // Fjord incisions: narrow cuts into coastline
    const fjordVal = fjordNoise(worldX * fjordFreq, worldZ * fjordFreq);
    if (fjordVal > 0.6 && continentalValue > 0.3 && continentalValue < 0.8) {
      const fjordStrength = (fjordVal - 0.6) / 0.4;
      continentalValue -= fjordStrength * 0.45;
    }

    // Island chains beyond the main continent
    if (continentalValue < 0.3) {
      const islandVal = islandNoise(worldX * islandFreq, worldZ * islandFreq);
      if (islandVal > 0.55) {
        const islandStrength = (islandVal - 0.55) / 0.45;
        const distFade = Math.max(0, 1 - (dist - effectiveRadius * 1.1) / (HALF_WORLD * 0.4));
        continentalValue = Math.max(continentalValue, islandStrength * 0.7 * distFade);
      }
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
