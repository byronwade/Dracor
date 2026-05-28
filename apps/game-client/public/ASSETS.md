# Game Asset Directory

All runtime assets served to the browser live here. Vite serves files from `public/` at the root URL path (e.g., `public/audio/music/exploration/ironvale.ogg` is fetched as `/audio/music/exploration/ironvale.ogg`).

## Directory Map

```
public/
  models/          3D models (GLB preferred, GLTF accepted)
  animations/      Standalone animation files (GLB/BVH)
  audio/           Music, SFX, ambience, voice
  textures/        Images (PNG/WebP/KTX2) for terrain, UI, particles, materials
  environment/     HDR/EXR skybox and environment maps
  vfx/             Particle configs and custom shaders
  fonts/           Web fonts for in-game UI (WOFF2 preferred)
  HavokPhysics.wasm   Havok physics engine (loaded at root by Babylon.js)
```

## Naming Conventions

- **snake_case** for all file and folder names
- Prefix with category where useful: `sword_arming.glb`, `sfx_sword_swing_01.ogg`
- Number variants with zero-padded suffix: `_01`, `_02`, `_03`
- Include resolution in texture names: `terrain_grass_512.png`, `skybox_sunset_2k.hdr`

## Format Guidelines

| Asset Type | Preferred Format | Max Size | Notes |
|-----------|-----------------|----------|-------|
| 3D Models | GLB | 5 MB | Draco-compressed, max 10k triangles for props |
| Character Models | GLB | 15 MB | Max 25k triangles, embedded textures |
| Animations | GLB | 1 MB | Exported as standalone animation clips |
| Music | OGG Vorbis | 3 MB | 128-192 kbps, stereo, loopable |
| SFX | OGG Vorbis | 200 KB | 96-128 kbps, mono preferred |
| Ambience | OGG Vorbis | 5 MB | Seamless loops, stereo |
| Textures | WebP or KTX2 | 512 KB | Power-of-two dimensions, max 2048px |
| HDR Maps | HDR | 5 MB | 1k for mobile, 2k for desktop |
| Fonts | WOFF2 | 200 KB | Subset to game-used glyphs |

## Quality Tiers

The game auto-detects hardware and loads appropriate quality. When providing assets at multiple quality levels, use suffixes:

- `_low` - Mobile / integrated GPU (256px textures, simplified meshes)
- `_med` - Mid-range (512px textures, standard meshes)
- `_high` - Desktop (1024-2048px textures, full detail)

Example: `terrain_grass_low.webp`, `terrain_grass_med.webp`, `terrain_grass_high.webp`
