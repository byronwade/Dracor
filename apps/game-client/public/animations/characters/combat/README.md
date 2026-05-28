# Combat Animations

Attack, defense, and reaction animations. Weapon-specific animations are prefixed with the weapon class.

## Per-Weapon Attack Chains

Each weapon type needs a primary attack chain (3 hits) and a heavy attack:

| Prefix | Weapon | Files Needed |
|--------|--------|-------------|
| `dagger_` | Ember Dagger | `dagger_attack_01.glb` through `_03.glb`, `dagger_heavy.glb` |
| `sword_` | Arming Sword / Long Sword | `sword_attack_01.glb` through `_03.glb`, `sword_heavy.glb` |
| `greatsword_` | Greatsword | `greatsword_attack_01.glb` through `_03.glb`, `greatsword_heavy.glb` |
| `bow_` | Recurve Bow / Arrow Set | `bow_draw.glb`, `bow_release.glb`, `bow_rapid.glb` |
| `axe_` | War Axe | `axe_attack_01.glb` through `_03.glb`, `axe_heavy.glb` |
| `hammer_` | War Hammer | `hammer_attack_01.glb` through `_03.glb`, `hammer_heavy.glb` |
| `spear_` | Spear | `spear_attack_01.glb` through `_03.glb`, `spear_heavy.glb` |
| `staff_` | Emberwood Staff | `staff_cast_01.glb`, `staff_cast_02.glb`, `staff_channel.glb` |

## Universal Combat Animations (all weapon types)

| File | Loop | Description |
|------|------|-------------|
| `dodge_roll_forward.glb` | No | Forward dodge roll |
| `dodge_roll_back.glb` | No | Backward dodge roll |
| `dodge_roll_left.glb` | No | Left dodge roll |
| `dodge_roll_right.glb` | No | Right dodge roll |
| `block_start.glb` | No | Raise guard |
| `block_hold.glb` | Yes | Holding block |
| `block_impact.glb` | No | Stagger while blocking |
| `parry.glb` | No | Perfect timing deflect |
| `hit_light.glb` | No | Light stagger from hit |
| `hit_heavy.glb` | No | Heavy stagger/knockback |
| `death_01.glb` | No | Death fall (variant 1) |
| `death_02.glb` | No | Death fall (variant 2) |
| `revive.glb` | No | Getting back up |
