# Terrain

Terrain meshes, heightmap data, and related assets.

Currently terrain is procedurally generated at runtime from zone manifest data. This folder is for pre-baked terrain assets if needed:

- Heightmap images (16-bit PNG, grayscale)
- Pre-built terrain chunks (GLB)
- Splat maps for multi-texture terrain blending

## Naming Convention

`terrain_{zone}_{chunk_id}.glb` — e.g., `terrain_ironvale_0_0.glb`
`heightmap_{zone}.png` — e.g., `heightmap_ironvale.png`
`splatmap_{zone}.png` — e.g., `splatmap_ironvale.png`
