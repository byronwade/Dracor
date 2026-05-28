# Models

All 3D models in GLB format (glTF Binary). Draco compression recommended.

```
models/
  characters/       Playable race models (one folder per race)
  weapons/          Weapon models by type
  armor/            Armor and equipment sets
  enemies/          Enemy and creature models
  npcs/             Non-player character models
  props/            World props and interactables
  structures/       Buildings, ruins, and constructed objects
  foliage/          Trees, grass, bushes, flowers
  terrain/          Terrain meshes and heightmap data
```

## Character Models

Each race gets its own folder under `characters/`. A complete character needs:

- `{race}.glb` - Base body mesh with skeleton
- `{race}_lod1.glb` - Low-detail version for distant rendering (optional)

Characters are loaded in the character creation screen and in-game. The skeleton must follow the standard Dracor rig naming convention so animations are shared across races.

## Weapon Models

Organized by weapon class. Each weapon is a standalone GLB with an attachment point bone named `grip_point` at the handle.

## Triangle Budgets

| Category | Max Triangles | Notes |
|----------|--------------|-------|
| Player Character | 25,000 | Includes all LOD0 gear slots |
| Weapon | 3,000 | Seen up close, needs detail |
| Armor Piece | 5,000 | Per slot (chest, legs, etc.) |
| Enemy (common) | 10,000 | Most frequent on screen |
| Enemy (boss) | 30,000 | Only one on screen at a time |
| NPC | 8,000 | Stationary or limited movement |
| Prop (small) | 500 | Crates, barrels, pots |
| Prop (large) | 3,000 | Wagons, market stalls |
| Structure | 15,000 | Buildings, bridges |
| Foliage (instance) | 200 | Grass, small plants (instanced thousands of times) |
| Tree | 2,000 | Trunk + canopy, billboard LOD at distance |
