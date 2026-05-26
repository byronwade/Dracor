# World Streaming

## Zone Manifests

Each zone in Dracor is described by a self-contained JSON manifest. The manifest lists everything the client needs to load and render that zone:

| Section | Contents |
|---------|----------|
| terrain | Heightmap reference, chunk grid dimensions, material assignments |
| biomes | Biome regions with foliage and ground cover definitions |
| foliage | Instance lists for trees, grass, rocks — positions, rotations, scales |
| landmarks | Named points of interest with mesh references and positions |
| spawns | Enemy and NPC spawn points with type and respawn timers |
| roads | Waypoint paths for roads and trails |
| water | Water plane definitions (position, size, material) |
| assets | Full list of all meshes, textures, and audio files needed |

Zone manifests live in `packages/world-data/src/zones/`. The first zone is `ironvaleOutskirts.ts`.

## Terrain Chunks

Terrain is divided into a grid of 100m x 100m chunks:

- Each chunk has its own heightmap data (procedural or texture-based)
- Chunks have 3 LOD levels: full detail, simplified, minimal
- The terrain system loads chunks in a radius around the player
- Chunks outside the load radius are unloaded to free memory

Chunk specifications are defined in `packages/world-data/src/types/TerrainChunk.ts`.

### Chunk Loading by Distance

| Distance | Action | LOD |
|----------|--------|-----|
| 0-100m | Loaded, full detail | LOD 0 |
| 100-200m | Loaded, simplified | LOD 1 |
| 200-300m | Loaded, minimal | LOD 2 |
| 300m+ | Not loaded | None |

Exact distances scale by quality tier. Ultra tier loads more chunks at higher detail.

## Streaming Cells

Streaming cells are larger logical areas that group assets for batch loading:

- A cell might cover a 200m x 200m area containing multiple terrain chunks plus associated foliage, landmarks, and spawns
- When a player approaches a cell boundary, the next cell begins preloading
- When a player moves far enough from a cell, it unloads entirely
- Cells are defined in the zone manifest as named regions

Cell definitions live in `packages/world-data/src/types/StreamingCell.ts`.

## Asset Manifests

Each zone manifest includes an asset list specifying every file the zone needs:

| Field | Description |
|-------|-------------|
| path | File path or URL to the asset |
| type | mesh, texture, audio, material |
| sizeBytes | File size for budget tracking |
| priority | critical, high, medium, low |
| compression | none, draco, ktx2 |

The asset manifest allows the client to:

- Calculate total zone size before loading
- Prioritize critical assets (terrain, player model)
- Show meaningful loading progress
- Validate that all assets are present and within budget

Asset manifest types are in `packages/asset-pipeline/src/types/AssetManifest.ts`.

## Loading Priorities

Assets load in priority order:

| Priority | What | Why |
|----------|------|-----|
| Critical | Terrain under player, player model, sky | Game is unplayable without these |
| High | Nearby foliage, landmarks within 100m, NPC meshes | Visible immediately after spawn |
| Medium | Distant terrain chunks, far foliage, ambient meshes | Fill in the world as player looks around |
| Low | Ambient particles, background audio, cosmetic detail | Polish that can arrive late |

The player enters the world as soon as critical assets are loaded. Everything else streams in around them.

## Distance-Based Streaming

Streaming uses hysteresis to prevent loading/unloading flicker when a player walks back and forth across a boundary:

- **Load distance:** 300m — chunk begins loading when player is within 300m
- **Unload distance:** 400m — chunk unloads when player is beyond 400m
- The 100m gap prevents rapid load/unload cycles at the boundary

The same hysteresis pattern applies to foliage instances, landmark meshes, and streaming cells.

## Future: Zone Transitions

When the game expands beyond a single zone, players will transfer between zones:

1. Player approaches zone boundary (visible as a road leading to a portal or passage)
2. Client begins preloading the next zone's critical assets
3. Player crosses the threshold
4. Client sends a zone transfer request to the server
5. Server disconnects the player from the current Colyseus room
6. Server connects the player to the new zone's Colyseus room
7. Client completes loading the new zone and renders it
8. Old zone assets unload

During transfer, a brief loading screen or visual transition (fog, narrow passage) masks the switch.

## Colyseus Rooms and Zones

Each zone maps to a Colyseus room type:

- `IronvaleRoom` — the town zone
- `OutskirtsRoom` — the first adventure zone
- Future: `WolfpineRoom`, `AshrootRoom`, etc.

When a player transfers zones, they leave one room and join another. Each room has its own state, tick loop, and player list. This means:

- Zone populations are independent
- A busy town does not affect outskirts performance
- Each zone can be hosted on a different server process if needed

## Why Zone-Based, Not Seamless

A seamless open world in the browser is technically possible but introduces significant complexity:

- **Memory management:** The browser has hard memory limits. Zones provide clear boundaries for loading/unloading
- **Server scaling:** Each zone is a self-contained room. Easy to scale horizontally by adding processes per zone
- **Asset management:** Zone manifests are self-contained. No ambiguity about what needs to be loaded
- **Performance boundaries:** Each zone is tuned to a specific performance budget. No risk of two expensive zones overlapping
- **Development speed:** Zones can be built, tested, and shipped independently

The zone-based approach can evolve toward seamless streaming in the future by making zone transitions invisible (no loading screen, just streaming cells at boundaries). But the foundation is zone-based because it is simpler, more performant, and easier to debug.

## Initial Load Budget

The first playable state must load in under 10 seconds on a broadband connection:

| Tier | Max Initial Load | Contents |
|------|-----------------|----------|
| Ultra | 15 MB | Full-quality terrain, high-res textures, all critical assets |
| High | 10 MB | Standard terrain, compressed textures, critical assets |
| Medium | 8 MB | Simplified terrain, half-res textures, essential assets only |
| Low | 5 MB | Minimal terrain, quarter-res textures, absolute essentials |

After the initial load, the client streams additional content in the background as the player explores. The goal is "playable in seconds, beautiful in minutes."
