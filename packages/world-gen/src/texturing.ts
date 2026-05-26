import { type WorldSeed, hashCombine } from './seed';
import { type BiomeInfo, type BiomeType } from './biomes';
import { createFractalNoise2D } from './noise';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TerrainTextureId =
  | 'grass_green'
  | 'grass_dry'
  | 'grass_lush'
  | 'dirt'
  | 'dirt_dark'
  | 'mud'
  | 'sand'
  | 'sand_red'
  | 'rock_gray'
  | 'rock_dark'
  | 'rock_volcanic'
  | 'snow'
  | 'snow_dirty'
  | 'gravel'
  | 'moss'
  | 'clay'
  | 'forest_floor'
  | 'jungle_floor'
  | 'swamp_mud'
  | 'ice'
  | 'cobblestone';

export interface TextureWeight {
  textureId: TerrainTextureId;
  weight: number; // 0-1
}

export interface TerrainTextureResult {
  primary: TerrainTextureId;
  layers: TextureWeight[]; // up to 4 layers for blending, sorted by weight desc
}

export interface TextureResolver {
  resolve: (worldX: number, worldZ: number) => TerrainTextureResult;
}

// ---------------------------------------------------------------------------
// Biome base texture definitions
// Each entry: [primary, ...secondaries with relative weights]
// ---------------------------------------------------------------------------

interface BiomeTextureSpec {
  primary: TerrainTextureId;
  secondary?: Array<{ textureId: TerrainTextureId; weight: number }>;
}

const BIOME_TEXTURES: Record<BiomeType, BiomeTextureSpec> = {
  deep_ocean:    { primary: 'sand',         secondary: [{ textureId: 'gravel', weight: 0.15 }] },
  shallow_ocean: { primary: 'sand',         secondary: [{ textureId: 'mud', weight: 0.2 }] },
  beach:         { primary: 'sand',         secondary: [{ textureId: 'gravel', weight: 0.2 }, { textureId: 'dirt', weight: 0.1 }] },
  tropical_beach:{ primary: 'sand',         secondary: [{ textureId: 'sand_red', weight: 0.15 }] },
  grassland:     { primary: 'grass_green',  secondary: [{ textureId: 'dirt', weight: 0.2 }, { textureId: 'grass_dry', weight: 0.1 }] },
  plains:        { primary: 'grass_dry',    secondary: [{ textureId: 'dirt', weight: 0.3 }, { textureId: 'gravel', weight: 0.1 }] },
  forest:        { primary: 'forest_floor', secondary: [{ textureId: 'grass_green', weight: 0.3 }, { textureId: 'moss', weight: 0.15 }] },
  dense_forest:  { primary: 'forest_floor', secondary: [{ textureId: 'dirt_dark', weight: 0.25 }, { textureId: 'moss', weight: 0.2 }] },
  pine_forest:   { primary: 'forest_floor', secondary: [{ textureId: 'dirt_dark', weight: 0.2 }, { textureId: 'gravel', weight: 0.1 }] },
  jungle:        { primary: 'jungle_floor', secondary: [{ textureId: 'mud', weight: 0.25 }, { textureId: 'moss', weight: 0.2 }] },
  swamp:         { primary: 'swamp_mud',    secondary: [{ textureId: 'mud', weight: 0.35 }, { textureId: 'moss', weight: 0.15 }] },
  desert:        { primary: 'sand',         secondary: [{ textureId: 'sand_red', weight: 0.25 }, { textureId: 'gravel', weight: 0.1 }] },
  badlands:      { primary: 'sand_red',     secondary: [{ textureId: 'rock_dark', weight: 0.3 }, { textureId: 'dirt', weight: 0.2 }] },
  savanna:       { primary: 'grass_dry',    secondary: [{ textureId: 'dirt', weight: 0.35 }, { textureId: 'sand', weight: 0.15 }] },
  tundra:        { primary: 'dirt_dark',    secondary: [{ textureId: 'gravel', weight: 0.25 }, { textureId: 'snow_dirty', weight: 0.2 }] },
  snowy_peaks:   { primary: 'snow',         secondary: [{ textureId: 'rock_gray', weight: 0.3 }, { textureId: 'snow_dirty', weight: 0.15 }] },
  mountain:      { primary: 'rock_gray',    secondary: [{ textureId: 'gravel', weight: 0.2 }, { textureId: 'dirt_dark', weight: 0.15 }] },
  alpine_meadow: { primary: 'grass_lush',   secondary: [{ textureId: 'rock_gray', weight: 0.2 }, { textureId: 'dirt_dark', weight: 0.1 }] },
  volcanic:      { primary: 'rock_volcanic',secondary: [{ textureId: 'rock_dark', weight: 0.3 }, { textureId: 'gravel', weight: 0.1 }] },
  wetlands:      { primary: 'mud',          secondary: [{ textureId: 'grass_lush', weight: 0.3 }, { textureId: 'moss', weight: 0.2 }] },
  cliff:         { primary: 'rock_gray',    secondary: [{ textureId: 'rock_dark', weight: 0.25 }, { textureId: 'gravel', weight: 0.15 }] },
  river_valley:  { primary: 'grass_lush',   secondary: [{ textureId: 'mud', weight: 0.25 }, { textureId: 'clay', weight: 0.2 }] },
};

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Degrees of slope above which rock starts blending in */
const SLOPE_ROCK_START_DEG = 25;
/** Degrees of slope at which rock fully dominates */
const SLOPE_ROCK_FULL_DEG = 45;

/** Elevation at which snow_dirty starts blending in */
const SNOW_BLEND_START_M = 100;
/** Elevation at which snow fully dominates */
const SNOW_FULL_M = 130;

/** World-space distance at which water proximity effects begin (meters) */
const WATER_PROXIMITY_NEAR_M = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function inverseLerp(a: number, b: number, v: number): number {
  if (b === a) return 0;
  return clamp01((v - a) / (b - a));
}

/** Compute slope in degrees from neighboring elevation samples. */
function computeSlopeDeg(
  worldX: number, worldZ: number,
  getElevation: (x: number, z: number) => number
): number {
  const step = 2.0;
  const h0 = getElevation(worldX, worldZ);
  const hR = getElevation(worldX + step, worldZ);
  const hF = getElevation(worldX, worldZ + step);
  const slopeX = (hR - h0) / step;
  const slopeZ = (hF - h0) / step;
  return Math.atan(Math.sqrt(slopeX * slopeX + slopeZ * slopeZ)) * (180 / Math.PI);
}

/** Choose the rock texture appropriate for the biome (volcanic zones use rock_volcanic). */
function slopeRockTexture(biomeType: BiomeType): TerrainTextureId {
  if (biomeType === 'volcanic') return 'rock_volcanic';
  if (biomeType === 'badlands' || biomeType === 'desert') return 'rock_dark';
  return 'rock_gray';
}

/** Accumulate a texture weight into a Map, adding to any existing entry. */
function accum(
  map: Map<TerrainTextureId, number>,
  id: TerrainTextureId,
  weight: number
): void {
  map.set(id, (map.get(id) ?? 0) + weight);
}

/** Convert the weight map to sorted, normalised layers (up to 4). */
function finaliseLayers(map: Map<TerrainTextureId, number>): TextureWeight[] {
  let total = 0;
  map.forEach(w => { total += w; });

  const sorted: TextureWeight[] = [];
  map.forEach((w, id) => {
    sorted.push({ textureId: id, weight: total > 0 ? w / total : 0 });
  });

  sorted.sort((a, b) => b.weight - a.weight);
  const top4 = sorted.slice(0, 4);

  // Re-normalise the top-4 slice so weights sum to 1.
  let sliceTotal = 0;
  top4.forEach(l => { sliceTotal += l.weight; });
  if (sliceTotal > 0) {
    top4.forEach(l => { l.weight /= sliceTotal; });
  }

  return top4;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTextureResolver(
  worldSeed: WorldSeed,
  getBiome: (wx: number, wz: number) => BiomeInfo,
  getElevation: (wx: number, wz: number) => number,
  getWaterDistance: (wx: number, wz: number) => number
): TextureResolver {

  // Derive seeds without touching the fixed LayerName list.
  const noiseSeedA = hashCombine(worldSeed.raw, 0x54657831); // 'Tex1' in hex-ish
  const noiseSeedB = hashCombine(worldSeed.raw, 0x54657832); // 'Tex2'
  const noiseSeedC = hashCombine(worldSeed.raw, 0x54657833); // 'Tex3'

  // Variation noise: perturbs overlay thresholds so borders aren't razor-straight.
  // Low frequency (0.03) gives large-scale natural variation.
  const variationNoise = createFractalNoise2D(noiseSeedA, 3);
  const VARIATION_FREQ = 0.03;
  const VARIATION_SCALE = 0.08; // ±8% perturbation of normalised thresholds

  // Secondary detail noise for extra texture micro-variation.
  const detailNoise = createFractalNoise2D(noiseSeedB, 4);
  const DETAIL_FREQ = 0.08;
  const DETAIL_SCALE = 0.06;

  // Moisture-variation noise: perturbs moisture-sensitive secondary choices.
  const moistureNoise = createFractalNoise2D(noiseSeedC, 2);
  const MOISTURE_FREQ = 0.05;

  const resolve = (worldX: number, worldZ: number): TerrainTextureResult => {
    const biome = getBiome(worldX, worldZ);
    const elev = biome.elevation; // already available in BiomeInfo — avoids extra call
    const waterDist = getWaterDistance(worldX, worldZ);

    // Noise values — computed once per resolve call.
    const variation = variationNoise(worldX * VARIATION_FREQ, worldZ * VARIATION_FREQ);
    const detail    = detailNoise(worldX * DETAIL_FREQ, worldZ * DETAIL_FREQ);
    const moistVar  = moistureNoise(worldX * MOISTURE_FREQ, worldZ * MOISTURE_FREQ);

    // Slope — sample neighbors (uses getElevation directly).
    const slopeDeg = computeSlopeDeg(worldX, worldZ, getElevation);

    // --- Accumulate weights ---
    const weights = new Map<TerrainTextureId, number>();

    // 1. Biome base textures
    const spec = BIOME_TEXTURES[biome.type];
    const secondaryTotal = spec.secondary?.reduce((s, e) => s + e.weight, 0) ?? 0;
    const primaryBaseWeight = Math.max(0.4, 1.0 - secondaryTotal);

    // Small noise modulation on primary weight (±DETAIL_SCALE) keeps it lively.
    const primaryWeight = clamp01(primaryBaseWeight + detail * DETAIL_SCALE);
    accum(weights, spec.primary, primaryWeight);

    if (spec.secondary) {
      for (const sec of spec.secondary) {
        // Perturb secondary weights slightly with moisture noise.
        const perturbedWeight = clamp01(sec.weight * (1 + moistVar * 0.3));
        accum(weights, sec.textureId, perturbedWeight);
      }
    }

    // Moisture-sensitive secondary bonus: near-water biomes get extra lush/wet textures.
    const effectiveMoisture = clamp01(biome.moisture + moistVar * 0.15);
    if (effectiveMoisture > 0.7 && biome.type === 'desert') {
      // High-temp desert edge: slight sand_red bonus.
      accum(weights, 'sand_red', (effectiveMoisture - 0.7) * 0.5);
    }

    // 2. Slope-based rock overlay
    // Threshold perturbed by variation noise so the boundary isn't a perfect contour.
    const slopeRockStartPerturbed = SLOPE_ROCK_START_DEG * (1 + variation * VARIATION_SCALE);
    const slopeRockFullPerturbed  = SLOPE_ROCK_FULL_DEG  * (1 + variation * VARIATION_SCALE * 0.5);

    if (slopeDeg > slopeRockStartPerturbed) {
      const rockStrength = inverseLerp(slopeRockStartPerturbed, slopeRockFullPerturbed, slopeDeg);
      const rockTex = slopeRockTexture(biome.type);
      accum(weights, rockTex, rockStrength * 1.5); // relatively high weight to override biome
      // Steep slopes also deposit gravel at the base.
      if (rockStrength > 0.3) {
        accum(weights, 'gravel', rockStrength * 0.3);
      }
    }

    // 3. Height-based snow overlay
    // Perturb the snowline thresholds by variation noise.
    const snowStartPerturbed = SNOW_BLEND_START_M * (1 + variation * VARIATION_SCALE);
    const snowFullPerturbed  = SNOW_FULL_M        * (1 + variation * VARIATION_SCALE * 0.5);

    if (elev > snowStartPerturbed) {
      const snowT = inverseLerp(snowStartPerturbed, snowFullPerturbed, elev);
      if (snowT < 0.5) {
        // Partial: snow_dirty blends in first.
        accum(weights, 'snow_dirty', snowT * 2.0 * 1.2);
      } else {
        // Full: transition to clean snow, snow_dirty lingers at edges.
        const snowDirtyFade = clamp01(1.0 - (snowT - 0.5) * 2.0);
        accum(weights, 'snow_dirty', snowDirtyFade * 0.5);
        accum(weights, 'snow', (snowT - 0.5) * 2.0 * 2.0); // high weight for dominance
      }
    }

    // 4. Water proximity effects
    // Perturb water-edge threshold by variation.
    const waterNearPerturbed = WATER_PROXIMITY_NEAR_M * (1 + variation * VARIATION_SCALE);

    if (waterDist < waterNearPerturbed) {
      const wetT = inverseLerp(waterNearPerturbed, 0, waterDist); // 0 at edge, 1 at shoreline

      // Wet biomes: swamp/jungle already have mud — reinforce it.
      if (biome.type === 'swamp' || biome.type === 'jungle' || biome.type === 'wetlands') {
        accum(weights, 'swamp_mud', wetT * 0.6);
        accum(weights, 'mud', wetT * 0.4);
      } else if (biome.type === 'desert' || biome.type === 'badlands') {
        // Surprisingly wet desert edge — clay and mud deposit.
        accum(weights, 'clay', wetT * 0.5);
        accum(weights, 'mud', wetT * 0.3);
      } else if (biome.type === 'forest' || biome.type === 'dense_forest' ||
                 biome.type === 'pine_forest') {
        accum(weights, 'moss', wetT * 0.5);
        accum(weights, 'mud', wetT * 0.2);
      } else if (biome.type === 'snowy_peaks' || biome.type === 'tundra') {
        // Frozen shore: ice near water.
        accum(weights, 'ice', wetT * 0.5);
        accum(weights, 'snow_dirty', wetT * 0.2);
      } else {
        // Default: generic mud/moss blend near water.
        accum(weights, 'mud', wetT * 0.35);
        accum(weights, 'moss', wetT * 0.2);
      }
    }

    // 5. Finalise: sort, cap at 4, renormalise.
    const layers = finaliseLayers(weights);
    const primary = layers.length > 0 ? layers[0].textureId : spec.primary;

    return { primary, layers };
  };

  return { resolve };
}
