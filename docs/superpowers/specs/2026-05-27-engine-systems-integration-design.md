# Engine Systems Integration Design

**Date:** 2026-05-27
**Scope:** Full integration of bitECS, Recast/Detour navmesh, Howler.js audio, Draco + meshoptimizer asset pipeline, Node Material Editor shaders, procedural textures, and Babylon.js Inspector into Dracor.

## Current State

**Already integrated:**
- Havok Physics — fully wired (`@babylonjs/havok` v1.3.12, `HavokPlugin`, `PhysicsCharacterController`, terrain colliders)
- simplex-noise — used in `@dracor/world-gen` for elevation, climate, continental maps
- Babylon.js GUI — `@babylonjs/gui` installed
- Colyseus — full multiplayer with state sync, chat, rate limiting
- Chunked terrain — `ChunkedTerrainManager` with LOD, biome coloring, physics bodies, VRAM budget
- Quality tier detection — auto-selects low/medium/high/ultra

**Decision: Keep Havok.** Jolt is excluded — Havok is officially supported by Babylon.js and already deeply integrated.

## Phase 1 — bitECS Architecture

### Overview

Introduce an Entity Component System using bitECS across both game-client and game-server. bitECS uses typed arrays (Float32Array, Uint8Array) for components, giving cache-friendly data-oriented performance. Colyseus becomes a transport/sync layer over ECS state rather than the state itself.

### New Package: `packages/ecs`

Shared between client and server. Contains component definitions and system interfaces.

### Components

| Component | Fields | Types | Purpose |
|-----------|--------|-------|---------|
| `Position` | x, y, z | f32 | World position |
| `Rotation` | yaw | f32 | Heading |
| `Velocity` | vx, vy, vz | f32 | Current velocity |
| `Health` | current, max | u16 | Hit points |
| `CharacterInfo` | race, weapon, level | u8/u16 | Character identity (enum indices) |
| `NetworkId` | sessionId | u32 | Maps ECS entity to Colyseus session |
| `InputState` | moveX, moveZ, sprint, jump | f32/u8 | Current input |
| `PhysicsRef` | bodyIndex | u32 | Reference to Havok physics body |
| `AIAgent` | state, targetEntity, navGoalX, navGoalZ, pathRecalcTimer | u8/u32/f32 | NPC brain state (Phase 2) |
| `AudioSource` | soundId, volume, radius, loop, playing | u16/f32/u8 | Spatial audio emitter (Phase 3) |
| `Renderable` | meshIndex, materialIndex, visible | u32/u8 | Links to Babylon mesh |
| `TerrainChunk` | gridX, gridZ, lod | i16/u8 | Terrain chunk identity |
| `MaterialOverride` | shaderId | u16 | NME shader reference (Phase 5) |

### Server Systems (20Hz tick)

Run in order each server tick:

1. **InputSystem** — Reads Colyseus `"input"` messages, writes to `InputState` components
2. **AISystem** — Reads `AIAgent`, queries navmesh, writes `InputState` for NPCs (Phase 2)
3. **MovementSystem** — Reads `InputState` + `Position`, applies physics/bounds, writes `Position`/`Velocity`
4. **CombatSystem** — Processes attacks, writes `Health` (future)
5. **SyncSystem** — Reads ECS state, writes to Colyseus `PlayerState` schema for network broadcast

### Client Systems (every frame)

1. **NetworkReceiveSystem** — Reads Colyseus state updates, writes to ECS components for remote entities
2. **LocalInputSystem** — Reads keyboard/mouse, writes to `InputState` for local player
3. **ClientMovementSystem** — Client-side prediction using `InputState` + `Position`
4. **InterpolationSystem** — Smoothly interpolates remote player positions
5. **RenderSyncSystem** — Reads `Position`/`Rotation`/`Renderable`, updates Babylon.js mesh transforms
6. **AudioSystem** — Reads `Position` + `AudioSource`, updates Howler.js spatial positions (Phase 3)
7. **TerrainStreamingSystem** — Reads player `Position`, triggers chunk load/unload
8. **LODSystem** — Reads `Position` distance from camera, swaps `Renderable.meshIndex` between LOD levels (Phase 4)
9. **MaterialSystem** — Reads `MaterialOverride`, applies NME shaders to meshes (Phase 5)

### Colyseus Bridge

`WorldRoom` continues to handle:
- WebSocket connections and disconnections
- Chat messages (rate-limited, sanitized)
- Join/leave system messages
- Name validation and uniqueness

Movement simulation moves from `simulatePlayerMovement.ts` into the ECS `MovementSystem`. The `SyncSystem` reads ECS component arrays and writes to Colyseus `PlayerState` schemas, preserving Colyseus's efficient delta encoding for network broadcast.

### Migration Path

Incremental — each system replaces one existing class while the game stays playable:

1. Create `packages/ecs` with component definitions and world setup
2. Add ECS world to `WorldRoom`, migrate `simulatePlayerMovement` → `MovementSystem`
3. Add `SyncSystem` to bridge ECS → Colyseus schemas
4. Client: add ECS world to `GameApp`, migrate `PlayerController` → `LocalInputSystem` + `ClientMovementSystem`
5. Migrate `MultiplayerClient` remote player handling → `NetworkReceiveSystem` + `InterpolationSystem`
6. Migrate `ChunkedTerrainManager` → `TerrainStreamingSystem`
7. Remove emptied class files

### New Dependencies

| Package | Where | Version |
|---------|-------|---------|
| `bitecs` | `packages/ecs` | ^0.3.x |

## Phase 2 — Recast/Detour Navmesh

### Overview

NPC and enemy pathfinding using Babylon.js's built-in Recast/Detour plugin. Navmesh baked from terrain geometry on zone load. Crowd simulation for steering and agent-agent avoidance.

### Components

| Component | Location | Role |
|-----------|----------|------|
| `RecastJSPlugin` | Game server + game client | Loads Recast WASM, provides navmesh API |
| Navmesh baking | Server, at room start | Builds navmesh from terrain geometry for the zone |
| `CrowdAgent` | Per-NPC entity | Detour crowd agent for steering/avoidance |
| `AISystem` (ECS) | Server tick loop | Reads `AIAgent`, queries navmesh, sets goals |

### AI Behavior Loop (per NPC per tick)

1. Evaluate behavior state (idle → patrol → chase → flee) based on nearby player proximity
2. Compute/update path via `crowd.agentGoto(targetPosition)`
3. Detour crowd simulation handles steering, obstacle avoidance, inter-agent avoidance
4. Write resulting velocity into `Velocity` component
5. `MovementSystem` applies it identically to player movement

### Navmesh Parameters

Tuned to match existing physics constants:
- Agent radius: 0.35 (matches `CAPSULE_RADIUS`)
- Agent height: 1.8 (matches `CAPSULE_HEIGHT`)
- Max slope: 55 degrees (matches `MAX_SLOPE_DEGREES`)
- Max step height: 0.35 (matches `MAX_STEP_HEIGHT`)
- Static obstacles (shrines, boulders, buildings) carved out

### Client Side

- Loads navmesh for debug visualization (draw wireframe in dev mode)
- Does NOT run AI locally — NPCs smoothed via `InterpolationSystem`
- Optionally supports click-to-move pathfinding for the local player

### New Dependencies

| Package | Where | Version |
|---------|-------|---------|
| `recast-detour` (Babylon built-in) | game-client, game-server | Bundled with `@babylonjs/core` |

## Phase 3 — Audio System (Howler.js)

### Overview

Replace the current `AudioManager` (raw Web Audio oscillator drone) with Howler.js for positional 3D audio, music, SFX, and ambient zone sounds.

### Architecture

| Component | Purpose |
|-----------|---------|
| `AudioManager` (rewritten) | Singleton owning Howler instance pool. Manages categories: music, SFX, ambient, UI. Respects `SettingsManager` volume sliders. |
| `AudioSource` ECS component | `soundId`, `volume`, `radius`, `loop`, `playing` |
| `AudioSystem` ECS system | Per-frame: reads `Position` + `AudioSource`, updates Howler spatial positions relative to camera. Distance culling. |
| Sound Registry | Static map of sound IDs → Howler `Howl` configs. Lazy-loaded by category. |

### Sound Categories

| Category | Examples | Spatial | Volume Slider |
|----------|----------|---------|---------------|
| Ambient | Wind, birds, water, cave echo | Yes (zone emitters) | Ambient volume |
| Music | Zone themes, combat, menu | No (stereo) | Music volume |
| SFX | Footsteps, sword swing, hit, jump | Yes (entity-attached) | SFX volume |
| UI | Button click, menu open, notification | No (stereo) | UI volume |

### ECS Integration

- Entities (campfires, waterfalls, NPCs) get `AudioSource` components
- `AudioSystem` runs client-side only
- Distance culling: sounds beyond `radius * 2` are paused (not just silent) to save CPU
- Listener position = camera position, updated every frame
- Footstep sounds: when `Velocity` magnitude > threshold and entity is grounded, trigger footstep at `Position`

### Migration

1. Install `howler` as dependency of `game-client`
2. Rewrite `AudioManager` to wrap Howler
3. Keep `SettingsManager` integration (volume sliders already exist)
4. Add `AudioSource` component and `AudioSystem` to ECS
5. Delete oscillator/noise generation code

### New Dependencies

| Package | Where | Version |
|---------|-------|---------|
| `howler` | `apps/game-client` | ^2.2.x |
| `@types/howler` | `apps/game-client` (devDep) | ^2.2.x |

## Phase 4 — Asset Pipeline (Draco + meshoptimizer)

### Overview

Build-time mesh compression and optimization pipeline. Prepares glTF assets for fast browser delivery before the game starts loading real 3D models.

### Pipeline Flow

```
assets-source/models/*.gltf
    │
    ▼  meshoptimizer
    │  - vertex cache optimization
    │  - attribute quantization
    │  - LOD generation (100%, 50%, 25% triangles)
    │
    ▼  Draco
    │  - geometry compression (80-90% size reduction)
    │
    ▼
apps/game-client/public/models/*.glb (compressed)
    │
    ▼  Runtime
Babylon.js @babylonjs/loaders (built-in Draco decoder)
```

### Integration Points

**`tools/asset-optimizer` (extend existing tool):**
- Add `gltf-transform` as orchestrator (wraps both Draco and meshoptimizer)
- New `optimize` command: reads `assets-source/`, writes compressed `.glb` to `public/models/`
- Existing `analyze` command gains post-compression file size reporting
- LOD generation: meshoptimizer `simplify` produces 3 LOD levels per mesh

**Babylon.js loader:**
- `@babylonjs/loaders` natively supports Draco-compressed glTF — no client code changes
- Models loaded via `SceneLoader.ImportMeshAsync()`

**ECS integration:**
- `Renderable` component's `meshIndex` maps to loaded mesh instances
- `LODSystem` reads distance from camera, swaps `meshIndex` between LOD levels

### New Dependencies (all build-time, devDependencies of `tools/asset-optimizer`)

| Package | Purpose |
|---------|---------|
| `@gltf-transform/core` | glTF read/write |
| `@gltf-transform/extensions` | Draco + meshopt extensions |
| `@gltf-transform/functions` | Optimize/compress commands |
| `draco3dgltf` | Draco encoder |
| `meshoptimizer` | Mesh optimization |

Zero impact on client bundle size.

## Phase 5 — Visual Polish (NME + Procedural Textures + Inspector)

### Node Material Editor Shaders

Design shaders visually in NME (`nme.babylonjs.com`), export as JSON, load at runtime.

**Target shaders:**

| Shader | Applied To | Key Effects |
|--------|-----------|-------------|
| Water | River/lake meshes | Animated UV scrolling, fresnel, depth transparency, edge foam |
| Lava/Ember | Volcanic zones, fire | Emissive scrolling noise, heat distortion, orange→red→black ramp |
| Fog volume | Zone boundaries | Soft depth-blended fog, animated wisps, time-of-day density |
| Magic effects | Spells, shrine glow | Additive blending, animated noise, color parameterized per type |
| Terrain blend | Future PBR terrain | Triplanar projection, slope-based grass/rock blend, wetness near water |

**Workflow:**
1. Design in NME browser tool → export `.json` to `assets-source/shaders/`
2. `tools/asset-optimizer` copies to `public/shaders/` during build
3. Runtime: `NodeMaterial.ParseFromFileAsync()` loads and compiles
4. ECS: `MaterialOverride` component references shader ID, `MaterialSystem` applies it

### Procedural Textures

Using `@babylonjs/addons` (already installed). GPU-generated textures at zero download cost.

| Texture | Use |
|---------|-----|
| Cloud | Sky system, animated cloud layer |
| Fire | Campfires, torches, volcanic vents |
| Grass | Terrain detail (close-up ground cover) |
| Wood/Stone | Procedural building materials before real assets |

Procedural for ambient/background; loaded textures for hero assets.

### Babylon.js Inspector

- **Trigger:** F12 key in dev builds only
- **Implementation:** Dynamic `import('@babylonjs/inspector')` on first press
- **Gate:** `if (import.meta.env.DEV)` — tree-shaken from production
- **Toggle:** First press loads + shows; subsequent presses show/hide
- **Location:** Keydown listener in `GameApp.ts`
- **Size:** ~2MB chunk, never shipped to production

### New Dependencies

| Package | Where | Version |
|---------|-------|---------|
| `@babylonjs/inspector` | `apps/game-client` (devDep) | ^9.0.0 |

## Phase Dependencies

```
Phase 1 (bitECS) ──┬── Phase 2 (Navmesh) ── requires AIAgent component, AISystem
                    ├── Phase 3 (Audio) ──── requires AudioSource component, AudioSystem
                    ├── Phase 4 (Assets) ─── requires Renderable component, LODSystem
                    └── Phase 5 (Visual) ─── requires MaterialOverride, Phase 4 pipeline
```

## Non-Goals

- **Jolt Physics** — excluded, Havok stays
- **Dynamic Terrain Extension** — excluded, custom `ChunkedTerrainManager` already handles this
- **Redis/caching layer** — out of scope for this design
- **Server-side rendering** — not applicable
- **Mobile/touch input** — separate design pass
