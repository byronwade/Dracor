import { type BiomeType, type BiomeInfo } from './biomes';
import { type WorldSeed, hashCombine } from './seed';
import { CHUNK_SIZE, HALF_WORLD } from './config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FoliageCategory = 'tree' | 'bush' | 'grass' | 'rock' | 'flower' | 'mushroom' | 'log' | 'fern';

export interface FoliageRule {
  id: string;
  category: FoliageCategory;
  allowedBiomes: BiomeType[];
  density: number;
  minElevation: number;
  maxElevation: number;
  maxSlope: number;           // degrees
  minMoisture: number;
  maxMoisture: number;
  minTemperature: number;
  maxTemperature: number;
  minScale: number;
  maxScale: number;
  clusterRadius: number;      // 0 = no clustering
  clusterChance: number;      // probability of spawning near a cluster center
  minSpacing: number;
  waterDistanceMin: number;
  waterDistancePreferred: number;
}

export interface FoliagePlacement {
  ruleId: string;
  worldX: number;
  worldZ: number;
  scale: number;
  rotationY: number;
}

export interface FoliageSystem {
  getRulesForBiome: (biome: BiomeType) => FoliageRule[];
  generateChunkFoliage: (
    chunkGridX: number,
    chunkGridZ: number,
    getBiome: (wx: number, wz: number) => BiomeInfo,
    getElevation: (wx: number, wz: number) => number,
    getWaterDistance: (wx: number, wz: number) => number
  ) => FoliagePlacement[];
}

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const FOLIAGE_RULES: FoliageRule[] = [
  // ---- Trees ---------------------------------------------------------------
  {
    id: 'pine_tree',
    category: 'tree',
    allowedBiomes: ['pine_forest', 'forest', 'tundra'],
    density: 18,
    minElevation: 20,
    maxElevation: 130,
    maxSlope: 30,
    minMoisture: 0.3,
    maxMoisture: 1.0,
    minTemperature: 0.0,
    maxTemperature: 0.6,
    minScale: 0.8,
    maxScale: 1.5,
    clusterRadius: 12,
    clusterChance: 0.65,
    minSpacing: 4,
    waterDistanceMin: 2,
    waterDistancePreferred: 8,
  },
  {
    id: 'oak_tree',
    category: 'tree',
    allowedBiomes: ['forest', 'dense_forest', 'grassland'],
    density: 20,
    minElevation: 5,
    maxElevation: 90,
    maxSlope: 25,
    minMoisture: 0.35,
    maxMoisture: 0.85,
    minTemperature: 0.35,
    maxTemperature: 0.8,
    minScale: 0.9,
    maxScale: 1.6,
    clusterRadius: 10,
    clusterChance: 0.55,
    minSpacing: 5,
    waterDistanceMin: 3,
    waterDistancePreferred: 10,
  },
  {
    id: 'birch_tree',
    category: 'tree',
    allowedBiomes: ['forest', 'alpine_meadow'],
    density: 14,
    minElevation: 10,
    maxElevation: 100,
    maxSlope: 25,
    minMoisture: 0.3,
    maxMoisture: 0.75,
    minTemperature: 0.25,
    maxTemperature: 0.65,
    minScale: 0.8,
    maxScale: 1.3,
    clusterRadius: 8,
    clusterChance: 0.5,
    minSpacing: 4,
    waterDistanceMin: 2,
    waterDistancePreferred: 7,
  },
  {
    id: 'palm_tree',
    category: 'tree',
    allowedBiomes: ['tropical_beach', 'jungle'],
    density: 10,
    minElevation: 0,
    maxElevation: 30,
    maxSlope: 20,
    minMoisture: 0.4,
    maxMoisture: 1.0,
    minTemperature: 0.7,
    maxTemperature: 1.0,
    minScale: 0.9,
    maxScale: 1.4,
    clusterRadius: 6,
    clusterChance: 0.4,
    minSpacing: 5,
    waterDistanceMin: 0,
    waterDistancePreferred: 3,
  },
  {
    id: 'dead_tree',
    category: 'tree',
    allowedBiomes: ['swamp', 'badlands', 'volcanic'],
    density: 5,
    minElevation: 0,
    maxElevation: 150,
    maxSlope: 35,
    minMoisture: 0.0,
    maxMoisture: 1.0,
    minTemperature: 0.0,
    maxTemperature: 1.0,
    minScale: 0.7,
    maxScale: 1.2,
    clusterRadius: 0,
    clusterChance: 0.0,
    minSpacing: 8,
    waterDistanceMin: 0,
    waterDistancePreferred: 5,
  },
  {
    id: 'jungle_tree',
    category: 'tree',
    allowedBiomes: ['jungle'],
    density: 28,
    minElevation: 0,
    maxElevation: 60,
    maxSlope: 20,
    minMoisture: 0.65,
    maxMoisture: 1.0,
    minTemperature: 0.7,
    maxTemperature: 1.0,
    minScale: 1.1,
    maxScale: 2.0,
    clusterRadius: 14,
    clusterChance: 0.75,
    minSpacing: 3,
    waterDistanceMin: 1,
    waterDistancePreferred: 6,
  },
  {
    id: 'willow_tree',
    category: 'tree',
    allowedBiomes: ['wetlands', 'swamp', 'river_valley'],
    density: 10,
    minElevation: 0,
    maxElevation: 25,
    maxSlope: 15,
    minMoisture: 0.6,
    maxMoisture: 1.0,
    minTemperature: 0.2,
    maxTemperature: 0.8,
    minScale: 0.9,
    maxScale: 1.5,
    clusterRadius: 8,
    clusterChance: 0.5,
    minSpacing: 5,
    waterDistanceMin: 0,
    waterDistancePreferred: 2,
  },

  // ---- Bushes --------------------------------------------------------------
  {
    id: 'berry_bush',
    category: 'bush',
    allowedBiomes: ['forest', 'grassland', 'plains'],
    density: 22,
    minElevation: 3,
    maxElevation: 80,
    maxSlope: 25,
    minMoisture: 0.3,
    maxMoisture: 0.8,
    minTemperature: 0.3,
    maxTemperature: 0.75,
    minScale: 0.5,
    maxScale: 1.0,
    clusterRadius: 5,
    clusterChance: 0.45,
    minSpacing: 2,
    waterDistanceMin: 1,
    waterDistancePreferred: 4,
  },
  {
    id: 'dry_bush',
    category: 'bush',
    allowedBiomes: ['desert', 'badlands', 'savanna'],
    density: 12,
    minElevation: 0,
    maxElevation: 100,
    maxSlope: 30,
    minMoisture: 0.0,
    maxMoisture: 0.45,
    minTemperature: 0.55,
    maxTemperature: 1.0,
    minScale: 0.4,
    maxScale: 0.9,
    clusterRadius: 4,
    clusterChance: 0.3,
    minSpacing: 3,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'snow_bush',
    category: 'bush',
    allowedBiomes: ['tundra', 'snowy_peaks'],
    density: 8,
    minElevation: 50,
    maxElevation: 200,
    maxSlope: 25,
    minMoisture: 0.1,
    maxMoisture: 0.7,
    minTemperature: 0.0,
    maxTemperature: 0.35,
    minScale: 0.3,
    maxScale: 0.7,
    clusterRadius: 3,
    clusterChance: 0.35,
    minSpacing: 2,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },

  // ---- Grass ---------------------------------------------------------------
  {
    id: 'tall_grass',
    category: 'grass',
    allowedBiomes: ['grassland', 'plains', 'savanna', 'forest', 'river_valley'],
    density: 60,
    minElevation: 0,
    maxElevation: 80,
    maxSlope: 30,
    minMoisture: 0.2,
    maxMoisture: 0.9,
    minTemperature: 0.25,
    maxTemperature: 0.9,
    minScale: 0.7,
    maxScale: 1.2,
    clusterRadius: 6,
    clusterChance: 0.6,
    minSpacing: 0.5,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'short_grass',
    category: 'grass',
    allowedBiomes: ['plains', 'grassland', 'alpine_meadow'],
    density: 80,
    minElevation: 0,
    maxElevation: 110,
    maxSlope: 35,
    minMoisture: 0.2,
    maxMoisture: 0.8,
    minTemperature: 0.15,
    maxTemperature: 0.85,
    minScale: 0.4,
    maxScale: 0.9,
    clusterRadius: 8,
    clusterChance: 0.65,
    minSpacing: 0.3,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'swamp_grass',
    category: 'grass',
    allowedBiomes: ['swamp', 'wetlands'],
    density: 50,
    minElevation: 0,
    maxElevation: 20,
    maxSlope: 15,
    minMoisture: 0.6,
    maxMoisture: 1.0,
    minTemperature: 0.15,
    maxTemperature: 0.85,
    minScale: 0.5,
    maxScale: 1.1,
    clusterRadius: 5,
    clusterChance: 0.6,
    minSpacing: 0.4,
    waterDistanceMin: 0,
    waterDistancePreferred: 1,
  },
  {
    id: 'desert_grass',
    category: 'grass',
    allowedBiomes: ['desert', 'badlands'],
    density: 15,
    minElevation: 0,
    maxElevation: 100,
    maxSlope: 30,
    minMoisture: 0.0,
    maxMoisture: 0.3,
    minTemperature: 0.6,
    maxTemperature: 1.0,
    minScale: 0.3,
    maxScale: 0.7,
    clusterRadius: 3,
    clusterChance: 0.35,
    minSpacing: 1.5,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },

  // ---- Rocks ---------------------------------------------------------------
  {
    id: 'boulder',
    category: 'rock',
    allowedBiomes: ['mountain', 'cliff', 'badlands', 'volcanic'],
    density: 8,
    minElevation: 30,
    maxElevation: 200,
    maxSlope: 50,
    minMoisture: 0.0,
    maxMoisture: 1.0,
    minTemperature: 0.0,
    maxTemperature: 1.0,
    minScale: 0.7,
    maxScale: 2.0,
    clusterRadius: 0,
    clusterChance: 0.0,
    minSpacing: 5,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'small_rock',
    category: 'rock',
    allowedBiomes: [
      'grassland', 'plains', 'forest', 'dense_forest', 'pine_forest', 'jungle',
      'swamp', 'desert', 'badlands', 'savanna', 'tundra', 'snowy_peaks',
      'mountain', 'alpine_meadow', 'volcanic', 'wetlands', 'cliff',
      'river_valley',
    ],
    density: 10,
    minElevation: 0,
    maxElevation: 200,
    maxSlope: 45,
    minMoisture: 0.0,
    maxMoisture: 1.0,
    minTemperature: 0.0,
    maxTemperature: 1.0,
    minScale: 0.3,
    maxScale: 0.8,
    clusterRadius: 0,
    clusterChance: 0.0,
    minSpacing: 2,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },

  // ---- Flowers -------------------------------------------------------------
  {
    id: 'wildflower',
    category: 'flower',
    allowedBiomes: ['grassland', 'plains', 'alpine_meadow', 'forest'],
    density: 30,
    minElevation: 3,
    maxElevation: 110,
    maxSlope: 25,
    minMoisture: 0.3,
    maxMoisture: 0.8,
    minTemperature: 0.3,
    maxTemperature: 0.8,
    minScale: 0.5,
    maxScale: 1.0,
    clusterRadius: 4,
    clusterChance: 0.55,
    minSpacing: 0.8,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'desert_flower',
    category: 'flower',
    allowedBiomes: ['desert', 'badlands'],
    density: 4,
    minElevation: 0,
    maxElevation: 80,
    maxSlope: 20,
    minMoisture: 0.0,
    maxMoisture: 0.25,
    minTemperature: 0.7,
    maxTemperature: 1.0,
    minScale: 0.4,
    maxScale: 0.8,
    clusterRadius: 2,
    clusterChance: 0.3,
    minSpacing: 3,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'jungle_flower',
    category: 'flower',
    allowedBiomes: ['jungle'],
    density: 35,
    minElevation: 0,
    maxElevation: 60,
    maxSlope: 20,
    minMoisture: 0.65,
    maxMoisture: 1.0,
    minTemperature: 0.7,
    maxTemperature: 1.0,
    minScale: 0.4,
    maxScale: 0.9,
    clusterRadius: 5,
    clusterChance: 0.6,
    minSpacing: 0.5,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },

  // ---- Other ---------------------------------------------------------------
  {
    id: 'mushroom',
    category: 'mushroom',
    allowedBiomes: ['dense_forest', 'jungle', 'swamp'],
    density: 16,
    minElevation: 0,
    maxElevation: 60,
    maxSlope: 20,
    minMoisture: 0.55,
    maxMoisture: 1.0,
    minTemperature: 0.2,
    maxTemperature: 0.9,
    minScale: 0.3,
    maxScale: 0.8,
    clusterRadius: 3,
    clusterChance: 0.6,
    minSpacing: 1,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'fern',
    category: 'fern',
    allowedBiomes: ['forest', 'dense_forest', 'jungle'],
    density: 40,
    minElevation: 0,
    maxElevation: 80,
    maxSlope: 25,
    minMoisture: 0.4,
    maxMoisture: 1.0,
    minTemperature: 0.25,
    maxTemperature: 0.9,
    minScale: 0.5,
    maxScale: 1.1,
    clusterRadius: 4,
    clusterChance: 0.5,
    minSpacing: 0.6,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'cactus',
    category: 'bush',
    allowedBiomes: ['desert', 'badlands'],
    density: 8,
    minElevation: 0,
    maxElevation: 80,
    maxSlope: 20,
    minMoisture: 0.0,
    maxMoisture: 0.2,
    minTemperature: 0.65,
    maxTemperature: 1.0,
    minScale: 0.6,
    maxScale: 1.3,
    clusterRadius: 0,
    clusterChance: 0.0,
    minSpacing: 5,
    waterDistanceMin: 0,
    waterDistancePreferred: 0,
  },
  {
    id: 'fallen_log',
    category: 'log',
    allowedBiomes: ['forest', 'dense_forest', 'pine_forest'],
    density: 5,
    minElevation: 5,
    maxElevation: 90,
    maxSlope: 20,
    minMoisture: 0.3,
    maxMoisture: 0.9,
    minTemperature: 0.2,
    maxTemperature: 0.75,
    minScale: 0.8,
    maxScale: 1.4,
    clusterRadius: 0,
    clusterChance: 0.0,
    minSpacing: 6,
    waterDistanceMin: 1,
    waterDistancePreferred: 4,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a slope (rise/run) to degrees. Mirrors biomes.ts logic. */
function slopeDegrees(
  wx: number,
  wz: number,
  getElevation: (wx: number, wz: number) => number
): number {
  const step = 2.0;
  const h0 = getElevation(wx, wz);
  const hR = getElevation(wx + step, wz);
  const hF = getElevation(wx, wz + step);
  const slopeX = (hR - h0) / step;
  const slopeZ = (hF - h0) / step;
  const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
  return Math.atan(slope) * (180 / Math.PI);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFoliageSystem(worldSeed: WorldSeed): FoliageSystem {
  // One foliage-layer RNG, forked per chunk and then per rule for independence.
  const foliageLayerSeed = worldSeed.getLayerSeed('foliage');

  function getRulesForBiome(biome: BiomeType): FoliageRule[] {
    return FOLIAGE_RULES.filter(r => r.allowedBiomes.includes(biome));
  }

  function generateChunkFoliage(
    chunkGridX: number,
    chunkGridZ: number,
    getBiome: (wx: number, wz: number) => BiomeInfo,
    getElevation: (wx: number, wz: number) => number,
    getWaterDistance: (wx: number, wz: number) => number
  ): FoliagePlacement[] {
    // World-space origin of this chunk's south-west corner.
    const originX = chunkGridX * CHUNK_SIZE - HALF_WORLD;
    const originZ = chunkGridZ * CHUNK_SIZE - HALF_WORLD;

    // Per-chunk RNG (seeded by chunk coordinates so result is deterministic).
    const chunkSeedVal = hashCombine(
      foliageLayerSeed,
      hashCombine(chunkGridX * 73856093, chunkGridZ * 19349663)
    );

    // Quick pre-filter: sample biome at chunk corners + center to collect the
    // set of biome types present in this chunk. Only rules that match at least
    // one of those biomes are considered.
    const samplePoints: Array<[number, number]> = [
      [originX + CHUNK_SIZE * 0.5, originZ + CHUNK_SIZE * 0.5],  // center
      [originX + CHUNK_SIZE * 0.1, originZ + CHUNK_SIZE * 0.1],  // corners
      [originX + CHUNK_SIZE * 0.9, originZ + CHUNK_SIZE * 0.1],
      [originX + CHUNK_SIZE * 0.1, originZ + CHUNK_SIZE * 0.9],
      [originX + CHUNK_SIZE * 0.9, originZ + CHUNK_SIZE * 0.9],
    ];

    const presentBiomes = new Set<BiomeType>();
    for (const [sx, sz] of samplePoints) {
      presentBiomes.add(getBiome(sx, sz).type);
    }

    const candidateRules = FOLIAGE_RULES.filter(r =>
      r.allowedBiomes.some(b => presentBiomes.has(b))
    );

    if (candidateRules.length === 0) return [];

    const placements: FoliagePlacement[] = [];

    for (let ruleIdx = 0; ruleIdx < candidateRules.length; ruleIdx++) {
      const rule = candidateRules[ruleIdx];

      // Fork a deterministic RNG per rule so adding/removing rules doesn't
      // shift the placement of unrelated rules.
      const ruleRng = { state: hashCombine(chunkSeedVal, ruleIdx * 104729 + 7919) };

      // Simple splitmix32 closure so we avoid class overhead in a hot loop.
      const nextFloat = (min: number, max: number): number => {
        ruleRng.state = splitmix32(ruleRng.state);
        const t = (ruleRng.state >>> 0) / 0x100000000;
        return min + t * (max - min);
      };
      const nextRaw = (): number => {
        ruleRng.state = splitmix32(ruleRng.state);
        return (ruleRng.state >>> 0) / 0x100000000;
      };

      // Pre-generate cluster centers (at most 8 per rule per chunk).
      const clusterCount = rule.clusterRadius > 0 ? 8 : 0;
      const clusterCenters: Array<[number, number]> = [];
      for (let c = 0; c < clusterCount; c++) {
        clusterCenters.push([
          originX + nextFloat(0, CHUNK_SIZE),
          originZ + nextFloat(0, CHUNK_SIZE),
        ]);
      }

      // Placed instances for this rule — used for minSpacing check.
      const placedPositions: Array<[number, number]> = [];
      const minSpacingSq = rule.minSpacing * rule.minSpacing;

      // Attempt `density` placements.
      const attempts = Math.ceil(rule.density);
      for (let a = 0; a < attempts; a++) {
        // Generate candidate world position.
        let candX: number;
        let candZ: number;

        if (rule.clusterRadius > 0 && clusterCenters.length > 0 && nextRaw() < rule.clusterChance) {
          // Pick a random cluster center and place near it.
          const cIdx = Math.floor(nextRaw() * clusterCenters.length);
          const [cx, cz] = clusterCenters[cIdx];
          const angle = nextFloat(0, Math.PI * 2);
          const radius = nextFloat(0, rule.clusterRadius);
          candX = cx + Math.cos(angle) * radius;
          candZ = cz + Math.sin(angle) * radius;
        } else {
          // Uniform random within chunk.
          candX = originX + nextFloat(0, CHUNK_SIZE);
          candZ = originZ + nextFloat(0, CHUNK_SIZE);
        }

        // Clamp to chunk bounds (cluster offsets may overshoot).
        candX = Math.max(originX, Math.min(originX + CHUNK_SIZE, candX));
        candZ = Math.max(originZ, Math.min(originZ + CHUNK_SIZE, candZ));

        // --- Per-candidate biome check ---
        const biomeInfo = getBiome(candX, candZ);
        if (!rule.allowedBiomes.includes(biomeInfo.type)) continue;

        // --- Elevation check ---
        const elev = getElevation(candX, candZ);
        if (elev < rule.minElevation || elev > rule.maxElevation) continue;

        // --- Slope check ---
        const slope = slopeDegrees(candX, candZ, getElevation);
        if (slope > rule.maxSlope) continue;

        // --- Climate checks ---
        const { moisture, temperature } = biomeInfo;
        if (moisture < rule.minMoisture || moisture > rule.maxMoisture) continue;
        if (temperature < rule.minTemperature || temperature > rule.maxTemperature) continue;

        // --- Water distance check (hard minimum) ---
        const waterDist = getWaterDistance(candX, candZ);
        if (waterDist < rule.waterDistanceMin) continue;

        // --- Soft water distance bias ---
        // If preferred distance > 0 and we're closer than preferred, reject
        // with a probability that increases as we approach waterDistanceMin.
        if (rule.waterDistancePreferred > rule.waterDistanceMin && waterDist < rule.waterDistancePreferred) {
          const fraction = clamp01(
            (waterDist - rule.waterDistanceMin) /
            (rule.waterDistancePreferred - rule.waterDistanceMin)
          );
          // Accept with probability equal to the fraction (1 = at preferred, 0 = at min).
          if (nextRaw() > fraction) continue;
        }

        // --- Min spacing check against same-rule placed instances ---
        let tooClose = false;
        for (const [px, pz] of placedPositions) {
          const dx = candX - px;
          const dz = candZ - pz;
          if (dx * dx + dz * dz < minSpacingSq) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        // --- Accepted ---
        const scale = nextFloat(rule.minScale, rule.maxScale);
        const rotationY = nextFloat(0, Math.PI * 2);

        placements.push({ ruleId: rule.id, worldX: candX, worldZ: candZ, scale, rotationY });
        placedPositions.push([candX, candZ]);
      }
    }

    return placements;
  }

  return { getRulesForBiome, generateChunkFoliage };
}

// ---------------------------------------------------------------------------
// Inline splitmix32 (mirrors seed.ts, kept local to avoid coupling to class state)
// ---------------------------------------------------------------------------

function splitmix32(state: number): number {
  state = (state + 0x9e3779b9) | 0;
  let z = state;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return z ^ (z >>> 16);
}
