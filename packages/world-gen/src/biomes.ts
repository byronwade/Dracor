import { type WorldSeed } from './seed';
import { type ClimateMap } from './climate';
import { createFractalNoise2D } from './noise';

export type BiomeType =
  | 'deep_ocean'
  | 'shallow_ocean'
  | 'beach'
  | 'tropical_beach'
  | 'grassland'
  | 'plains'
  | 'forest'
  | 'dense_forest'
  | 'pine_forest'
  | 'jungle'
  | 'swamp'
  | 'desert'
  | 'badlands'
  | 'savanna'
  | 'tundra'
  | 'snowy_peaks'
  | 'mountain'
  | 'alpine_meadow'
  | 'volcanic'
  | 'wetlands'
  | 'cliff'
  | 'river_valley';

export interface BiomeInfo {
  type: BiomeType;
  temperature: number;
  moisture: number;
  elevation: number;
  continental: number;
  blendWeight: number;  // 0-1, how strongly this biome dominates vs neighbors
}

export interface BiomeResolver {
  getBiome: (worldX: number, worldZ: number) => BiomeInfo;
  getBiomeType: (worldX: number, worldZ: number) => BiomeType;
}

export function createBiomeResolver(
  worldSeed: WorldSeed,
  getElevation: (wx: number, wz: number) => number,
  getContinental: (wx: number, wz: number) => number,
  climate: ClimateMap
): BiomeResolver {
  const biomeSeed = worldSeed.getLayerSeed('biome');
  const jitterNoise = createFractalNoise2D(biomeSeed, 3);
  const jitterFreq = 0.001;

  const getBiome = (worldX: number, worldZ: number): BiomeInfo => {
    const elev = getElevation(worldX, worldZ);
    const cont = getContinental(worldX, worldZ);
    const temp = climate.getTemperature(worldX, worldZ);
    const moist = climate.getMoisture(worldX, worldZ);

    // Small noise jitter to prevent perfectly straight biome borders
    const jitter = jitterNoise(worldX * jitterFreq, worldZ * jitterFreq) * 0.05;
    const t = clamp01(temp + jitter);
    const m = clamp01(moist + jitter * 0.7);

    // Compute slope from neighboring elevations
    const step = 2.0;
    const hR = getElevation(worldX + step, worldZ);
    const hF = getElevation(worldX, worldZ + step);
    const slopeX = (hR - elev) / step;
    const slopeZ = (hF - elev) / step;
    const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
    const slopeDeg = Math.atan(slope) * (180 / Math.PI);

    const type = resolveBiomeType(elev, t, m, cont, slopeDeg);

    // Blend weight: how "purely" this biome should express
    // Near biome boundaries, this drops to allow blending
    const blendWeight = computeBlendWeight(elev, t, m, cont, type);

    return { type, temperature: t, moisture: m, elevation: elev, continental: cont, blendWeight };
  };

  const getBiomeType = (worldX: number, worldZ: number): BiomeType => {
    return getBiome(worldX, worldZ).type;
  };

  return { getBiome, getBiomeType };
}

function resolveBiomeType(
  elev: number, temp: number, moist: number, cont: number, slopeDeg: number
): BiomeType {
  // Ocean
  if (cont < 0.2) return 'deep_ocean';
  if (cont < 0.35) return 'shallow_ocean';

  // Steep slopes = cliff regardless of biome
  if (slopeDeg > 45) return 'cliff';

  // Beach: near coastline and low elevation
  if (cont < 0.45 && elev < 3) {
    return temp > 0.65 ? 'tropical_beach' : 'beach';
  }

  // High elevation
  if (elev > 120) {
    if (temp < 0.25) return 'snowy_peaks';
    return 'mountain';
  }

  if (elev > 80) {
    if (temp < 0.3) return 'snowy_peaks';
    if (temp < 0.45) return 'tundra';
    if (moist > 0.5) return 'alpine_meadow';
    return 'mountain';
  }

  // Mid-high elevation
  if (elev > 50) {
    if (temp < 0.35) return 'tundra';
    if (moist > 0.6) return 'pine_forest';
    if (moist < 0.25) return 'badlands';
    return 'alpine_meadow';
  }

  // Low elevation, wet
  if (elev < 5 && moist > 0.7) return 'swamp';
  if (elev < 10 && moist > 0.65) return 'wetlands';

  // Hot biomes
  if (temp > 0.75) {
    if (moist < 0.2) return 'desert';
    if (moist < 0.35) return 'badlands';
    if (moist < 0.5) return 'savanna';
    if (moist > 0.7) return 'jungle';
    return 'forest';
  }

  // Warm biomes
  if (temp > 0.5) {
    if (moist < 0.25) return 'plains';
    if (moist < 0.45) return 'grassland';
    if (moist < 0.65) return 'forest';
    return 'dense_forest';
  }

  // Cool biomes
  if (temp > 0.3) {
    if (moist < 0.3) return 'plains';
    if (moist < 0.5) return 'grassland';
    return 'pine_forest';
  }

  // Cold biomes
  if (moist > 0.5) return 'pine_forest';
  return 'tundra';
}

function computeBlendWeight(
  elev: number, temp: number, moist: number, cont: number, type: BiomeType
): number {
  // Full weight in biome core, reduced near boundaries
  // This is simplified - uses distance from biome thresholds

  let minDist = 1.0;

  // Distance from ocean/land boundary
  if (cont > 0.3 && cont < 0.5) {
    minDist = Math.min(minDist, (cont - 0.3) / 0.2);
  }

  // Distance from elevation thresholds
  const elevThresholds = [3, 5, 10, 50, 80, 120];
  for (const th of elevThresholds) {
    const dist = Math.abs(elev - th) / 15;
    minDist = Math.min(minDist, dist);
  }

  // Distance from temperature thresholds
  const tempThresholds = [0.25, 0.3, 0.35, 0.45, 0.5, 0.65, 0.75];
  for (const th of tempThresholds) {
    const dist = Math.abs(temp - th) / 0.1;
    minDist = Math.min(minDist, dist);
  }

  return clamp01(minDist);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
