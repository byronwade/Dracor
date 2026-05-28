# Visual Effects

Particle system configs and custom shader files.

```
vfx/
  particles/     Particle system JSON configs and sprite textures
  shaders/       Custom GLSL shader fragments
```

## Particles

Particle systems can be defined as JSON configs that Babylon.js loads at runtime, or as sprite textures used by code-defined particle systems.

### Needed Particle Effects

| File | Description |
|------|-------------|
| `ember_trail.json` | Floating ember particles for Ember Memory aura |
| `stone_dust.json` | Dust/rock particles for Stone Memory effects |
| `storm_sparks.json` | Electric sparks for Storm Memory |
| `blood_splatter.json` | Hit impact blood effect |
| `dust_footstep.json` | Small dust puff on footstep |
| `heal_glow.json` | Healing effect rising particles |
| `levelup_burst.json` | Level up celebration burst |
| `torch_flame.json` | Torch/brazier fire particles |
| `campfire.json` | Campfire particle system |
| `fog_ground.json` | Low-lying ground fog |

## Shaders

Custom GLSL fragments for specialized rendering:

| File | Description |
|------|-------------|
| `water.glsl` | Water surface shader (reflections, waves) |
| `foliage_wind.glsl` | Wind-animated foliage vertex shader |
| `dissolve.glsl` | Death/spawn dissolve effect |
| `outline.glsl` | Target/interact outline highlight |
