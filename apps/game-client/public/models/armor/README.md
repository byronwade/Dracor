# Armor Models

Equipment models that attach to character skeletons by slot.

```
armor/
  light/       Leather, cloth — for skirmishers and casters
  medium/      Chainmail, brigandine — for balanced fighters
  heavy/       Plate, scale — for tanks and frontline
  shields/     Bucklers, kite shields, tower shields
```

## Slot System

Each armor piece maps to a body slot:

| Slot | Bone Parent | Examples |
|------|-------------|---------|
| head | `head` | Helmets, hoods, circlets |
| chest | `spine1` | Breastplates, robes, tunics |
| shoulders | `shoulder_l/r` | Pauldrons, mantles |
| arms | `arm_lower_l/r` | Bracers, gauntlets |
| legs | `hips` | Greaves, leggings, skirts |
| feet | `foot_l/r` | Boots, sandals |
| back | `spine2` | Cloaks, quivers, backpacks |
| offhand | `hand_l` | Shields, torches, tomes |

## Naming Convention

`{slot}_{material}_{style}.glb`

Examples: `chest_plate_dracor.glb`, `head_hood_ashwalker.glb`, `shield_kite_ironborn.glb`
