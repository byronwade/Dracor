# Foliage Models

Trees, grass, bushes, and flora. These are instanced heavily so poly count is critical.

## Current Assets

- `grass_medium_01_4k.glb` — Medium grass clump
- `fir_sapling_medium_4k.glb` — Young fir tree

## Naming Convention

`{plant_type}_{size}_{variant}.glb`

Examples: `pine_tall_01.glb`, `bush_berry_01.glb`, `grass_short_02.glb`, `fern_large_01.glb`

## Requirements

- Instanced grass/flowers: max 200 triangles (rendered thousands of times)
- Bushes: max 800 triangles
- Trees: max 2,000 triangles (trunk + canopy as separate meshes for LOD)
- All foliage should include vertex colors for wind animation (green channel = sway amount)
- Billboard LODs at distance are generated at runtime
