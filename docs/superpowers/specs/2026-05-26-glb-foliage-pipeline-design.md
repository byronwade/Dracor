# GLB Foliage Pipeline: Realistic Trees with Biome-Aware Placement

## Summary

Replace the procedural cylinder/cone tree geometry with a GLB model loading pipeline. Trees loaded from `.glb` files get thin-instanced across the zone using a biome-aware placement engine that respects terrain slope, exclusion zones (roads, water, landmarks, spawns), and per-species density rules. A wind vertex shader animates all foliage at runtime.

## Goals

- Drop `.glb` tree models into `apps/game-client/public/models/foliage/` and have them appear in-game automatically
- Smart placement that avoids roads, water, landmarks, and spawn points
- No trees on cliff faces (slope filtering)
- Wind animation via vertex shader (trunk still, canopy sways)
- Graceful fallback to procedural geometry when GLB files don't exist yet
- Maintain thin-instance performance (hundreds of trees, minimal draw calls)

## Non-Goals

- Admin panel UI (future work, after pipeline stabilizes)
- LOD mesh switching at runtime (infrastructure prepared, not wired)
- Rain wetness shader (future weather system)
- Texture streaming / KTX2 compression (future optimization)

## Asset Directory Structure

```
apps/game-client/public/models/
└── foliage/
    ├── pine_tree_01.glb
    ├── dead_tree_01.glb
    ├── broadleaf_tree_01.glb
    ├── bush_01.glb
    └── grass_tall_patch.glb
```

Vite serves `public/` as static root. The loader fetches `/models/foliage/<name>.glb` at runtime.

### GLB Requirements for Models

Models downloaded from asset stores should meet these specs:
- **Materials:** Principled BSDF / metallic-roughness PBR (maps to glTF standard)
- **Textures:** Baked into the GLB (pack textures on export)
- **Poly count:** 2k-5k triangles per tree for instancing performance
- **Origin:** Model origin at the base of the trunk (Y=0 at ground level)
- **Scale:** Approximately 1 unit = 1 meter. A pine tree ~8-12 units tall.
- **Up axis:** Y-up (glTF standard)

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `apps/game-client/src/world/modelLoader.ts` | Load GLB models, cache by ID, extract mesh + materials |
| `apps/game-client/src/world/placementEngine.ts` | Biome-aware position generation with exclusion zones + slope |
| `apps/game-client/src/world/windShader.ts` | Wind vertex displacement shader creation + per-frame update |

### Modified Files

| File | Change |
|------|--------|
| `apps/game-client/src/world/createFoliageFromManifest.ts` | Rewrite: use modelLoader + placementEngine instead of procedural geometry |
| `apps/game-client/src/world/loadZoneFromManifest.ts` | Pass exclusion zone data to foliage builder |
| `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts` | Update FoliageGroup type to include modelId, add placement config |
| `packages/world-data/src/types/FoliageDefinition.ts` | Add modelId, slope constraints, exclusion radii to FoliageGroup |
| `packages/world-data/src/types/BiomeDefinition.ts` | Add foliagePlacement array with per-species rules |
| `packages/world-data/src/biomes/ironvaleBiomes.ts` | Update biome data with placement rules |
| `packages/world-data/src/zones/ironvaleOutskirts.ts` | Update foliage groups with modelId references |

## Detailed Design

### 1. Model Loader (`modelLoader.ts`)

Responsibilities:
- Load `.glb` files using Babylon.js `LoadAssetContainerAsync`
- Cache loaded meshes by model ID (prevents re-loading same model)
- Extract the root mesh from the container for thin-instancing
- Preserve PBR materials from the GLB
- Return null if the file doesn't exist (triggers fallback)

```typescript
// Public API
export async function loadModel(modelId: string, scene: Scene): Promise<Mesh | null>
export function getModelBasePath(): string  // returns "/models/foliage/"
```

The loader registers Babylon.js built-in loaders on first call. It merges multi-mesh GLBs into a single mesh suitable for thin instancing (same pattern as the current `createMergedPine`).

### 2. Placement Engine (`placementEngine.ts`)

Responsibilities:
- Generate candidate positions across the zone bounds using jittered grid sampling
- Filter by terrain slope (reject positions where slope > maxSlope)
- Filter by exclusion zones (reject positions too close to roads, water, landmarks, spawns)
- Apply per-species density and scale randomization
- Output a Float32Array of transformation matrices for thin instancing

```typescript
export interface PlacementConfig {
  species: string;
  modelId: string;
  count: number;
  density: number;
  minScale: number;
  maxScale: number;
  maxSlope: number;           // degrees, e.g. 30
  alignToSlope: boolean;      // tilt tree to match ground normal
  exclusionRadii: {
    road: number;             // meters clearance from road centerline
    water: number;
    landmark: number;
    spawn: number;
  };
  area: { centerX: number; centerZ: number; radius: number };
}

export interface ExclusionData {
  roadPoints: Array<{ x: number; z: number; width: number }>;
  waterBodies: Array<{ x: number; z: number; width: number; depth: number }>;
  landmarks: Array<{ x: number; z: number; radius: number }>;
  spawns: Array<{ x: number; z: number; radius: number }>;
}

export function generatePlacements(
  config: PlacementConfig,
  exclusions: ExclusionData,
  getHeightAt: (x: number, z: number) => number,
  qualityDensity: number  // 0.2-1.0 from quality preset
): Float32Array
```

**Slope calculation:** Sample height at (x, z), (x+1, z), and (x, z+1). Compute the cross product of the two edge vectors to get the surface normal. The slope angle is `acos(normal.y)` in degrees.

**Exclusion zone check:** For roads, compute distance from candidate to nearest road segment (point-to-line-segment distance using road `points` array). For water/landmarks/spawns, simple point-to-point distance check against the exclusion radius.

**Jittered grid:** Instead of pure random placement (clumpy) or perfect grid (artificial), divide the area into cells of size `1/sqrt(density)` and place one tree per cell with random offset within the cell. This produces natural-looking even distribution.

### 3. Wind Shader (`windShader.ts`)

A vertex shader that displaces vertices based on their height in model space:

```glsl
// Vertex displacement (conceptual)
float height = position.y;  // 0 at trunk base, ~10 at canopy top
float sway = sin(windTime * windSpeed + worldPos.x * 0.05 + worldPos.z * 0.07);
float displacement = height * height * windStrength * 0.002;  // quadratic falloff
position.x += sway * displacement * windDirection.x;
position.z += sway * displacement * windDirection.z;
```

Key properties:
- **Quadratic height falloff:** `height * height` means the trunk barely moves, mid-branches sway gently, and canopy tips sway the most
- **World-position phase offset:** `worldPos.x * 0.05` means each tree sways at a slightly different phase (no synchronized waving)
- **Global uniforms:** `windTime` (incremented each frame), `windStrength` (0-1), `windDirection` (vec2), `windSpeed` (frequency)

Implementation approach: Create a Babylon.js `ShaderMaterial` that includes the wind vertex displacement but passes through the PBR fragment shader from the GLB. Alternatively, use `NodeMaterial` to compose wind displacement with existing PBR nodes.

```typescript
// Public API
export function createWindMaterial(
  scene: Scene,
  baseMaterial: Material  // the PBR material from the GLB
): ShaderMaterial

export function updateWind(scene: Scene, deltaTime: number): void  // called each frame
```

### 4. Updated Foliage Builder (`createFoliageFromManifest.ts`)

The rewritten function becomes async (model loading is async) and orchestrates all three systems:

```typescript
export async function createFoliageFromManifest(
  foliageGroups: FoliageGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number,
  exclusions: ExclusionData
): Promise<FoliageResult>
```

Flow:
1. For each foliage group, attempt to load the GLB model via `loadModel(group.modelId)`
2. If model loads: apply wind shader material, generate placements, set thin instances
3. If model fails to load: fall back to current procedural geometry (createMergedPine, etc.)
4. Return handles needed for wind animation updates

### 5. Updated Zone Loader (`loadZoneFromManifest.ts`)

Builds `ExclusionData` from the zone manifest's roads, water, landmarks, and spawns, then passes it to the foliage builder. The foliage call becomes `await` (async model loading).

### 6. Updated Type Definitions

**FoliageGroup** (in `packages/world-data/src/types/FoliageDefinition.ts`):
```typescript
export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'tree_broadleaf' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  modelId: string;              // NEW: maps to GLB filename without extension
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
  maxSlope: number;             // NEW: max terrain slope in degrees
  alignToSlope: boolean;        // NEW: tilt to match ground normal
  exclusionRadii: {             // NEW: clearance from features
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
}
```

**BiomeDefinition** — add `tree_broadleaf` to the foliageTypes for `dark_pine_frontier`.

### 7. Zone Manifest Update

Update `ironvaleOutskirts.ts` foliage groups to include new fields:

```typescript
{
  id: 'foliage_pine_main',
  type: 'tree_pine',
  modelId: 'pine_tree_01',        // loads /models/foliage/pine_tree_01.glb
  count: 200,
  area: { centerX: 0, centerZ: 0, radius: 220 },
  minScale: 0.8,
  maxScale: 1.4,
  density: 0.6,
  lodDistance: 120,
  castShadow: true,
  maxSlope: 30,
  alignToSlope: true,
  exclusionRadii: { road: 8, water: 6, landmark: 12, spawn: 10 },
}
```

Add a new broadleaf group:
```typescript
{
  id: 'foliage_broadleaf',
  type: 'tree_broadleaf',
  modelId: 'broadleaf_tree_01',
  count: 60,
  area: { centerX: 50, centerZ: -40, radius: 180 },
  minScale: 0.9,
  maxScale: 1.6,
  density: 0.25,
  lodDistance: 100,
  castShadow: true,
  maxSlope: 25,
  alignToSlope: true,
  exclusionRadii: { road: 10, water: 8, landmark: 15, spawn: 10 },
}
```

## Performance Considerations

- **Thin instances:** All trees of the same species share one GPU draw call regardless of count
- **Quality presets:** `foliageDensity` multiplier (0.2-1.0) scales instance count per quality tier
- **GLB size:** Target 2k-5k triangles per tree model with packed textures under 2MB per GLB
- **Wind shader:** Runs in the vertex shader, zero CPU cost per instance. Only the `windTime` uniform is updated per frame.
- **Model caching:** Each GLB loaded once, cached in memory. Multiple foliage groups sharing the same `modelId` reuse the cached mesh.

## Fallback Behavior

When a GLB file is missing (404):
1. `loadModel()` catches the error and returns `null`
2. `createFoliageFromManifest` detects null and creates the old procedural mesh (pine cones, dead tree cylinders, etc.)
3. A console warning is logged: `"[Foliage] Model pine_tree_01.glb not found, using procedural fallback"`
4. Once you drop the GLB file in, the next page refresh picks it up automatically

This means the game works identically to today until you start adding GLB files.

## Testing Plan

1. Verify procedural fallback works (no GLB files present = current behavior)
2. Add a test GLB (any small model) and verify it loads and instances correctly
3. Verify exclusion zones: no trees on roads, near water, near landmarks
4. Verify slope filtering: no trees on steep terrain
5. Verify wind shader: canopy sways, trunk stays still
6. Verify quality presets: fewer trees on lower quality
7. Performance: check draw call count and FPS with 200+ instances
