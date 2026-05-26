# Performance Budget

## Quality Tiers

Dracor adapts visual fidelity to hardware capability. Four quality tiers are defined, each with strict budgets for frame rate, geometry, textures, effects, and network.

---

## Ultra (WebGPU Desktop)

Target: High-end desktop with discrete GPU and WebGPU support.

| Metric | Budget |
|--------|--------|
| Target FPS | 60 |
| Resolution | 1440p |
| Max draw calls | 3000 |
| Max visible triangles | 2,000,000 |
| Max texture memory | 512 MB |
| Shadow map resolution | 2048px |
| Shadow casters | 8 |
| Tree instances | 2000 |
| Grass instances | 5000 |
| Active particles | 1000 |
| Terrain chunk radius | 5 (25 chunks loaded) |
| Initial load size | < 15 MB |

**Post-processing:** Bloom, SSAO, vignette, tonemapping — all enabled.

---

## High (WebGL2 Desktop)

Target: Modern desktop with dedicated or strong integrated GPU. WebGL2 rendering.

| Metric | Budget |
|--------|--------|
| Target FPS | 60 |
| Resolution | 1080p |
| Max draw calls | 2000 |
| Max visible triangles | 1,000,000 |
| Max texture memory | 256 MB |
| Shadow map resolution | 1024px |
| Shadow casters | 4 |
| Tree instances | 1000 |
| Grass instances | 2000 |
| Active particles | 500 |
| Terrain chunk radius | 4 (16 chunks loaded) |
| Initial load size | < 10 MB |

**Post-processing:** Bloom and tonemapping enabled. SSAO and vignette disabled.

---

## Medium (Integrated GPU)

Target: Laptop with integrated graphics (Intel Iris, AMD Radeon integrated). Older dedicated GPUs.

| Metric | Budget |
|--------|--------|
| Target FPS | 45 |
| Resolution | 1080p |
| Max draw calls | 1000 |
| Max visible triangles | 500,000 |
| Max texture memory | 128 MB |
| Shadow map resolution | 512px |
| Shadow casters | 2 |
| Tree instances | 400 |
| Grass instances | 800 |
| Active particles | 200 |
| Terrain chunk radius | 3 (9 chunks loaded) |
| Initial load size | < 8 MB |

**Post-processing:** Tonemapping only. All other effects disabled.

---

## Low (Older Hardware)

Target: Older laptops, low-end desktops, or devices with minimal GPU capability.

| Metric | Budget |
|--------|--------|
| Target FPS | 30 |
| Resolution | 720p |
| Max draw calls | 500 |
| Max visible triangles | 200,000 |
| Max texture memory | 64 MB |
| Shadow map resolution | N/A |
| Shadow casters | 0 (shadows disabled) |
| Tree instances | 150 |
| Grass instances | 200 |
| Active particles | 50 |
| Terrain chunk radius | 2 (4 chunks loaded) |
| Initial load size | < 5 MB |

**Post-processing:** None. All effects disabled.

---

## Network Budget (All Tiers)

Network performance is independent of visual quality tier. All clients share the same network constraints.

| Metric | Budget |
|--------|--------|
| Server tick rate | 20 Hz |
| Max players per room | 50 |
| Upstream (client to server) | < 1 KB/sec |
| Downstream (server to client) | < 5 KB/sec |
| Input message size | ~40 bytes |
| State patch frequency | 20 patches/sec |

### Bandwidth Breakdown

- **Upstream:** 20 input messages/sec at ~40 bytes each = ~800 bytes/sec
- **Downstream:** Variable. For a room with 10 moving players: 10 players x 12 bytes (position) x 20 ticks/sec = 2.4 KB/sec plus schema overhead
- **Total per client:** Under 6 KB/sec combined. Playable on mobile data

---

## Server Budget

| Metric | Budget |
|--------|--------|
| Room tick budget | 50ms (20 Hz) |
| Max rooms per process | 10 |
| Memory per room | < 50 MB |
| Character state saves | Every 30 seconds |
| Max players per room | 50 |
| Input processing per tick | All queued inputs for all players |

### Tick Budget Breakdown

The 50ms tick budget is divided approximately:

| Phase | Budget |
|-------|--------|
| Process inputs | 10ms |
| Run character motors | 10ms |
| Check triggers | 5ms |
| Update game state (AI, contracts) | 10ms |
| Schema encode + broadcast | 10ms |
| Headroom | 5ms |

If a tick exceeds 50ms, the server skips the next tick to catch up. Sustained overruns indicate the room is too complex or has too many players.

---

## Quality Tier Detection

The client detects hardware capability at startup and selects a tier:

1. Check for WebGPU support -> Ultra candidate
2. Check GPU renderer string for known high-end GPUs -> High candidate
3. Run a brief benchmark (render a test scene for 60 frames) -> measure average frame time
4. Select the highest tier that meets the FPS target

Players can override the auto-detected tier in settings. The performance overlay (F3) shows which tier is active and whether the current frame rate matches the target.

---

## Budget Enforcement

The performance monitor in `renderer-core/performance/PerformanceMonitor.ts` tracks:

- Frame time (ms) and FPS
- Draw call count
- Visible triangle count
- Texture memory usage
- Active instance count
- Network message rates

When a metric exceeds its budget for more than 3 consecutive seconds, the monitor can:

1. Log a warning to the developer console
2. Reduce foliage density by dropping lowest-priority instances
3. Drop terrain LOD by one level
4. Disable the lowest-priority post-processing effect
5. Notify the player that quality was reduced

These fallbacks ensure the game remains playable even if a scene is momentarily over-budget.
