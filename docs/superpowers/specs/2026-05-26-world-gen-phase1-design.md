# World Generation Phase 1: Core Noise + Height Generation

## Summary

New `packages/world-gen` package providing deterministic terrain generation from a world seed. Replaces sine-wave terrain with multi-octave noise, continental shaping (procedural island-continent), and chunk-based generation. 8km x 8km world, 128x128 chunks at 64m each.

## World Parameters

- World size: 8192m x 8192m (8km x 8km)
- Chunk size: 64m x 64m
- Grid: 128 x 128 chunks
- Chunk resolution: 33x33 vertices (32 subdivisions per chunk)
- Sea level: 0m
- Height range: -50m to 200m
- World origin: center of the map (0, 0)
- World bounds: [-4096, 4096] on both X and Z axes

## Package Structure

```
packages/world-gen/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          — public exports
    ├── config.ts         — WorldConfig constants
    ├── seed.ts           — WorldSeed + SeededRNG (splitmix64)
    ├── noise.ts          — Multi-octave 2D noise (value noise with smoothstep)
    ├── continental.ts    — Land/ocean mask with organic coastlines
    ├── elevation.ts      — Final height combining continental + multi-octave noise
    ├── chunk.ts          — ChunkGenerator: generates ChunkHeightData per chunk coord
    └── types.ts          — Shared types (ChunkCoord, ChunkHeightData, etc.)
```

## Module Responsibilities

### `config.ts`
Constants: WORLD_SIZE, CHUNK_SIZE, GRID_SIZE, SEA_LEVEL, MIN_HEIGHT, MAX_HEIGHT, CHUNK_RESOLUTION.

### `seed.ts`
- `WorldSeed`: takes a string or number seed, derives integer sub-seeds for each layer (continental, elevation, moisture, temperature, biome) using hash cascading. Adding new layers never changes existing sub-seeds.
- `SeededRNG`: stateful PRNG using splitmix64. `next()` returns [0,1), `nextInt(min, max)`, `nextFloat(min, max)`.

### `noise.ts`
- `createNoise2D(seed)`: returns a function `(x, z) => number` in [-1, 1]. Uses value noise with smoothstep interpolation (same approach as existing terrainCollision.ts but improved).
- `createFractalNoise2D(seed, octaves, lacunarity, persistence)`: layers multiple noise octaves for natural-looking terrain. Returns `(x, z) => number`.

### `continental.ts`
- `createContinentalMap(seed)`: returns `(worldX, worldZ) => number` where 0 = deep ocean, 1 = land interior.
- Uses radial falloff from world center (creates island shape) combined with large-scale noise for organic coastlines, peninsulas, and bays.
- Coastline noise uses low frequency + high amplitude for dramatic coast shapes.

### `elevation.ts`
- `createElevationMap(seed)`: returns `(worldX, worldZ) => number` (meters above sea level).
- Combines: continental mask × (base elevation noise + mountain ridges + detail noise).
- Mountain ridges: high-amplitude, low-frequency noise with domain warping for ridge-like shapes.
- Plains: areas where noise amplitude is reduced for flat gameplay areas.
- The continental mask drives elevation to negative (ocean floor) where land value < threshold.

### `chunk.ts`
- `ChunkGenerator`: main entry point. Constructed with a `WorldSeed`.
- `generateChunk(gridX, gridZ)`: returns `ChunkHeightData` (Float32Array of 33×33 heights).
- `getHeightAt(worldX, worldZ)`: returns interpolated height at any world position (for physics/placement).
- Internal LRU cache of generated chunks (configurable max size).

## Integration Points

### Game Client
- `createTerrainFromManifest.ts` → new `createTerrainChunk.ts` that takes `ChunkHeightData` and builds a Babylon.js ground mesh
- Scene loads/unloads chunks around the player based on quality tier's `terrainChunkRadius`
- `getHeightAt` for player controller, foliage placement, and camera

### Game Server
- Import `ChunkGenerator` to validate player movement against actual terrain height
- Same seed = same terrain = server-authoritative height queries

### Config Package
- `WORLD_BOUNDS` updated from [-500, 500] to [-4096, 4096]

## Performance

- Chunks generate lazily on first request
- LRU cache (default 256 chunks = ~9MB of height data)
- Height queries use bilinear interpolation of cached chunk data
- No rendering code in the package — pure math
- All functions are deterministic (same seed + coords = same output)
