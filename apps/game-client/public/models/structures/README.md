# Structure Models

Buildings, ruins, shrines, bridges, gates, and other constructed world objects.

```
structures/
  buildings/     Houses, shops, taverns, barracks
  ruins/         Collapsed walls, broken towers, ancient foundations
  shrines/       Dragon memory shrines, altars, monuments
  bridges/       Stone bridges, wooden crossings
```

## Naming Convention

`{structure_type}_{variant}.glb` — e.g., `house_stone_01.glb`, `shrine_ember.glb`, `bridge_broken.glb`

## Requirements

- Max 15,000 triangles per structure
- Use modular pieces where possible (wall segments, roof tiles) for reuse
- Include collision mesh as a separate low-poly mesh named `{name}_collider`
- Shrines and interactable structures need an `interact_point` bone
