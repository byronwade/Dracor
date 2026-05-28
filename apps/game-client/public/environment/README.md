# Environment Maps

HDR and EXR environment maps for PBR reflections and skybox rendering.

## Current Assets

- `qwantani_sunset_1k.hdr` — 1K sunset HDR (mobile fallback)
- `qwantani_sunset_2k.hdr` — 2K sunset HDR (desktop default)

## Naming Convention

`{name}_{resolution}.hdr`

Examples: `ironvale_overcast_1k.hdr`, `dungeon_torch_1k.hdr`, `night_clear_2k.hdr`

## Usage

Environment maps are loaded by Babylon.js as `HDRCubeTexture` and set as `scene.environmentTexture` for PBR material reflections. A lower resolution (1k) version should be provided for mobile/low quality tiers.

## Guidelines

- Provide both 1k and 2k versions of each environment
- HDR format preferred (Babylon.js native support)
- Match the lighting mood of the zone (dark and foggy for Ironvale Outskirts, warm for town interiors)
- Keep file size under 5 MB for 2k, under 2 MB for 1k
