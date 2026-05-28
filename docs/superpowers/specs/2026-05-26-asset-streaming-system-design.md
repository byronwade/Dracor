# Asset Streaming & LOD System Design

## Problem

The game client loads every asset eagerly at startup — one giant 500x500 terrain mesh, all foliage/rocks/landmarks created synchronously. Data structures for chunking exist (`StreamingCell`, 25 terrain chunks, `lodLevels: 3` per chunk, LOD entries in asset manifest) but none are wired up. This cannot scale to 100s of 4K textures or larger worlds.

## Goals

1. Load assets only when the player approaches them
2. Swap mesh/terrain detail by distance (LOD)
3. Handle 100s of 4K textures without exceeding VRAM budgets
4. Zero pop-in via hysteresis zones, density falloff, and cross-fade
5. Maintain 60fps on high-tier hardware, 30fps on low-tier

## Architecture: 6 Systems

```
┌─────────────────────────────────────────────────┐
│                  GameApp.update()                │
│                       │                         │
│              StreamingManager.update()           │
│              ┌────────┼────────┐                │
│              │        │        │                │
│     ChunkedTerrain  Foliage  MeshLOD           │
│     Manager    Streaming  Manager              │
│              │   Manager   │                   │
│              └────┬───┬────┘                   │
│                   │   │                        │
│            AssetLoader  VRAMBudget             │
│            (priority    Manager                │
│             queue)      (LRU eviction)         │
└─────────────────────────────────────────────────┘
```

### 1. StreamingManager

Central coordinator. Runs each frame.

**Responsibilities:**
- Maintains a `Map<string, CellState>` of streaming cells (5x5 grid = 25 cells, each 100x100 units)
- Calculates which cells to load/unload based on player distance
- Applies hysteresis: load at `loadDistance`, unload at `unloadDistance` (unload > load to prevent thrashing)
- Predicts movement direction, bumps priority of cells ahead of player
- Delegates to subsystems: terrain chunks, foliage, mesh LOD

**Cell lifecycle:**
```
UNLOADED → QUEUED → LOADING → LOADED → UNLOADING → UNLOADED
                                           ↑
                        (re-entered zone)──┘
```

**Cell priorities:**
- `critical`: player's current cell (loaded first, never unloaded)
- `high`: adjacent cells (8 neighbors)
- `medium`: 2-cell radius + cells in movement direction
- `low`: 3-cell radius (preload)

**Configuration (from QualitySettings):**

| Tier | Load Distance | Unload Distance | Max Loaded Cells |
|------|--------------|-----------------|------------------|
| ultra | 300m | 400m | 25 (all) |
| high | 200m | 300m | 17 |
| medium | 150m | 200m | 13 |
| low | 100m | 150m | 9 |

**Key API:**
```typescript
class StreamingManager {
  constructor(scene: Scene, quality: QualitySettings, manifest: ZoneManifest)
  async loadInitialArea(spawnPosition: Vector3): Promise<StreamingSceneResult>
  update(playerPosition: Vector3, cameraForward: Vector3, dt: number): void
  dispose(): void
}
```

### 2. ChunkedTerrainManager

Replaces the single 500x500 ground with 25 independent chunk meshes.

**LOD subdivision by distance:**

| Distance | Subdivision | Triangles per chunk |
|----------|------------|---------------------|
| 0-1 cell (100m) | 128 | ~32,768 |
| 1-2 cells (200m) | 64 | ~8,192 |
| 2-3 cells (300m) | 16 | ~512 |
| 3+ cells | Not loaded | 0 |

**Seamless stitching:** Chunks share edge vertices. When adjacent chunks have different LODs, the higher-LOD chunk snaps its edge vertices to match the lower-LOD neighbor. This prevents T-junction gaps.

**Height query:** The `getHeightAt(x, z)` function remains purely mathematical (layered sine noise). It doesn't depend on mesh data, so it works regardless of which chunks are loaded.

**Key API:**
```typescript
class ChunkedTerrainManager {
  constructor(scene: Scene, terrain: TerrainDefinition, quality: QualitySettings)
  loadChunk(gridX: number, gridZ: number, lodLevel: number): void
  unloadChunk(gridX: number, gridZ: number): void
  updateLOD(playerPosition: Vector3): void
  getHeightAt(x: number, z: number): number
  dispose(): void
}
```

### 3. AssetLoader

Priority queue with concurrency control.

**Features:**
- Max concurrent loads: 3 (configurable per quality tier)
- Load tasks: `{ assetId, type, priority, url, abortController }`
- In-flight loads cancelled when cells unload (AbortController)
- Completed assets cached in Map for reuse
- Supports: glTF/GLB meshes, KTX2 textures, audio files
- Uses Babylon's `LoadAssetContainerAsync` for meshes
- Dispose tracking: every loaded asset registered for cleanup

**Priority ordering:** critical > high > medium > low. Within same priority, FIFO.

**Key API:**
```typescript
class AssetLoader {
  constructor(scene: Scene, maxConcurrent?: number)
  enqueue(request: LoadRequest): Promise<LoadedAsset>
  cancel(assetId: string): void
  cancelByCell(cellId: string): void
  getCached(assetId: string): LoadedAsset | null
  dispose(): void
}
```

### 4. FoliageStreamingManager

Distance-based thin instance buffer management.

**Core idea:** Instead of creating all 50,000 foliage instances at startup, only create instances within the player's loaded cells. Within loaded cells, apply distance-based density falloff:

| Distance from player | Density multiplier |
|---------------------|-------------------|
| 0-50m | 1.0 (full) |
| 50-100m | 0.7 |
| 100-150m | 0.4 |
| 150m+ | 0.0 (culled) |

**Rebuild strategy:** Don't rebuild every frame. Rebuild when:
- Player moves >20m from last rebuild position
- A cell loads or unloads
- Quality tier changes

**Instance LOD:** Separate source meshes per LOD level, each with its own thin instance buffer:
- LOD0 (0-50m): Full detail mesh, all instances
- LOD1 (50-120m): Reduced mesh (fewer triangles), reduced density
- LOD2 (120m+): Billboard impostor or very simple shape

**Per-cell foliage data:** Each cell stores its placement results so they can be reused when the cell is re-loaded (avoid re-running placement RNG).

**Key API:**
```typescript
class FoliageStreamingManager {
  constructor(scene: Scene, quality: QualitySettings, getHeightAt: HeightSampler)
  loadCellFoliage(cellId: string, foliageGroups: FoliageGroup[], exclusions: ExclusionData): void
  unloadCellFoliage(cellId: string): void
  updateInstanceBuffers(playerPosition: Vector3): void
  dispose(): void
}
```

### 5. MeshLODManager

Uses Babylon's native `addLODLevel()` for distance-based mesh switching.

**For regular meshes (landmarks, shrine, bridge, gate):**
```typescript
mesh.addLODLevel(60, lod1Mesh);   // Medium detail at 60m
mesh.addLODLevel(120, lod2Mesh);  // Low detail at 120m
mesh.addLODLevel(maxRenderDistance, null);  // Culled beyond render distance
```

**For instanced foliage:** LOD is handled by FoliageStreamingManager (separate buffers per LOD level), not Babylon's LOD system, because thin instances don't support `addLODLevel()`.

**Fallback LOD generation:** When only LOD0 mesh exists (no artist-made LOD1/LOD2), auto-generate simplified versions:
- LOD1: Reduce geometry by merging/decimating (Babylon's `SimplificationType.QUADRATIC`)
- LOD2: Billboard impostor or bounding-box proxy

**Key API:**
```typescript
class MeshLODManager {
  constructor(scene: Scene, quality: QualitySettings)
  registerMesh(mesh: Mesh, lodMeshes: Map<number, Mesh>): void
  setDistances(lodBias: number): void
  dispose(): void
}
```

### 6. VRAMBudgetManager

Tracks estimated GPU memory usage and evicts least-recently-used assets when over budget.

**Budget limits (from PerformanceBudget):**

| Tier | Max Texture MB | Max Mesh MB | Max Total MB |
|------|---------------|-------------|-------------|
| ultra | 512 | 256 | 1024 |
| high | 256 | 128 | 512 |
| medium | 128 | 64 | 256 |
| low | 64 | 32 | 128 |

**VRAM estimation:**
- KTX2 BC7 texture: `width * height * 1 byte` (4:1 compression)
- KTX2 ASTC 4x4: `width * height * 1 byte`
- Uncompressed RGBA: `width * height * 4 bytes`
- Mesh: `vertexCount * stride + indexCount * 2` bytes
- Mip chain: multiply by 1.33 (1 + 1/4 + 1/16 + ...)

**LRU eviction:** When over budget:
1. Sort tracked assets by last-access time
2. Evict oldest non-critical assets (never evict player cell)
3. Dispose texture/mesh, remove from scene
4. Continue until under budget

**Key API:**
```typescript
class VRAMBudgetManager {
  constructor(budget: PerformanceBudget)
  trackAsset(id: string, type: 'texture' | 'mesh', sizeMB: number, cellId: string): void
  touchAsset(id: string): void
  untrackAsset(id: string): void
  isOverBudget(): boolean
  evictUntilUnderBudget(protectedCells: Set<string>): string[]
  getUsage(): { textureMB: number; meshMB: number; totalMB: number }
  dispose(): void
}
```

## Integration Changes

### GameApp.ts
```typescript
// Before:
const builder = getSceneBuilder('ironvale_outskirts');
this.sceneResult = await builder(this.engine, this.quality);

// After:
this.streamingManager = new StreamingManager(this.scene, this.quality, manifest);
const streamResult = await this.streamingManager.loadInitialArea(spawn);
// streamResult provides: getHeightAt, updateWind, sky, dayNight

// In update():
this.streamingManager.update(playerPos, cameraForward, dt);
```

### IronvaleOutskirtsScene.ts
Simplified to only set up scene-level concerns:
- Lighting (hemisphere + directional)
- Post-processing pipeline
- Sky, atmosphere, distant mountains (always loaded, not streamed)
- Returns the StreamingManager instead of a static scene result

### loadZoneFromManifest.ts
Replaced by StreamingManager. This file becomes a thin wrapper or is removed.

## File Structure

```
apps/game-client/src/streaming/
├── StreamingManager.ts
├── StreamingCell.ts
├── AssetLoader.ts
├── ChunkedTerrainManager.ts
├── FoliageStreamingManager.ts
├── MeshLODManager.ts
├── VRAMBudgetManager.ts
└── types.ts
```

## Performance Targets

| Metric | Ultra | High | Medium | Low |
|--------|-------|------|--------|-----|
| Target FPS | 60 | 60 | 45 | 30 |
| Max draw calls | 3000 | 2000 | 1000 | 500 |
| Max triangles | 2M | 1M | 500K | 200K |
| Max texture VRAM | 512MB | 256MB | 128MB | 64MB |
| Load time (initial) | <3s | <2s | <1.5s | <1s |
| Streaming jank budget | <2ms/frame | <2ms/frame | <3ms/frame | <3ms/frame |

## Key Invariants

1. `getHeightAt()` always works — it's pure math, independent of loaded chunks
2. Player cell is always loaded at highest quality
3. Unload distance > load distance (hysteresis prevents thrashing)
4. AssetLoader never exceeds concurrent load limit
5. VRAMBudgetManager never evicts assets in the player's cell
6. Foliage buffers only rebuild when player moves >20m (not every frame)
7. Terrain chunks share edge vertices at LOD boundaries (no gaps)
