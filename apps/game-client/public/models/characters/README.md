# Character Models

One folder per playable race. Each contains the base model and optional LODs.

```
characters/
  dracor/          Dragon-blooded descendants
  ironborn/        Stone-skinned dwarven kin
  sylvhari/        Forest-touched elves
  ashwalker/       Nomadic desert wanderers
  voidtouched/     Void-corrupted ethereals
  bloodfane/       Crimson vampiric nobles
  stoneguard/      Mountain fortress guardians
  grukhar/         Orcish brute warriors
  skrix/           Goblin tinkerers and scouts
```

## Required Files Per Race

| File | Purpose |
|------|---------|
| `{race}.glb` | Base body mesh with skeleton, T-pose or A-pose |

## Optional Files Per Race

| File | Purpose |
|------|---------|
| `{race}_lod1.glb` | Reduced mesh for mid-distance (50% triangles) |
| `{race}_lod2.glb` | Minimal mesh for far distance (25% triangles) |

## Skeleton Standard

All race models must share the same bone hierarchy so animations are interchangeable:

```
root
  hips
    spine
      spine1
        spine2
          neck
            head
          shoulder_l / shoulder_r
            arm_upper_l / arm_upper_r
              arm_lower_l / arm_lower_r
                hand_l / hand_r
                  weapon_attach_r  (right hand weapon mount)
    leg_upper_l / leg_upper_r
      leg_lower_l / leg_lower_r
        foot_l / foot_r
```

The `weapon_attach_r` bone is where weapon models are parented at runtime.
