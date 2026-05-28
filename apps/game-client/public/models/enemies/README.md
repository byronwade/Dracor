# Enemy Models

Hostile creatures and NPCs organized by type.

```
enemies/
  beasts/        Animals and monsters (wolves, boars, drakes)
  humanoid/      Bandits, cultists, corrupted warriors
  bosses/        Unique boss encounters (higher poly budget)
```

## Naming Convention

`{enemy_name}.glb` — e.g., `road_wolf.glb`, `bandit_archer.glb`, `drake_juvenile.glb`

## Requirements

- Common enemies: max 10,000 triangles
- Bosses: max 30,000 triangles
- Must include skeleton if animated
- Skeleton can be unique per enemy type (not shared with player rig)
- Include at least an idle animation baked into the file
