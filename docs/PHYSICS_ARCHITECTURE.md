# Physics Architecture

## Goals

The physics system serves gameplay, not simulation. It needs to do four things well:

1. Smooth character movement on terrain
2. Reliable ground detection and slope handling
3. Trigger volumes for gameplay events
4. Identical behavior on client and server

Everything else is future work.

## Start with a Kinematic Motor

The character controller is a kinematic motor, not a rigid body simulation. The motor directly controls position and velocity using game logic rather than force application.

Why kinematic:

- **Deterministic:** Same inputs produce same outputs every time. Critical for client/server agreement
- **Simple:** No physics solver, no constraint system, no integration errors
- **Predictable:** Character movement feels identical to input. No sliding, no unexpected collisions pushing the player
- **Portable:** Runs in any JavaScript environment. No WASM dependency. No native bindings

## Why Not a Full Physics Engine Yet

Browser physics engines (Ammo.js, Cannon.js, Rapier WASM) add 200KB-1MB to the bundle and introduce complexity that is unnecessary for current gameplay:

- Movement does not need rigid body dynamics
- There are no physics puzzles
- There are no ragdolls
- Projectiles can use simple ray or sphere casting
- Terrain collision is a height lookup, not a mesh collider

The kinematic motor handles current needs at a fraction of the cost.

## CharacterMotor

The motor lives in `packages/physics-core/src/CharacterMotor.ts`.

State per character:

| Field | Type | Description |
|-------|------|-------------|
| position | {x, y, z} | World position |
| velocity | {x, y, z} | Current velocity vector |
| grounded | boolean | Whether the character is on the ground |
| groundNormal | {x, y, z} | Surface normal at contact point |

Per-tick update:

1. Apply gravity to velocity (if not grounded)
2. Apply input direction to velocity (scaled by move speed, sprint multiplier)
3. Apply ground snap — query terrain height at (x, z) and clamp y
4. Check slope angle against limit (45 degrees). If too steep, slide downhill
5. Handle jump: if grounded and jump input, set upward velocity
6. Clamp velocity to max speed
7. Integrate position += velocity * dt
8. Clear input flags

## Collision Layers

Objects are categorized into collision layers for filtering:

| Layer | Bit | Collides With |
|-------|-----|---------------|
| Terrain | 0 | Player, NPC, Enemy, Projectile |
| Player | 1 | Terrain, Trigger, Interactable, Static |
| NPC | 2 | Terrain, Static |
| Enemy | 3 | Terrain, Player, Projectile, Static |
| Projectile | 4 | Terrain, Enemy, Static |
| Trigger | 5 | Player |
| Interactable | 6 | Player |
| Static | 7 | Player, NPC, Enemy, Projectile |

Layer collision is checked via bitmask. Two objects collide only if their layers are mutually included.

## Terrain Collision

Terrain collision uses a height sampler function rather than mesh collision:

```
function getTerrainHeight(x: number, z: number): number
```

The function queries the terrain chunk at (x, z) and returns the ground height. The character motor uses this to:

- Snap the character to the ground when grounded
- Detect whether the character is above or below terrain
- Sample the surface normal for slope calculations

This is O(1) per query (direct heightmap lookup) rather than O(n) mesh raycasting.

## Trigger Volumes

Triggers are simple geometric shapes that fire events when a player enters or exits:

| Shape | Parameters | Use Case |
|-------|-----------|----------|
| Sphere | center, radius | NPC interaction range, enemy aggro range |
| Box | center, halfExtents | Zone boundaries, building interiors, event areas |

Trigger checks happen every tick on the server. The server maintains a set of active triggers per player and fires `onEnter` / `onExit` events when membership changes.

Triggers do not affect physics. They are sensors only.

## Interactables

Interactables are a special category of trigger that also activates a UI prompt on the client:

- Player enters interactable range -> client shows "Press E to interact" prompt
- Player presses interact key -> client sends interact message to server
- Server validates proximity and executes the interaction (open contract board, talk to NPC, activate shrine)

Interactables have a cooldown to prevent spam.

## Server/Client Separation

Both server and client import the same `CharacterMotor` code from `physics-core`:

- **Server:** Processes queued inputs each tick, runs the motor, broadcasts authoritative positions
- **Client:** (Future) Predicts local movement immediately using the same motor, then reconciles when server state arrives

The motor is a pure function of (current state, input, dt). No randomness. No side effects. This ensures client prediction matches server simulation.

## Future: Havok or Rapier Integration

When gameplay requires physics beyond kinematic movement:

- **Combat projectiles** with arcs and bouncing
- **Ragdoll** on enemy death
- **Physics puzzles** (pushing objects, breaking structures)
- **Destructible environment elements**

At that point, integrate a WASM physics engine (Havok for Babylon.js or Rapier for a standalone solver). The `CharacterMotor` interface stays the same — the motor just delegates ground queries and collision checks to the physics engine instead of the height sampler.

## Why Not Physics for Everything

Most game objects do not need physics simulation:

- **NPCs:** Stand in fixed positions or follow scripted paths. No physics needed
- **Trees and rocks:** Static decoration. No physics needed
- **Items on ground:** Static mesh at a fixed position. No physics needed
- **Buildings:** Static geometry. No physics needed
- **UI elements:** Not physical objects

Only characters, projectiles, and explicitly interactive objects need physics processing. Everything else is visual only.
