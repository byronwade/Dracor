# Babylon.js 9 + Havok Physics Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Dracor game client from Babylon.js 7.x to 9.x, add Havok physics for proper character/terrain collision, and integrate Babylon 9's Physically Based Atmosphere addon to replace the hand-built sky/lighting system.

**Architecture:** Three-phase upgrade. Phase 1 bumps Babylon versions and fixes breaking imports. Phase 2 adds Havok physics with a PhysicsCharacterController replacing the kinematic motor. Phase 3 replaces the HDR skybox atmosphere with Babylon 9's native Atmosphere addon. Each phase produces a working build.

**Tech Stack:** Babylon.js 9.9.x, @babylonjs/havok (Havok WASM), @babylonjs/addons (Atmosphere), existing @dracor/physics-core and @dracor/atmosphere packages.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/game-client/package.json` | Modify | Version bumps + new deps |
| `apps/game-client/src/game/GameApp.ts` | Modify | Physics init, atmosphere wiring |
| `apps/game-client/src/game/PlayerController.ts` | Modify | Havok PhysicsCharacterController |
| `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts` | Modify | Physics bodies for terrain, atmosphere |
| `apps/game-client/src/atmosphere/BabylonAtmosphereRenderer.ts` | Modify | Swap HDR skybox for Babylon Atmosphere |
| `apps/game-client/src/world/modelLoader.ts` | Modify | Fix LoadAssetContainerAsync import if changed |
| `apps/game-client/src/world/createSkyAndAtmosphere.ts` | Delete | Replaced by Babylon Atmosphere addon |
| `apps/game-client/src/streaming/ChunkedTerrainManager.ts` | Modify | Add physics bodies to terrain chunks |

---

### Task 1: Upgrade Babylon.js packages from 7.x to 9.x

**Files:**
- Modify: `apps/game-client/package.json`

- [ ] **Step 1: Update all @babylonjs packages to 9.x**

```bash
cd /Users/byronwade/Dracor
pnpm --filter @dracor/game-client remove @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/materials
pnpm --filter @dracor/game-client add @babylonjs/core@^9.0.0 @babylonjs/gui@^9.0.0 @babylonjs/loaders@^9.0.0 @babylonjs/materials@^9.0.0
```

- [ ] **Step 2: Add Havok and Addons packages**

```bash
pnpm --filter @dracor/game-client add @babylonjs/havok @babylonjs/addons@^9.0.0
```

- [ ] **Step 3: Run typecheck to find all breaking import issues**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | head -60
```

Expected: Multiple type errors from changed import paths, renamed APIs, or removed exports. These get fixed in Task 2.

- [ ] **Step 4: Commit dependency changes**

```bash
git add apps/game-client/package.json pnpm-lock.yaml
git commit -m "chore: upgrade babylon.js from 7.x to 9.x, add havok + addons"
```

---

### Task 2: Fix all Babylon 9 breaking imports

**Files:**
- Modify: Every file under `apps/game-client/src/` that imports from `@babylonjs/*`

Key breaking changes between Babylon 7 and 9:
- `registerBuiltInLoaders` may move from `@babylonjs/loaders/dynamic` to `@babylonjs/loaders`
- `LoadAssetContainerAsync` may require different import path
- `SceneInstrumentation` / `EngineInstrumentation` may be renamed or moved
- `DefaultRenderingPipeline` may require Frame Graph import
- `ShadowGenerator` may need shadow component side-effect import

- [ ] **Step 1: Run typecheck and log all errors**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | grep "error TS" | sort -u > /tmp/babylon9-errors.txt
cat /tmp/babylon9-errors.txt
```

- [ ] **Step 2: Fix each import error systematically**

For each error, check the Babylon 9 docs for the new import path. Common patterns:
- If a deep import like `@babylonjs/core/Foo/bar` no longer resolves, try importing from `@babylonjs/core` directly
- If a class was renamed, search the Babylon 9 changelog
- Side-effect imports (`import '@babylonjs/core/...'`) may need updating

- [ ] **Step 3: Verify typecheck passes clean**

```bash
pnpm --filter @dracor/game-client typecheck
```

Expected: No errors.

- [ ] **Step 4: Verify build succeeds**

```bash
pnpm --filter @dracor/game-client build 2>&1 | tail -5
```

Expected: Build completes with no errors.

- [ ] **Step 5: Test in browser — open localhost:5173, verify the game loads and renders**

Check: terrain visible, character visible, camera works, trees render. Some visual differences are expected (Babylon 9 has different default PBR behavior).

- [ ] **Step 6: Commit**

```bash
git add -A apps/game-client/src/
git commit -m "fix: resolve all babylon 9 import and API changes"
```

---

### Task 3: Initialize Havok Physics engine

**Files:**
- Modify: `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts`
- Modify: `apps/game-client/src/game/GameApp.ts`

- [ ] **Step 1: Import and initialize Havok in the scene builder**

In `IronvaleOutskirtsScene.ts`, add Havok initialization before any physics bodies are created:

```typescript
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

// Inside buildIronvaleOutskirtsScene, before terrain:
const havokInstance = await HavokPhysics();
const havokPlugin = new HavokPlugin(true, havokInstance);
scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
```

- [ ] **Step 2: Verify physics engine initializes without crashing**

```bash
pnpm --filter @dracor/game-client typecheck
```

Then open browser, check console for `[Havok] Physics engine initialized` or similar. No crash = success.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/scenes/IronvaleOutskirtsScene.ts
git commit -m "feat: initialize havok physics engine in scene"
```

---

### Task 4: Add physics bodies to terrain chunks

**Files:**
- Modify: `apps/game-client/src/streaming/ChunkedTerrainManager.ts`

- [ ] **Step 1: Add a static physics body to each terrain chunk**

After creating the ground mesh in `loadChunk()`, add a physics body:

```typescript
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsShapeMesh } from '@babylonjs/core/Physics/v2/physicsShape';

// After mesh.freezeWorldMatrix():
const shape = new PhysicsShapeMesh(mesh, scene);
const body = new PhysicsBody(mesh, PhysicsMotionType.STATIC, false, scene);
body.shape = shape;
```

Store the body reference in `LoadedChunk` for disposal:

```typescript
interface LoadedChunk {
  mesh: Mesh;
  body: PhysicsBody | null;
  gridX: number;
  gridZ: number;
  subdivisions: number;
}
```

- [ ] **Step 2: Dispose physics body on chunk unload**

In `unloadChunk()`:

```typescript
if (chunk.body) chunk.body.dispose();
```

- [ ] **Step 3: Verify terrain has collision**

Open browser, check that the physics debug viewer (if enabled) shows terrain collision shapes. The character won't use physics yet — that's Task 5.

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/streaming/ChunkedTerrainManager.ts
git commit -m "feat: add havok static physics bodies to terrain chunks"
```

---

### Task 5: Replace kinematic player with PhysicsCharacterController

**Files:**
- Modify: `apps/game-client/src/game/PlayerController.ts`

This is the most impactful task. Replace the hand-rolled kinematic motor (heightmap snapping, manual gravity, slope detection) with Havok's PhysicsCharacterController which handles all of that automatically via the physics engine.

- [ ] **Step 1: Import PhysicsCharacterController**

```typescript
import { PhysicsCharacterController } from '@babylonjs/core/Physics/v2/physicsCharacterController';
```

- [ ] **Step 2: Replace the motor initialization**

Remove the `MotorState` interface and all manual physics code. Replace with:

```typescript
private characterController: PhysicsCharacterController;

constructor(scene: Scene, spawnX: number, spawnY: number, spawnZ: number, ...) {
  const h = 1.8; // capsule height
  const r = 0.4; // capsule radius
  const spawnPos = new Vector3(spawnX, spawnY + h / 2, spawnZ);
  this.characterController = new PhysicsCharacterController(spawnPos, { capsuleHeight: h, capsuleRadius: r }, scene);
  
  // Build visual mesh
  const { root } = buildCharacterModel(scene, race, weapon, 'local');
  this.mesh = root;
}
```

- [ ] **Step 3: Replace update() to use character controller**

The character controller needs velocity set each frame:

```typescript
update(input: InputState, dt: number): void {
  // Compute desired velocity from input + camera yaw (same math as before)
  const desiredVelocity = this.computeDesiredVelocity(input, dt);
  
  // Let Havok handle gravity, ground detection, slope limiting
  this.characterController.setVelocity(desiredVelocity);
  
  // Read back position from physics
  const pos = this.characterController.getPosition();
  this.mesh.position.set(pos.x, pos.y - 0.9, pos.z); // offset for capsule center vs feet
  
  // Yaw
  this.mesh.rotation.y = this.motor.visualYaw;
  
  this.maybeSendNetwork(input, dt);
}
```

- [ ] **Step 4: Remove old physics methods**

Delete: `computeSlope()`, `applyPhysics()`, `groundSnap()`, `detectLanding()`. These are all handled by Havok now.

Keep: `applyInput()` (computes desired velocity), `syncMeshToMotor()` (smooth mesh interpolation), `maybeSendNetwork()`.

- [ ] **Step 5: Update `isMoving()`, `getPosition()`, `isSprinting()` to read from character controller**

```typescript
getPosition(): { x: number; y: number; z: number } {
  const p = this.characterController.getPosition();
  return { x: p.x, y: p.y, z: p.z };
}
```

- [ ] **Step 6: Verify in browser**

Character should:
- Stand on terrain without falling through
- Walk on slopes naturally (Havok handles slope limits)
- Jump and land with proper gravity
- Collide with terrain chunk edges seamlessly

- [ ] **Step 7: Commit**

```bash
git add apps/game-client/src/game/PlayerController.ts
git commit -m "feat: replace kinematic motor with havok PhysicsCharacterController"
```

---

### Task 6: Integrate Babylon 9 Atmosphere addon

**Files:**
- Modify: `apps/game-client/src/atmosphere/BabylonAtmosphereRenderer.ts`
- Modify: `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts`
- Modify: `apps/game-client/src/game/GameApp.ts`

The Babylon 9 Atmosphere addon (`@babylonjs/addons`) provides physically-based atmospheric scattering (Rayleigh + Mie) that replaces the HDR skybox approach.

- [ ] **Step 1: Check if the Atmosphere addon API exists in the installed version**

```typescript
// Test import:
import { Atmosphere } from '@babylonjs/addons/atmosphere';
```

If this import doesn't resolve, check `@babylonjs/addons` exports:
```bash
ls node_modules/@babylonjs/addons/atmosphere/ 2>/dev/null || echo "No atmosphere directory"
```

- [ ] **Step 2: Replace HDR skybox with Babylon Atmosphere**

In `BabylonAtmosphereRenderer.ts`, replace the constructor:

```typescript
import { Atmosphere } from '@babylonjs/addons/atmosphere';

constructor(scene: Scene) {
  this.scene = scene;
  
  // Babylon 9 Physically Based Atmosphere
  this.atmosphere = new Atmosphere(scene, {
    // Customize scattering parameters for dark fantasy look
    rayleighScaleHeight: 8500,
    mieScaleHeight: 1200,
    sunIntensity: 15,
  });
  
  // Sun light is managed by the atmosphere
  this.sunLight = this.atmosphere.light;
  
  // Keep ambient light for fill
  this.ambientLight = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  this.ambientLight.intensity = 0.15;
}
```

- [ ] **Step 3: Update the `update()` method to drive the atmosphere**

```typescript
update(state: AtmosphereState): void {
  // Set sun position from the @dracor/atmosphere engine
  const sunDir = toVec3(state.sky.sunDirection);
  this.atmosphere.sunDirection = sunDir.negate(); // Babylon atmosphere uses direction TO sun
  
  // Fog handled by atmosphere automatically
  // Ambient light from atmosphere state
  this.ambientLight.diffuse = toColor3(state.ambientColor);
  this.ambientLight.intensity = state.ambientIntensity * 0.3;
}
```

- [ ] **Step 4: Remove the old HDR skybox code**

Delete the `HDRCubeTexture`, `createDefaultSkybox`, and related code from the constructor.

- [ ] **Step 5: Verify in browser**

Sky should show physically-based atmospheric scattering — blue sky at noon, orange/red at sunset, dark blue at night. Fog should integrate with the atmosphere automatically.

- [ ] **Step 6: Commit**

```bash
git add apps/game-client/src/atmosphere/BabylonAtmosphereRenderer.ts
git commit -m "feat: replace HDR skybox with babylon 9 atmosphere addon"
```

---

### Task 7: Clean up and final verification

**Files:**
- Modify: Various (cleanup dead code)

- [ ] **Step 1: Remove `createSkyAndAtmosphere.ts` if no longer imported**

Check if any file still imports it:
```bash
grep -rn "createSkyAndAtmosphere" apps/game-client/src/
```

If only the streaming manager imports it, and the atmosphere is now handled by `BabylonAtmosphereRenderer`, remove the import and the file.

- [ ] **Step 2: Remove `getHeightAt` from PlayerController if no longer needed**

With Havok physics, the player doesn't need the heightmap function — physics handles ground detection. Remove the `getHeightAt` parameter from the constructor if it's unused.

- [ ] **Step 3: Full typecheck and build**

```bash
pnpm --filter @dracor/game-client typecheck && pnpm --filter @dracor/game-client build
```

- [ ] **Step 4: Full browser test**

Verify all of:
- [ ] Game loads without console errors
- [ ] Terrain renders with all 25 chunks
- [ ] Character stands on terrain, walks, jumps
- [ ] Camera follows character smoothly
- [ ] Sky shows atmospheric scattering
- [ ] Day/night cycle works
- [ ] Foliage renders with wind animation
- [ ] Multiplayer connection works
- [ ] Chat works
- [ ] FPS is acceptable (>30fps)
- [ ] No physics objects falling through terrain

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete babylon 9 + havok + atmosphere upgrade"
```
