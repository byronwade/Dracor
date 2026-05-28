# Weapon Models

Organized by weapon class. Each weapon is a standalone GLB.

```
weapons/
  daggers/         Short blades, fast attacks
  swords/          Arming swords and longswords
  greatswords/     Two-handed heavy blades
  bows/            Recurve bows and shortbows
  axes/            One-handed war axes
  hammers/         War hammers and maces
  spears/          Spears and polearms
  staves/          Caster staves and rods
```

## Current Weapons (Dracor Starter Set)

All 10 starter weapons available to every race:

| Weapon | File | Folder |
|--------|------|--------|
| Dracor Ember Dagger | `ember_dagger.glb` | `daggers/` |
| Dracor Long Sword | `long_sword.glb` | `swords/` |
| Dracor Arming Sword | `arming_sword.glb` | `swords/` |
| Dracor Greatsword | `greatsword.glb` | `greatswords/` |
| Dracor Recurve Bow | `recurve_bow.glb` | `bows/` |
| Dracor Arrow Set | `arrow_set.glb` | `bows/` |
| Dracor War Axe | `war_axe.glb` | `axes/` |
| Dracor War Hammer | `war_hammer.glb` | `hammers/` |
| Dracor Spear | `spear.glb` | `spears/` |
| Dracor Emberwood Staff | `emberwood_staff.glb` | `staves/` |

## Requirements

- Include a bone or empty named `grip_point` at the handle where the character's hand grips
- Model should be oriented with the blade/head pointing up (+Y) and grip at origin
- Max 3,000 triangles per weapon
- PBR materials with metallic/roughness workflow
- Embedded textures (max 512x512)
