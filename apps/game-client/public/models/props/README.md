# Prop Models

World objects: containers, furniture, light sources, signs, interactables.

```
props/
  containers/    Crates, barrels, chests, sacks, urns
  furniture/     Tables, chairs, benches, beds, shelves
  lighting/      Torches, lanterns, braziers, campfires
  signs/         Signposts, banners, notice boards
```

## Naming Convention

`{object_name}.glb` — e.g., `crate_wooden_01.glb`, `torch_wall.glb`, `chest_iron.glb`

Number variants with `_01`, `_02` for visual diversity.

## Requirements

- Small props (crates, pots): max 500 triangles
- Medium props (tables, market stalls): max 3,000 triangles
- Interactable props should include an `interact_point` bone/empty at the interaction position
- Containers that open need open/closed states (two meshes or blend shape)
