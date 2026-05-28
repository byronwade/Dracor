# Textures

Image assets for terrain, UI, particles, materials, and decals. WebP preferred for web delivery, KTX2 for GPU-compressed textures.

```
textures/
  terrain/       Ground material textures (albedo, normal, roughness)
  skybox/        Skybox cube faces or equirectangular maps
  ui/
    icons/
      items/     Item inventory icons (64x64 or 128x128)
      abilities/ Ability bar icons (64x64)
      status/    Buff/debuff status icons (32x32)
    hud/         HUD frame elements (health bar, mana bar, minimap border)
    menus/       Menu backgrounds, panels, borders
    cursors/     Custom mouse cursors per context
  particles/     Particle sprite sheets and individual sprites
  materials/     PBR texture sets for world materials
  decals/        Blood splatter, scorch marks, footprints
```

## Naming Convention

`{material}_{map_type}.{ext}`

Map types: `albedo`, `normal`, `roughness`, `metallic`, `ao`, `emissive`, `height`

Examples:
- `stone_wall_albedo.webp`, `stone_wall_normal.webp`
- `icon_sword_arming.webp`
- `particle_ember_01.webp`

## Size Guidelines

| Category | Max Dimensions | Format |
|----------|---------------|--------|
| Terrain textures | 1024x1024 | WebP or KTX2 |
| Material PBR sets | 1024x1024 per map | WebP or KTX2 |
| Item icons | 128x128 | WebP (transparent) |
| Ability icons | 64x64 | WebP (transparent) |
| Particle sprites | 256x256 | WebP (transparent) |
| UI elements | Varies | WebP (transparent where needed) |
| Decals | 512x512 | WebP (transparent) |

All textures should use power-of-two dimensions for GPU compatibility.
