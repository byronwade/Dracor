# AAA World Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Dracor world into a massive, visually dramatic AAA-quality map with continent-scale oceans, mountain ranges, volcanic regions, island chains, deserts, and procedurally placed cities/settlements.

**Architecture:** The world-gen package (`packages/world-gen/src/`) already generates an 8km×8km world with 22 biomes, rivers, lakes, and 20+ regions. We'll amplify terrain elevation for dramatic features, reshape continental distribution for island chains and fjords, expand draw distances by 2.5×, add procedural settlement placement, and add new POI types (city, village, fortress, port, mine).

**Tech Stack:** TypeScript, Babylon.js 9, custom GLSL terrain shader, procedural noise (fractal/ridge/warped)

---

### Task 1: Expand Height Range and Amplify Terrain Drama

**Files:**
- Modify: `packages/world-gen/src/config.ts`
- Modify: `packages/world-gen/src/elevation.ts`

The current height range is -50 to 200 with mountain amplitude of 120. We need deeper oceans, taller mountains, and more extreme features.

- [ ] **Step 1: Update config constants**

```typescript
// packages/world-gen/src/config.ts
export const WORLD_SIZE = 8192;
export const HALF_WORLD = WORLD_SIZE / 2;
export const CHUNK_SIZE = 64;
export const GRID_SIZE = WORLD_SIZE / CHUNK_SIZE;
export const CHUNK_RESOLUTION = 33;
export const SEA_LEVEL = 0;
export const MIN_HEIGHT = -120;
export const MAX_HEIGHT = 350;
export const DEFAULT_CACHE_SIZE = 256;
```

- [ ] **Step 2: Amplify elevation layers in createElevationMap**

In `packages/world-gen/src/elevation.ts`, update the `computeLand` function inside `createElevationMap`. Change these specific lines:

```typescript
// Line ~49: base amplitude 40 → 60
const base = baseNoise(worldX * 0.0006, worldZ * 0.0006) * 60;

// Line ~53: mountain amplitude 120 → 220
const mountains = mRaw * 220 * Math.pow(mMask, 2.5);

// Line ~55: hills amplitude 15 → 25
const hills = hillNoise(worldX * 0.003, worldZ * 0.003) * 25;

// Line ~56: bumps amplitude 5 → 8
const bumps = bumpNoise(worldX * 0.01, worldZ * 0.01) * 8;

// Line ~57: micro amplitude 1.5 → 2.5
const micro = microNoise(worldX * 0.04, worldZ * 0.04) * 2.5;

// Line ~60: plateau amplitude 25 → 50
const plateauEffect = Math.max(0, plateau) * 50;
```

Also update ocean depth calculation (line ~36-37):

```typescript
const computeOcean = (): number => {
  const oceanDepth = SEA_LEVEL + MIN_HEIGHT * (1 - cont / 0.05);
  const oceanDetail = microNoise(worldX * 0.005, worldZ * 0.005) * 8;
  return oceanDepth + oceanDetail;
};
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/world-gen/src/config.ts packages/world-gen/src/elevation.ts
git commit -m "feat(world-gen): amplify terrain elevation for dramatic mountains and deep oceans"
```

---

### Task 2: Reshape Continental Distribution for Islands and Fjords

**Files:**
- Modify: `packages/world-gen/src/continental.ts`

The current continental map is a single blob. We need island chains, fjords, and dramatic coastlines.

- [ ] **Step 1: Add island chain and fjord noise layers**

Replace the entire `createContinentalMap` function in `packages/world-gen/src/continental.ts`:

```typescript
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
```

- [ ] **Step 2: Build and verify**

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add packages/world-gen/src/continental.ts
git commit -m "feat(world-gen): add island chains, fjords, and dramatic coastlines"
```

---

### Task 3: Add Volcanic Calderas and Canyon Features to Elevation

**Files:**
- Modify: `packages/world-gen/src/elevation.ts`

Add two new terrain features that apply on top of the existing elevation: volcanic calderas and canyon/mesa formations.

- [ ] **Step 1: Add caldera and canyon noise generators**

After the existing noise declarations in `createElevationMap` (around line 29), add:

```typescript
const calderaNoise = createFractalNoise2D(hashCombine(elevSeed, 44444), 2, 2.0, 0.5);
const canyonNoise = createWarpedNoise2D(hashCombine(detailSeed, 55555), 3, 0.5);
```

- [ ] **Step 2: Apply caldera and canyon effects in computeLand**

Inside the `computeLand` function, after `let elevation = base + mountains + hills + bumps + micro + plateauEffect;` and before `elevation *= coastFactor;`, add:

```typescript
// Volcanic caldera: creates a ring-shaped depression in mountain regions
const calderaVal = calderaNoise(worldX * 0.00025, worldZ * 0.00025);
if (calderaVal > 0.7 && elevation > 80) {
  const calderaStrength = (calderaVal - 0.7) / 0.3;
  const calderaDepth = calderaStrength * 60;
  const calderaRim = Math.sin(calderaStrength * Math.PI) * 30;
  elevation = elevation - calderaDepth + calderaRim;
}

// Canyon carving: deep narrow cuts in mid-elevation terrain
const canyonVal = canyonNoise(worldX * 0.0008, worldZ * 0.0008);
if (canyonVal > 0.65 && elevation > 20 && elevation < 120) {
  const canyonStrength = (canyonVal - 0.65) / 0.35;
  elevation -= canyonStrength * 40;
}
```

- [ ] **Step 3: Build and verify**

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add packages/world-gen/src/elevation.ts
git commit -m "feat(world-gen): add volcanic calderas and canyon carving to terrain"
```

---

### Task 4: Expand Streaming Draw Distance

**Files:**
- Modify: `apps/game-client/src/streaming/StreamingManager.ts`

Increase the visible world area by 2.5× so the player can see dramatic distant terrain.

- [ ] **Step 1: Update STREAMING_CONFIGS**

Replace the four quality tier configs in `STREAMING_CONFIGS`:

```typescript
const STREAMING_CONFIGS: Record<string, StreamingConfig> = {
  ultra: {
    loadDistance: 800,
    unloadDistance: 1000,
    maxLoadedCells: 120,
    maxConcurrentLoads: 6,
    rebuildThreshold: 15,
    foliageDensityFalloff: [
      { distance: 60, density: 1.0 },
      { distance: 150, density: 0.5 },
      { distance: 300, density: 0.15 },
      { distance: 500, density: 0.03 },
      { distance: 800, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 16 },
      { distance: 250, subdivisions: 8 },
      { distance: 500, subdivisions: 4 },
      { distance: 800, subdivisions: 2 },
    ],
  },
  high: {
    loadDistance: 600,
    unloadDistance: 800,
    maxLoadedCells: 80,
    maxConcurrentLoads: 4,
    rebuildThreshold: 18,
    foliageDensityFalloff: [
      { distance: 50, density: 1.0 },
      { distance: 120, density: 0.4 },
      { distance: 250, density: 0.1 },
      { distance: 600, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 100, subdivisions: 12 },
      { distance: 200, subdivisions: 6 },
      { distance: 400, subdivisions: 3 },
      { distance: 600, subdivisions: 2 },
    ],
  },
  medium: {
    loadDistance: 400,
    unloadDistance: 550,
    maxLoadedCells: 50,
    maxConcurrentLoads: 3,
    rebuildThreshold: 20,
    foliageDensityFalloff: [
      { distance: 40, density: 1.0 },
      { distance: 100, density: 0.3 },
      { distance: 200, density: 0.05 },
      { distance: 400, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 80, subdivisions: 8 },
      { distance: 200, subdivisions: 4 },
      { distance: 400, subdivisions: 2 },
    ],
  },
  low: {
    loadDistance: 250,
    unloadDistance: 400,
    maxLoadedCells: 30,
    maxConcurrentLoads: 2,
    rebuildThreshold: 25,
    foliageDensityFalloff: [
      { distance: 30, density: 1.0 },
      { distance: 80, density: 0.2 },
      { distance: 150, density: 0.0 },
    ],
    terrainLODDistances: [
      { distance: 60, subdivisions: 6 },
      { distance: 150, subdivisions: 3 },
      { distance: 250, subdivisions: 2 },
    ],
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @dracor/game-client typecheck`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/streaming/StreamingManager.ts
git commit -m "feat(streaming): expand draw distance 2.5x for all quality tiers"
```

---

### Task 5: Expand Water System for Larger Lakes and More Rivers

**Files:**
- Modify: `packages/world-gen/src/water.ts`

More rivers and larger lakes to match the bigger, more dramatic terrain.

- [ ] **Step 1: Update water constants**

In `packages/world-gen/src/water.ts`, change the constants:

```typescript
/** How many rivers to simulate. */
const RIVER_COUNT = 55;

/** Maximum BFS cells flooded for a single lake depression. */
const MAX_LAKE_CELLS = 150;

/** Elevation delta above the pit floor within which cells are flooded as lake. */
const LAKE_FILL_DELTA = 6.0;
```

- [ ] **Step 2: Build and verify**

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add packages/world-gen/src/water.ts
git commit -m "feat(world-gen): double river count and expand lake sizes"
```

---

### Task 6: Add Settlement Placement to Region System

**Files:**
- Modify: `packages/world-gen/src/regions.ts`

Add new POI types for cities, villages, fortresses, ports, and mines. Cities go near coasts/rivers, villages in valleys, fortresses on mountains, ports on coastline, mines in mountain/volcanic regions.

- [ ] **Step 1: Expand PointOfInterest type**

Update the `PointOfInterest` interface:

```typescript
export interface PointOfInterest {
  id: string;
  name: string;
  type: 'town' | 'city' | 'village' | 'fortress' | 'port' | 'mine' | 'dungeon' | 'shrine' | 'ruin' | 'camp' | 'tower' | 'cave' | 'bridge' | 'crossroads';
  worldX: number;
  worldZ: number;
  regionId: string;
  dangerLevel: number;
}
```

- [ ] **Step 2: Add name lists for new POI types**

Add entries to `POI_NAME_PARTS`:

```typescript
city: {
  prefixes: ['Ironhold', 'Crownsgate', 'Highwall', 'Stormhaven', 'Dragonport', 'Kingsreach', 'Ashenmire', 'Sunspire', 'Blackmoor', 'Goleli'],
  suffixes: ['', '', 'City', 'Citadel', 'Capital', 'Metropolis', 'Hold', 'Dominion'],
},
village: {
  prefixes: ['Millbrook', 'Thornfield', 'Redhollow', 'Oakrest', 'Ashfen', 'Pebblebrook', 'Dustwick', 'Ferndale', 'Greyholm', 'Willowmere'],
  suffixes: ['', '', 'Village', 'Hamlet', 'Steading', 'Homestead', 'Dale', 'Glen'],
},
fortress: {
  prefixes: ['Fort', 'Castle', 'Bastion', 'Citadel', 'Stronghold of', 'The Keep of', 'Rampart of', 'The Hold of'],
  suffixes: ['Iron', 'Stone', 'the Warden', 'the North', 'the Mountain', 'the Last Watch', 'the Fallen', 'the Storm'],
},
port: {
  prefixes: ['Harborview', 'Saltwind', 'Tidegate', 'Anchorfall', 'Wavebreak', 'Driftwood', 'Seawall', 'Stormquay'],
  suffixes: ['', '', 'Port', 'Harbor', 'Dock', 'Landing', 'Quay', 'Anchorage'],
},
mine: {
  prefixes: ['The', 'Old', 'Deep', 'Lost', 'Iron', 'Gold', 'Silver', 'Dark'],
  suffixes: ['Mine', 'Quarry', 'Dig', 'Shaft', 'Excavation', 'Vein', 'Lode', 'Pit'],
},
```

- [ ] **Step 3: Update selectPoiTypesForRegion to include new settlement types**

Replace the `selectPoiTypesForRegion` function:

```typescript
function selectPoiTypesForRegion(
  region: RegionDefinition,
  rng: SeededRNG,
  count: number,
): PointOfInterest['type'][] {
  const all: PointOfInterest['type'][] = [
    'town', 'city', 'village', 'fortress', 'port', 'mine',
    'dungeon', 'shrine', 'ruin', 'camp', 'tower', 'cave', 'bridge', 'crossroads',
  ];

  const weighted: PointOfInterest['type'][] = [...all];
  const biome = region.dominantBiome;

  // Starter zones always get a city and village
  if (region.isStarterZone) {
    weighted.push('city', 'city', 'village', 'village', 'shrine', 'crossroads');
  }

  // Coastal/beach biomes get ports
  if (biome === 'beach' || biome === 'tropical_beach') {
    weighted.push('port', 'port', 'port', 'village', 'town');
  }

  // Forest biomes get camps, villages, shrines
  if (biome === 'forest' || biome === 'dense_forest' || biome === 'pine_forest') {
    weighted.push('village', 'village', 'camp', 'shrine', 'ruin', 'cave');
  }

  // Mountain biomes get fortresses, mines, towers
  if (biome === 'mountain' || biome === 'snowy_peaks' || biome === 'alpine_meadow') {
    weighted.push('fortress', 'fortress', 'mine', 'tower', 'cave', 'ruin');
  }

  // Desert/badlands get ruins and camps
  if (biome === 'desert' || biome === 'badlands') {
    weighted.push('ruin', 'ruin', 'ruin', 'cave', 'camp', 'mine');
  }

  // Swamp/wetlands get dungeons and camps
  if (biome === 'swamp' || biome === 'wetlands') {
    weighted.push('dungeon', 'ruin', 'camp', 'shrine', 'village');
  }

  // Volcanic regions get mines and dungeons
  if (biome === 'volcanic') {
    weighted.push('mine', 'mine', 'dungeon', 'dungeon', 'ruin', 'fortress');
  }

  // Plains and grassland get towns, villages, crossroads
  if (biome === 'plains' || biome === 'grassland') {
    weighted.push('city', 'town', 'village', 'village', 'crossroads', 'crossroads');
  }

  // River valleys get towns and bridges
  if (biome === 'river_valley') {
    weighted.push('town', 'town', 'village', 'bridge', 'bridge', 'port');
  }

  // Jungle gets ruins and shrines
  if (biome === 'jungle') {
    weighted.push('ruin', 'ruin', 'shrine', 'shrine', 'camp', 'cave');
  }

  // Savanna gets villages and camps
  if (biome === 'savanna') {
    weighted.push('village', 'village', 'camp', 'camp', 'crossroads');
  }

  const selected: PointOfInterest['type'][] = [];
  const available = [...weighted];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = rng.nextInt(0, available.length - 1);
    selected.push(available[idx]);
    if (available.length > count) available.splice(idx, 1);
  }

  return selected;
}
```

- [ ] **Step 4: Increase POI count per region**

In `createRegionSystem`, change the POI count range (around line 359):

```typescript
const poiCount = regionPoiRng.nextInt(5, 14);
```

- [ ] **Step 5: Increase region grid density**

Change the grid layout constants (around line 249-253):

```typescript
const GRID_COLS = 7;
const GRID_ROWS = 6;
```

This generates 42 base regions (up from 20), giving ~290-590 POIs across the world.

- [ ] **Step 6: Add refinement for new POI types**

Update `refinePlacement` and `refinePlacementZ` to handle new types. Add these cases inside `refinePlacement` before the final `return px;`:

```typescript
// Fortresses prefer high ground
if (type === 'fortress') {
  const step = rng.nextFloat(40, 100);
  const eRight = getElevation(px + step, pz);
  if (eRight > e) return px + step * 0.5;
}

// Villages and cities prefer flat low ground
if (type === 'village' || type === 'city' || type === 'port') {
  const step = rng.nextFloat(30, 80);
  const eLeft = getElevation(px - step, pz);
  if (eLeft < e) return px - step * 0.5;
}

// Mines prefer mountain/hill terrain
if (type === 'mine') {
  const step = rng.nextFloat(20, 60);
  const eUp = getElevation(px + step, pz);
  if (eUp > e && eUp > 40) return px + step * 0.4;
}
```

Add matching cases in `refinePlacementZ`:

```typescript
if (type === 'fortress') {
  const step = rng.nextFloat(40, 100);
  const eFwd = getElevation(px, pz + step);
  if (eFwd > e) return pz + step * 0.5;
}

if (type === 'village' || type === 'city' || type === 'port') {
  const step = rng.nextFloat(30, 80);
  const eBwd = getElevation(px, pz - step);
  if (eBwd < e) return pz - step * 0.5;
}
```

- [ ] **Step 7: Build and verify**

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build.

- [ ] **Step 8: Commit**

```bash
git add packages/world-gen/src/regions.ts
git commit -m "feat(world-gen): add cities, villages, fortresses, ports, mines with biome-aware placement"
```

---

### Task 7: Update Terrain Shader for Distance and Atmosphere

**Files:**
- Modify: `apps/game-client/src/materials/terrainMaterial.ts`

Update the terrain shader fog distance to match the new draw distances, and add subtle atmospheric haze color variation.

- [ ] **Step 1: Update fog distances in the fragment shader**

In the FRAGMENT shader string inside `terrainMaterial.ts`, update the fog section:

```glsl
// Subtle distance fog
float dist = length(vWorldPos);
float fog = smoothstep(400.0, 900.0, dist);
vec3 fogColor = vec3(0.14, 0.16, 0.22);
lit = mix(lit, fogColor, fog);

// Atmospheric blue shift at extreme distance
float haze = smoothstep(600.0, 900.0, dist);
lit = mix(lit, vec3(0.18, 0.22, 0.32), haze * 0.3);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @dracor/game-client typecheck`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/materials/terrainMaterial.ts
git commit -m "feat(terrain): extend fog and add atmospheric haze for increased draw distance"
```

---

### Task 8: Export New Types from world-gen Index

**Files:**
- Modify: `packages/world-gen/src/index.ts`

Ensure all new POI types are exported so the game client can use them.

- [ ] **Step 1: Verify index exports**

Read `packages/world-gen/src/index.ts` and confirm it re-exports from `regions.ts`. The `PointOfInterest` type with new types will be automatically exported since the interface is already in `regions.ts` and the index already does `export * from './regions'`.

Run: `pnpm --filter @dracor/world-gen build`
Expected: Clean build.

- [ ] **Step 2: Full typecheck**

Run: `pnpm --filter @dracor/game-client typecheck && pnpm --filter @dracor/game-server typecheck`
Expected: Both clean. If the game-server references old POI types, update accordingly.

- [ ] **Step 3: Commit**

```bash
git add packages/world-gen/src/index.ts
git commit -m "chore(world-gen): verify exports for expanded POI types"
```

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Height range | -50 to 200 | -120 to 350 |
| Mountain amplitude | 120 | 220 |
| Ocean depth | -50 max | -120 max |
| Continental shape | Single blob | Continent + islands + fjords |
| Draw distance (ultra) | 300 | 800 |
| Max loaded chunks (ultra) | 60 | 120 |
| Regions | 20 (5×4 grid) | 42+ (7×6 grid) |
| POIs per region | 3-8 | 5-14 |
| Total POIs | ~60-160 | ~210-590 |
| POI types | 9 | 14 (+ city, village, fortress, port, mine) |
| Rivers | 28 | 55 |
| Max lake cells | 60 | 150 |
| Terrain features | Basic hills/mountains | + volcanic calderas, canyons |
| Fog distance | 150-350 | 400-900 |
