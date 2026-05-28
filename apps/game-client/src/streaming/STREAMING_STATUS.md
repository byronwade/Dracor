# Streaming & Rendering System Status

## What Works
- Babylon.js 9.9.1 running on WebGL2
- 30+ terrain chunks with biome vertex colors from @dracor/world-gen
- SkyMaterial procedural sky with Rayleigh scattering
- HDR environment (IBL) for reflections
- Cascaded shadow maps (2 cascades, 512px)
- ACES tone mapping + vignette
- 3-tier foliage LOD (full GLB, simplified, procedural fallback)
- 400+ foliage instances streaming
- Terrain streaming with progressive chunk loading
- Deferred async loading — game starts in <2s
- Enhancer plugin system for post-load features
- Camera persistence with validation
- Minimap + fullscreen world map

## Known Issues

### Critical: Character Model (1M+ vertices)
The `dracor.glb` character model has 36 mesh parts totaling 1,040,272 vertices.
Currently limited to 2 parts (231K verts) which still tanks FPS to 30-40.
**Fix:** Re-export from Blender with decimation to ~30K total vertices.
Industry standard: 10-50K verts for a character LOD0.

### PBR Materials Render Black
PBR materials need HDR environment texture loaded to render anything visible.
The HDR loads async after first frame, causing a brief black period.
**Current workaround:** Convert all PBR to StandardMaterial on load.
**Proper fix:** Ensure HDR loads before any PBR mesh is visible.

### Sky Dome Black Triangle
The SkyMaterial box shows a dark face in certain camera angles.
**Fix:** Use a sphere instead of box, or set proper backface culling.

### Foliage Tree Models (780K verts each)
The fir_sapling_medium_4k.glb has 780K vertices at LOD0.
LOD system limits to 25m radius but still expensive.
**Fix:** Re-export tree GLBs at ~10K vertices for LOD0, ~2K for LOD1.

## Architecture

### Enhancer System (`src/scenes/enhancers/`)
Pluggable post-load features. Each enhancer:
- Has priority (lower = loads first)
- Initializes async after first render
- Can update per-frame with atmosphere state
- Disposes cleanly

Current enhancers: Sky, HDR Environment, Shadows, PostProcess
Available but disabled: SSAO (too expensive at current vertex counts)

### Streaming Config
Load distance: 300m (ultra), 150m (low)
Chunk size: 100m
Max chunks per frame: 2
LOD update interval: every 15 frames
Initial fast chunks: 9 (simple sine height, no biome)
Full chunks: replace fast chunks after world-gen init
