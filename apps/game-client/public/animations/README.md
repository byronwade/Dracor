# Animations

Standalone animation clips in GLB format. Animations are loaded separately from models and applied to character skeletons at runtime via Babylon.js animation groups.

```
animations/
  characters/
    locomotion/    Walk, run, sprint, strafe, jump, fall, land
    combat/        Attack chains, dodge, block, parry, death, hit reactions
    emotes/        Wave, sit, dance, point, cheer, bow
    utility/       Interact, pick up, craft, open, climb
  enemies/         Enemy-specific animations
  npcs/            NPC idle, talk, gesture animations
  props/           Door open/close, chest open, torch flicker
```

## File Naming

`{action}_{variant}.glb`

Examples:
- `walk_forward.glb`, `run_forward.glb`, `sprint_forward.glb`
- `attack_sword_01.glb`, `attack_sword_02.glb`, `attack_sword_03.glb`
- `dodge_roll_left.glb`, `dodge_roll_right.glb`, `dodge_roll_back.glb`
- `emote_wave.glb`, `emote_sit.glb`

## Requirements

- Animations must target the standard character skeleton (see `models/characters/README.md`)
- Export as GLB with only the animation data (no mesh needed, but skeleton must match)
- 30 FPS frame rate
- Looping animations should have matching start/end poses
- Combat animations should include root motion data where applicable
- Attack animations need event markers at the frame where damage should apply

## Animation Priority (blend layers)

| Layer | Priority | Animations |
|-------|----------|------------|
| Base | 0 | Idle, walk, run, sprint |
| Action | 1 | Attack, dodge, block, interact |
| Override | 2 | Death, stagger, knockdown |
| Additive | 3 | Head look, breathing, emotes (upper body) |
