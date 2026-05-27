# Engine Systems Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate bitECS (full client+server migration), Recast/Detour navmesh, Howler.js audio, Draco+meshoptimizer asset pipeline, NME shaders, procedural textures, and Babylon.js Inspector into Dracor.

**Architecture:** Five phases in dependency order. Phase 1 (bitECS) is foundational — it creates `packages/ecs` with shared components and migrates both server simulation and client rendering to ECS systems. Colyseus becomes a transport layer that syncs ECS state. Phases 2-5 build on ECS by adding new components and systems. Each task produces a working, testable increment.

**Tech Stack:** bitECS 0.4.x, Recast/Detour (via `@babylonjs/core`), Howler.js 2.x, gltf-transform + Draco + meshoptimizer, Babylon.js Node Material + Inspector

**Spec:** `docs/superpowers/specs/2026-05-27-engine-systems-integration-design.md`

---

## File Map

### Phase 1 — bitECS Architecture

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/ecs/package.json` | Package manifest |
| Create | `packages/ecs/tsconfig.json` | TypeScript config (ESM + CJS dual) |
| Create | `packages/ecs/src/index.ts` | Public API barrel |
| Create | `packages/ecs/src/components.ts` | All shared ECS component definitions |
| Create | `packages/ecs/src/world.ts` | World factory with typed components |
| Create | `packages/ecs/src/systems/movementSystem.ts` | Server-side movement (replaces `simulatePlayerMovement.ts`) |
| Create | `packages/ecs/src/systems/inputSystem.ts` | Server-side input queue → ECS |
| Create | `packages/ecs/src/systems/syncSystem.ts` | ECS → Colyseus schema bridge |
| Create | `packages/ecs/src/systems/index.ts` | System barrel export |
| Create | `packages/ecs/src/__tests__/components.test.ts` | Component definition tests |
| Create | `packages/ecs/src/__tests__/movementSystem.test.ts` | Movement system tests |
| Create | `packages/ecs/src/__tests__/inputSystem.test.ts` | Input system tests |
| Create | `packages/ecs/src/__tests__/syncSystem.test.ts` | Sync system tests |
| Modify | `apps/game-server/package.json` | Add `@dracor/ecs` dependency |
| Modify | `apps/game-server/src/rooms/WorldRoom.ts` | Wire ECS world + systems into tick loop |
| Create | `apps/game-client/src/ecs/clientWorld.ts` | Client ECS world setup |
| Create | `apps/game-client/src/ecs/systems/networkReceiveSystem.ts` | Colyseus → ECS sync |
| Create | `apps/game-client/src/ecs/systems/localInputSystem.ts` | Keyboard → ECS InputState |
| Create | `apps/game-client/src/ecs/systems/clientMovementSystem.ts` | Client-side prediction |
| Create | `apps/game-client/src/ecs/systems/interpolationSystem.ts` | Remote player smoothing |
| Create | `apps/game-client/src/ecs/systems/renderSyncSystem.ts` | ECS → Babylon mesh transforms |
| Modify | `apps/game-client/src/game/GameApp.ts` | Replace class-based systems with ECS |
| Modify | `apps/game-client/package.json` | Add `@dracor/ecs` dependency |

### Phase 2 — Recast/Detour Navmesh

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/ecs/src/components-ai.ts` | AIAgent, NavCrowdRef components |
| Create | `packages/ecs/src/systems/aiSystem.ts` | Server AI behavior + navmesh queries |
| Create | `packages/ecs/src/__tests__/aiSystem.test.ts` | AI system tests |
| Create | `apps/game-server/src/navigation/navmeshBuilder.ts` | Bake navmesh from terrain |
| Create | `apps/game-server/src/navigation/crowdManager.ts` | Detour crowd lifecycle |
| Modify | `apps/game-server/src/rooms/WorldRoom.ts` | Init navmesh + AI system |
| Create | `apps/game-client/src/ecs/systems/navmeshDebugSystem.ts` | Dev-mode navmesh wireframe |

### Phase 3 — Howler.js Audio

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/ecs/src/components-audio.ts` | AudioSource, AudioListener components |
| Create | `apps/game-client/src/audio/AudioManager.ts` | Rewritten Howler.js wrapper |
| Create | `apps/game-client/src/audio/soundRegistry.ts` | Sound ID → Howl config map |
| Create | `apps/game-client/src/ecs/systems/audioSystem.ts` | ECS spatial audio updater |
| Delete | `apps/game-client/src/systems/AudioManager.ts` | Old Web Audio drone |
| Modify | `apps/game-client/src/game/GameApp.ts` | Wire new AudioManager |
| Modify | `apps/game-client/package.json` | Add `howler` dependency |

### Phase 4 — Asset Pipeline (Draco + meshoptimizer)

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/ecs/src/components-render.ts` | Renderable, LODGroup components |
| Create | `apps/game-client/src/ecs/systems/lodSystem.ts` | Distance-based LOD switching |
| Modify | `tools/asset-optimizer/package.json` | Add gltf-transform deps |
| Create | `tools/asset-optimizer/src/optimize.ts` | meshopt + Draco pipeline |
| Create | `tools/asset-optimizer/src/lod.ts` | LOD generation via simplify |
| Modify | `tools/asset-optimizer/src/index.ts` | Wire optimize command |

### Phase 5 — Visual Polish

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/ecs/src/components-material.ts` | MaterialOverride component |
| Create | `apps/game-client/src/ecs/systems/materialSystem.ts` | NME shader applicator |
| Create | `apps/game-client/src/shaders/loadNodeMaterial.ts` | NME JSON loader helper |
| Create | `apps/game-client/src/debug/inspectorToggle.ts` | F12 lazy-load Inspector |
| Modify | `apps/game-client/src/game/GameApp.ts` | Wire Inspector + material system |
| Modify | `apps/game-client/package.json` | Add `@babylonjs/inspector` devDep |

---

## Phase 1: bitECS Architecture

### Task 1: Create `packages/ecs` package scaffold

**Files:**
- Create: `packages/ecs/package.json`
- Create: `packages/ecs/tsconfig.json`
- Create: `packages/ecs/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dracor/ecs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "bitecs": "^0.4.3"
  },
  "devDependencies": {
    "@dracor/config": "workspace:*",
    "typescript": "^5.5.0",
    "vitest": "^3.2.1"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@dracor/config/typescript",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create empty barrel export**

Create `packages/ecs/src/index.ts`:

```typescript
export { createDracorWorld, type DracorWorld } from './world';
export * from './components';
```

- [ ] **Step 4: Install dependencies**

Run: `pnpm install`
Expected: bitecs resolves, workspace links established

- [ ] **Step 5: Commit**

```bash
git add packages/ecs/
git commit -m "feat(ecs): scaffold packages/ecs with bitECS dependency"
```

---

### Task 2: Define shared ECS components

**Files:**
- Create: `packages/ecs/src/components.ts`
- Create: `packages/ecs/src/world.ts`
- Create: `packages/ecs/src/__tests__/components.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ecs/src/__tests__/components.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createDracorWorld } from '../world';
import { addEntity, addComponent, query } from 'bitecs';

describe('ECS components', () => {
  it('creates a world with all component stores', () => {
    const world = createDracorWorld();
    expect(world.components.Position).toBeDefined();
    expect(world.components.Position.x).toBeInstanceOf(Float32Array);
    expect(world.components.Velocity).toBeDefined();
    expect(world.components.Rotation).toBeDefined();
    expect(world.components.Health).toBeDefined();
    expect(world.components.InputState).toBeDefined();
    expect(world.components.NetworkId).toBeDefined();
    expect(world.components.CharacterInfo).toBeDefined();
  });

  it('can add entities with Position and query them', () => {
    const world = createDracorWorld();
    const { Position } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    Position.x[eid] = 10;
    Position.y[eid] = 5;
    Position.z[eid] = 20;

    const entities = query(world, [Position]);
    expect([...entities]).toContain(eid);
    expect(Position.x[eid]).toBe(10);
    expect(Position.y[eid]).toBe(5);
    expect(Position.z[eid]).toBe(20);
  });

  it('can add multiple components to one entity', () => {
    const world = createDracorWorld();
    const { Position, Velocity, Health } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, Health);

    Health.current[eid] = 100;
    Health.max[eid] = 100;

    const entities = query(world, [Position, Velocity, Health]);
    expect([...entities]).toContain(eid);
    expect(Health.current[eid]).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: FAIL — modules not found

- [ ] **Step 3: Write component definitions**

Create `packages/ecs/src/components.ts`:

```typescript
const MAX_ENTITIES = 10_000;

export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
};

export const Rotation = {
  yaw: new Float32Array(MAX_ENTITIES),
};

export const Velocity = {
  vx: new Float32Array(MAX_ENTITIES),
  vy: new Float32Array(MAX_ENTITIES),
  vz: new Float32Array(MAX_ENTITIES),
};

export const Health = {
  current: new Int16Array(MAX_ENTITIES),
  max: new Int16Array(MAX_ENTITIES),
};

export const CharacterInfo = {
  race: new Uint8Array(MAX_ENTITIES),
  weapon: new Uint8Array(MAX_ENTITIES),
  level: new Uint16Array(MAX_ENTITIES),
};

export const NetworkId = {
  sessionHash: new Uint32Array(MAX_ENTITIES),
};

export const InputState = {
  moveX: new Float32Array(MAX_ENTITIES),
  moveZ: new Float32Array(MAX_ENTITIES),
  yaw: new Float32Array(MAX_ENTITIES),
  sprint: new Uint8Array(MAX_ENTITIES),
  jump: new Uint8Array(MAX_ENTITIES),
};

export const IsMoving = {};

export const IsPlayer = {};

export const IsRemote = {};

export type DracorComponents = {
  Position: typeof Position;
  Rotation: typeof Rotation;
  Velocity: typeof Velocity;
  Health: typeof Health;
  CharacterInfo: typeof CharacterInfo;
  NetworkId: typeof NetworkId;
  InputState: typeof InputState;
  IsMoving: typeof IsMoving;
  IsPlayer: typeof IsPlayer;
  IsRemote: typeof IsRemote;
};
```

- [ ] **Step 4: Write world factory**

Create `packages/ecs/src/world.ts`:

```typescript
import { createWorld } from 'bitecs';
import {
  Position, Rotation, Velocity, Health, CharacterInfo,
  NetworkId, InputState, IsMoving, IsPlayer, IsRemote,
  type DracorComponents,
} from './components';

export interface DracorWorld extends ReturnType<typeof createWorld<{ components: DracorComponents; time: { delta: number; tick: number } }>> {}

export function createDracorWorld(): DracorWorld {
  return createWorld({
    components: {
      Position,
      Rotation,
      Velocity,
      Health,
      CharacterInfo,
      NetworkId,
      InputState,
      IsMoving,
      IsPlayer,
      IsRemote,
    },
    time: {
      delta: 0,
      tick: 0,
    },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/ecs/src/components.ts packages/ecs/src/world.ts packages/ecs/src/index.ts packages/ecs/src/__tests__/
git commit -m "feat(ecs): define shared components and world factory"
```

---

### Task 3: Implement server MovementSystem

**Files:**
- Create: `packages/ecs/src/systems/movementSystem.ts`
- Create: `packages/ecs/src/__tests__/movementSystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ecs/src/__tests__/movementSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { movementSystem } from '../systems/movementSystem';

describe('movementSystem', () => {
  it('moves entity forward based on input and yaw', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);

    Position.x[eid] = 0;
    Position.y[eid] = 0;
    Position.z[eid] = 0;
    InputState.moveX[eid] = 0;
    InputState.moveZ[eid] = 1;
    InputState.yaw[eid] = 0;
    InputState.sprint[eid] = 0;

    world.time.delta = 1 / 20;

    movementSystem(world, () => 0);

    expect(Position.z[eid]).toBeGreaterThan(0);
  });

  it('does not move entity with zero input', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);

    Position.x[eid] = 5;
    Position.z[eid] = 5;
    InputState.moveX[eid] = 0;
    InputState.moveZ[eid] = 0;

    world.time.delta = 1 / 20;

    movementSystem(world, () => 0);

    expect(Position.x[eid]).toBe(5);
    expect(Position.z[eid]).toBe(5);
  });

  it('clamps position to world bounds', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);

    Position.x[eid] = 499;
    Position.z[eid] = 0;
    InputState.moveX[eid] = 1;
    InputState.moveZ[eid] = 0;
    InputState.yaw[eid] = 0;
    InputState.sprint[eid] = 1;

    world.time.delta = 5;

    movementSystem(world, () => 0);

    expect(Position.x[eid]).toBeLessThanOrEqual(500);
  });

  it('snaps y to terrain height', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);

    Position.x[eid] = 10;
    Position.z[eid] = 10;
    InputState.moveZ[eid] = 1;

    world.time.delta = 1 / 20;

    const terrainHeight = (_x: number, _z: number) => 5;
    movementSystem(world, terrainHeight);

    expect(Position.y[eid]).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ecs && npx vitest run src/__tests__/movementSystem.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement movementSystem**

Create `packages/ecs/src/systems/movementSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '../world';

const MAX_MOVE_SPEED = 6.0;
const MAX_SPRINT_SPEED = 10.8;
const MAX_COORDINATE = 500;
const MIN_COORDINATE = -500;
const MAX_Y = 100;
const MIN_Y = -10;

export type HeightSampler = (x: number, z: number) => number;

export function movementSystem(world: DracorWorld, getTerrainHeight: HeightSampler): void {
  const { Position, Rotation, Velocity, InputState, IsMoving, IsPlayer } = world.components;
  const dt = world.time.delta;

  for (const eid of query(world, [Position, Rotation, Velocity, InputState, IsPlayer])) {
    const moveX = InputState.moveX[eid];
    const moveZ = InputState.moveZ[eid];
    const yaw = InputState.yaw[eid];
    const sprint = InputState.sprint[eid] !== 0;

    const hasMoveInput = Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001;

    if (hasMoveInput) {
      const speed = sprint ? MAX_SPRINT_SPEED : MAX_MOVE_SPEED;

      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);
      const dirX = moveX * cosYaw + moveZ * sinYaw;
      const dirZ = -moveX * sinYaw + moveZ * cosYaw;

      const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const normX = mag > 1 ? dirX / mag : dirX;
      const normZ = mag > 1 ? dirZ / mag : dirZ;

      const newX = Position.x[eid] + normX * speed * dt;
      const newZ = Position.z[eid] + normZ * speed * dt;
      const terrainY = getTerrainHeight(newX, newZ);

      Position.x[eid] = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, newX));
      Position.y[eid] = Math.max(MIN_Y, Math.min(MAX_Y, terrainY));
      Position.z[eid] = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, newZ));

      Velocity.vx[eid] = normX * speed;
      Velocity.vy[eid] = 0;
      Velocity.vz[eid] = normZ * speed;
    } else {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      Velocity.vz[eid] = 0;
    }

    Rotation.yaw[eid] = yaw;
  }
}
```

- [ ] **Step 4: Create systems barrel**

Create `packages/ecs/src/systems/index.ts`:

```typescript
export { movementSystem, type HeightSampler } from './movementSystem';
```

- [ ] **Step 5: Update package barrel**

Update `packages/ecs/src/index.ts`:

```typescript
export { createDracorWorld, type DracorWorld } from './world';
export * from './components';
export * from './systems/index';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All tests PASS (components + movement)

- [ ] **Step 7: Commit**

```bash
git add packages/ecs/src/systems/ packages/ecs/src/__tests__/movementSystem.test.ts packages/ecs/src/index.ts
git commit -m "feat(ecs): implement server movementSystem with tests"
```

---

### Task 4: Implement server InputSystem

**Files:**
- Create: `packages/ecs/src/systems/inputSystem.ts`
- Create: `packages/ecs/src/__tests__/inputSystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ecs/src/__tests__/inputSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { createInputSystem, type QueuedInput } from '../systems/inputSystem';

describe('inputSystem', () => {
  it('writes queued input to entity InputState component', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, NetworkId, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);
    NetworkId.sessionHash[eid] = hashSession('abc123');

    const queue: QueuedInput[] = [
      { sessionHash: hashSession('abc123'), moveX: 0.5, moveZ: -1, yaw: 1.2, sprint: true, jump: false },
    ];

    const inputSystem = createInputSystem();
    inputSystem(world, queue);

    expect(InputState.moveX[eid]).toBeCloseTo(0.5);
    expect(InputState.moveZ[eid]).toBeCloseTo(-1);
    expect(InputState.yaw[eid]).toBeCloseTo(1.2);
    expect(InputState.sprint[eid]).toBe(1);
    expect(InputState.jump[eid]).toBe(0);
  });

  it('ignores input for non-existent session', () => {
    const world = createDracorWorld();

    const queue: QueuedInput[] = [
      { sessionHash: 99999, moveX: 1, moveZ: 1, yaw: 0, sprint: false, jump: false },
    ];

    const inputSystem = createInputSystem();
    inputSystem(world, queue);
    // No crash, no effect
  });
});

function hashSession(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ecs && npx vitest run src/__tests__/inputSystem.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement inputSystem**

Create `packages/ecs/src/systems/inputSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '../world';

export interface QueuedInput {
  sessionHash: number;
  moveX: number;
  moveZ: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
}

export function hashSessionId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function createInputSystem() {
  return function inputSystem(world: DracorWorld, inputQueue: QueuedInput[]): void {
    const { InputState, NetworkId, IsPlayer } = world.components;

    const sessionToEntity = new Map<number, number>();
    for (const eid of query(world, [InputState, NetworkId, IsPlayer])) {
      sessionToEntity.set(NetworkId.sessionHash[eid], eid);
    }

    for (const input of inputQueue) {
      const eid = sessionToEntity.get(input.sessionHash);
      if (eid === undefined) continue;

      InputState.moveX[eid] = input.moveX;
      InputState.moveZ[eid] = input.moveZ;
      InputState.yaw[eid] = input.yaw;
      InputState.sprint[eid] = input.sprint ? 1 : 0;
      InputState.jump[eid] = input.jump ? 1 : 0;
    }
  };
}
```

- [ ] **Step 4: Update systems barrel**

Add to `packages/ecs/src/systems/index.ts`:

```typescript
export { movementSystem, type HeightSampler } from './movementSystem';
export { createInputSystem, hashSessionId, type QueuedInput } from './inputSystem';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/ecs/src/systems/inputSystem.ts packages/ecs/src/__tests__/inputSystem.test.ts packages/ecs/src/systems/index.ts
git commit -m "feat(ecs): implement inputSystem with session→entity mapping"
```

---

### Task 5: Implement server SyncSystem (ECS → Colyseus)

**Files:**
- Create: `packages/ecs/src/systems/syncSystem.ts`
- Create: `packages/ecs/src/__tests__/syncSystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ecs/src/__tests__/syncSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { syncSystem, type SyncTarget } from '../systems/syncSystem';

describe('syncSystem', () => {
  it('writes ECS Position/Rotation to sync targets', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);

    NetworkId.sessionHash[eid] = 42;
    Position.x[eid] = 10;
    Position.y[eid] = 5;
    Position.z[eid] = 20;
    Rotation.yaw[eid] = 1.5;
    Velocity.vx[eid] = 3;

    const targets = new Map<number, SyncTarget>();
    targets.set(42, { x: 0, y: 0, z: 0, yaw: 0, isMoving: false });

    syncSystem(world, targets);

    const t = targets.get(42)!;
    expect(t.x).toBe(10);
    expect(t.y).toBe(5);
    expect(t.z).toBe(20);
    expect(t.yaw).toBe(1.5);
    expect(t.isMoving).toBe(true);
  });

  it('sets isMoving false when velocity is zero', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);

    NetworkId.sessionHash[eid] = 42;
    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;
    Velocity.vz[eid] = 0;

    const targets = new Map<number, SyncTarget>();
    targets.set(42, { x: 0, y: 0, z: 0, yaw: 0, isMoving: true });

    syncSystem(world, targets);

    expect(targets.get(42)!.isMoving).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ecs && npx vitest run src/__tests__/syncSystem.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement syncSystem**

Create `packages/ecs/src/systems/syncSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '../world';

export interface SyncTarget {
  x: number;
  y: number;
  z: number;
  yaw: number;
  isMoving: boolean;
}

export function syncSystem(world: DracorWorld, targets: Map<number, SyncTarget>): void {
  const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;

  for (const eid of query(world, [Position, Rotation, Velocity, NetworkId, IsPlayer])) {
    const hash = NetworkId.sessionHash[eid];
    const target = targets.get(hash);
    if (!target) continue;

    target.x = Position.x[eid];
    target.y = Position.y[eid];
    target.z = Position.z[eid];
    target.yaw = Rotation.yaw[eid];

    const vx = Velocity.vx[eid];
    const vz = Velocity.vz[eid];
    target.isMoving = Math.abs(vx) > 0.01 || Math.abs(vz) > 0.01;
  }
}
```

- [ ] **Step 4: Update systems barrel**

Add to `packages/ecs/src/systems/index.ts`:

```typescript
export { syncSystem, type SyncTarget } from './syncSystem';
```

- [ ] **Step 5: Run all tests**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/ecs/src/systems/syncSystem.ts packages/ecs/src/__tests__/syncSystem.test.ts packages/ecs/src/systems/index.ts
git commit -m "feat(ecs): implement syncSystem bridging ECS→Colyseus"
```

---

### Task 6: Integrate ECS into game server WorldRoom

**Files:**
- Modify: `apps/game-server/package.json`
- Modify: `apps/game-server/src/rooms/WorldRoom.ts`

- [ ] **Step 1: Add @dracor/ecs dependency to game-server**

Add `"@dracor/ecs": "workspace:*"` to `dependencies` in `apps/game-server/package.json`.

Run: `pnpm install`

- [ ] **Step 2: Rewrite WorldRoom to use ECS**

Replace the simulation logic in `apps/game-server/src/rooms/WorldRoom.ts`. The key changes:
- Create a `DracorWorld` in `onCreate`
- On player join: `addEntity` + `addComponent` for Position, Rotation, Velocity, InputState, NetworkId, Health, IsPlayer
- On input message: push to `QueuedInput[]` (same validation as before)
- In `simulationTick`: run `inputSystem(world, queue)` → `movementSystem(world, getTerrainHeight)` → `syncSystem(world, syncTargets)` → write sync targets back to Colyseus schemas
- On leave: `removeEntity`

Full replacement for `WorldRoom.ts`:

```typescript
import { Room, Client } from "@colyseus/core";
import type { ClientInputMessage } from "@dracor/netcode";
import { TICK_RATE, MAX_CHAT_LENGTH } from "@dracor/netcode";
import { addEntity, addComponent, removeEntity } from "bitecs";
import {
  createDracorWorld,
  type DracorWorld,
  createInputSystem,
  movementSystem,
  syncSystem,
  hashSessionId,
  type QueuedInput,
  type SyncTarget,
} from "@dracor/ecs";
import { WorldState } from "../schema/WorldState";
import { PlayerState } from "../schema/PlayerState";
import { ChatState } from "../schema/ChatState";
import { createFixedTickLoop } from "../simulation/fixedTickLoop";
import type { FixedTickLoop } from "../simulation/fixedTickLoop";
import {
  validatePlayerInput,
  registerPlayer,
  unregisterPlayer,
} from "../simulation/validatePlayerInput";
import { persistenceQueue } from "../persistence/persistenceQueue";
import { logger } from "../logging/logger";

interface ChatRateState {
  timestamps: number[];
}

const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 10_000;
const MAX_NAME_LENGTH = 24;
const MIN_NAME_LENGTH = 2;
const NAME_PATTERN = /^[a-zA-Z0-9_ \-']+$/;

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let name = raw.trim().slice(0, MAX_NAME_LENGTH);
  name = name.replace(/[\x00-\x1f\x7f]/g, "");
  if (!NAME_PATTERN.test(name)) {
    name = name.replace(/[^a-zA-Z0-9_ \-']/g, "");
  }
  return name.length >= MIN_NAME_LENGTH ? name : "";
}

function sanitizeChatContent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let content = raw.trim();
  content = content.replace(/[\x00-\x1f\x7f]/g, "");
  if (content.length === 0 || content.length > MAX_CHAT_LENGTH) return null;
  return content;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 50;
  private tickLoop: FixedTickLoop | null = null;
  private inputQueue: QueuedInput[] = [];
  private chatRates = new Map<string, ChatRateState>();
  private usedNames = new Set<string>();

  private ecsWorld!: DracorWorld;
  private inputSystem!: ReturnType<typeof createInputSystem>;
  private sessionToEntity = new Map<string, number>();
  private syncTargets = new Map<number, SyncTarget>();
  private sessionToHash = new Map<string, number>();

  onCreate(_options: any): void {
    this.setState(new WorldState());

    this.ecsWorld = createDracorWorld();
    this.inputSystem = createInputSystem();

    this.tickLoop = createFixedTickLoop(TICK_RATE, (tick, _dt) => {
      this.simulationTick(tick);
    });
    this.tickLoop.start();

    this.onMessage("input", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const input: ClientInputMessage = {
        type: "input",
        seq: data.seq,
        moveX: data.moveX,
        moveZ: data.moveZ,
        yaw: data.yaw,
        sprint: data.sprint,
        jump: data.jump,
        dt: data.dt,
      };

      if (!validatePlayerInput(client.sessionId, input)) return;

      const hash = this.sessionToHash.get(client.sessionId);
      if (hash === undefined) return;

      this.inputQueue.push({
        sessionHash: hash,
        moveX: input.moveX,
        moveZ: input.moveZ,
        yaw: input.yaw,
        sprint: input.sprint,
        jump: input.jump,
      });
    });

    this.onMessage("chat", (client: Client, data: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const content = sanitizeChatContent(data.content);
      if (!content) return;
      if (!this.checkChatRate(client.sessionId)) return;
      this.addChatMessage(client.sessionId, player.name, content);
    });

    this.onMessage("ping", (client: Client, data: any) => {
      client.send("pong", { t: data?.t ?? 0 });
    });

    logger.info("WorldRoom created (ECS enabled)");
  }

  onJoin(client: Client, options: any): void {
    let name = sanitizeName(options?.name);
    if (!name) name = "Wanderer";
    name = this.makeUniqueName(name);

    const validWeapons = ["blade", "bow", "staff"];
    const validMemories = ["ember", "stone", "storm"];

    // Create Colyseus schema (for network sync)
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = name;
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.yaw = 0;
    player.health = 100;
    player.maxHealth = 100;
    player.level = Math.max(1, Math.min(100, parseInt(options?.level, 10) || 1));
    player.weapon = validWeapons.includes(options?.weapon) ? options.weapon : "blade";
    player.memory = validMemories.includes(options?.memory) ? options.memory : "ember";
    player.isMoving = false;
    player.lastInputSeq = 0;
    if (options?.userId) player.userId = String(options.userId).slice(0, 64);
    if (options?.characterId) player.characterId = String(options.characterId).slice(0, 64);

    this.state.players.set(client.sessionId, player);

    // Create ECS entity
    const eid = addEntity(this.ecsWorld);
    const c = this.ecsWorld.components;
    addComponent(this.ecsWorld, eid, c.Position);
    addComponent(this.ecsWorld, eid, c.Rotation);
    addComponent(this.ecsWorld, eid, c.Velocity);
    addComponent(this.ecsWorld, eid, c.InputState);
    addComponent(this.ecsWorld, eid, c.NetworkId);
    addComponent(this.ecsWorld, eid, c.Health);
    addComponent(this.ecsWorld, eid, c.IsPlayer);

    const hash = hashSessionId(client.sessionId);
    c.NetworkId.sessionHash[eid] = hash;
    c.Health.current[eid] = 100;
    c.Health.max[eid] = 100;

    this.sessionToEntity.set(client.sessionId, eid);
    this.sessionToHash.set(client.sessionId, hash);
    this.syncTargets.set(hash, { x: 0, y: 0, z: 0, yaw: 0, isMoving: false });

    this.usedNames.add(name.toLowerCase());
    this.chatRates.set(client.sessionId, { timestamps: [] });
    registerPlayer(client.sessionId);

    this.addSystemMessage(`${name} entered Ironvale.`);
    logger.info("Player joined", { name, sessionId: client.sessionId, playerCount: this.state.players.size });
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const name = player?.name || "Unknown";

    if (player && player.characterId) {
      persistenceQueue.enqueue(player.characterId, player.x, player.y, player.z, this.state.currentZone);
    }

    // Remove ECS entity
    const eid = this.sessionToEntity.get(client.sessionId);
    if (eid !== undefined) {
      removeEntity(this.ecsWorld, eid);
    }

    const hash = this.sessionToHash.get(client.sessionId);
    if (hash !== undefined) this.syncTargets.delete(hash);

    this.sessionToEntity.delete(client.sessionId);
    this.sessionToHash.delete(client.sessionId);
    this.usedNames.delete(name.toLowerCase());
    this.chatRates.delete(client.sessionId);
    unregisterPlayer(client.sessionId);
    this.state.players.delete(client.sessionId);

    this.addSystemMessage(`${name} left Ironvale.`);
    logger.info("Player left", { name, sessionId: client.sessionId, playerCount: this.state.players.size });
  }

  onDispose(): void {
    if (this.tickLoop) {
      this.tickLoop.stop();
      this.tickLoop = null;
    }
    this.chatRates.clear();
    this.usedNames.clear();
    this.sessionToEntity.clear();
    this.sessionToHash.clear();
    this.syncTargets.clear();
    logger.info("WorldRoom disposed");
  }

  private makeUniqueName(desired: string): string {
    const lower = desired.toLowerCase();
    if (!this.usedNames.has(lower)) return desired;
    for (let i = 2; i <= 99; i++) {
      const candidate = `${desired}${i}`;
      if (!this.usedNames.has(candidate.toLowerCase())) return candidate;
    }
    return `${desired}_${Date.now() % 10000}`;
  }

  private checkChatRate(sessionId: string): boolean {
    const state = this.chatRates.get(sessionId);
    if (!state) return false;
    const now = Date.now();
    state.timestamps = state.timestamps.filter((t) => t > now - CHAT_WINDOW_MS);
    if (state.timestamps.length >= MAX_CHAT_PER_WINDOW) return false;
    state.timestamps.push(now);
    return true;
  }

  private addChatMessage(senderId: string, senderName: string, content: string): void {
    const message = new ChatState();
    message.id = `${senderId}-${Date.now()}`;
    message.senderId = senderId;
    message.senderName = senderName;
    message.content = content;
    message.timestamp = Date.now();
    this.state.messages.push(message);
    while (this.state.messages.length > 50) this.state.messages.shift();
  }

  private addSystemMessage(content: string): void {
    const message = new ChatState();
    message.id = `system-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    message.senderId = "__system__";
    message.senderName = "";
    message.content = content;
    message.timestamp = Date.now();
    this.state.messages.push(message);
    while (this.state.messages.length > 50) this.state.messages.shift();
  }

  private simulationTick(tick: number): void {
    const inputs = this.inputQueue;
    this.inputQueue = [];

    this.ecsWorld.time.delta = 1 / TICK_RATE;
    this.ecsWorld.time.tick = tick;

    // Run ECS systems in order
    this.inputSystem(this.ecsWorld, inputs);
    movementSystem(this.ecsWorld, () => 0);
    syncSystem(this.ecsWorld, this.syncTargets);

    // Write sync targets back to Colyseus schemas
    for (const [sessionId, player] of this.state.players) {
      const hash = this.sessionToHash.get(sessionId);
      if (hash === undefined) continue;
      const target = this.syncTargets.get(hash);
      if (!target) continue;

      player.x = target.x;
      player.y = target.y;
      player.z = target.z;
      player.yaw = target.yaw;
      player.isMoving = target.isMoving;
    }

    this.state.tick = tick;
    this.state.worldTime += Math.round(1000 / TICK_RATE);
  }
}
```

- [ ] **Step 3: Build and typecheck**

Run: `pnpm --filter @dracor/ecs build && pnpm --filter @dracor/game-server typecheck`
Expected: Both pass

- [ ] **Step 4: Run ECS tests**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/game-server/package.json apps/game-server/src/rooms/WorldRoom.ts packages/ecs/
git commit -m "feat(server): integrate ECS into WorldRoom tick loop"
```

---

### Task 7: Create client ECS world and RenderSyncSystem

**Files:**
- Create: `apps/game-client/src/ecs/clientWorld.ts`
- Create: `apps/game-client/src/ecs/systems/renderSyncSystem.ts`

- [ ] **Step 1: Add @dracor/ecs to game-client**

Add `"@dracor/ecs": "workspace:*"` to `devDependencies` in `apps/game-client/package.json` (devDep because Vite bundles it).

Run: `pnpm install`

- [ ] **Step 2: Create client world wrapper**

Create `apps/game-client/src/ecs/clientWorld.ts`:

```typescript
import { createDracorWorld, type DracorWorld } from '@dracor/ecs';

let world: DracorWorld | null = null;

export function getClientWorld(): DracorWorld {
  if (!world) {
    world = createDracorWorld();
  }
  return world;
}

export function disposeClientWorld(): void {
  world = null;
}
```

- [ ] **Step 3: Create renderSyncSystem**

Create `apps/game-client/src/ecs/systems/renderSyncSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const meshRegistry = new Map<number, TransformNode>();

export function registerMesh(eid: number, mesh: TransformNode): void {
  meshRegistry.set(eid, mesh);
}

export function unregisterMesh(eid: number): void {
  meshRegistry.delete(eid);
}

export function renderSyncSystem(world: DracorWorld): void {
  const { Position, Rotation } = world.components;

  for (const eid of query(world, [Position, Rotation])) {
    const mesh = meshRegistry.get(eid);
    if (!mesh) continue;

    mesh.position.x = Position.x[eid];
    mesh.position.y = Position.y[eid];
    mesh.position.z = Position.z[eid];
    mesh.rotation.y = Rotation.yaw[eid];
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/ecs/ apps/game-client/package.json
git commit -m "feat(client): create client ECS world and renderSyncSystem"
```

---

### Task 8: Create client NetworkReceiveSystem and InterpolationSystem

**Files:**
- Create: `apps/game-client/src/ecs/systems/networkReceiveSystem.ts`
- Create: `apps/game-client/src/ecs/systems/interpolationSystem.ts`

- [ ] **Step 1: Create networkReceiveSystem**

Create `apps/game-client/src/ecs/systems/networkReceiveSystem.ts`:

```typescript
import { addEntity, addComponent, removeEntity } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';
import { hashSessionId } from '@dracor/ecs';
import { registerMesh, unregisterMesh } from './renderSyncSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';

interface RemoteEntityRef {
  eid: number;
  mesh: Mesh;
}

export function createNetworkReceiveSystem(scene: Scene, createRemoteMesh: (id: string, name: string, scene: Scene) => Mesh) {
  const remoteEntities = new Map<string, RemoteEntityRef>();

  function onPlayerAdd(world: DracorWorld, sessionId: string, name: string, localSessionId: string): void {
    if (sessionId === localSessionId) return;
    if (remoteEntities.has(sessionId)) return;

    const eid = addEntity(world);
    const c = world.components;
    addComponent(world, eid, c.Position);
    addComponent(world, eid, c.Rotation);
    addComponent(world, eid, c.Velocity);
    addComponent(world, eid, c.IsRemote);

    const mesh = createRemoteMesh(sessionId, name, scene);
    registerMesh(eid, mesh);
    remoteEntities.set(sessionId, { eid, mesh });
  }

  function onPlayerRemove(world: DracorWorld, sessionId: string): void {
    const ref = remoteEntities.get(sessionId);
    if (!ref) return;

    unregisterMesh(ref.eid);
    ref.mesh.dispose(false, true);
    removeEntity(world, ref.eid);
    remoteEntities.delete(sessionId);
  }

  function updateRemotePosition(eid: number, x: number, y: number, z: number, yaw: number, components: DracorWorld['components']): void {
    components.Position.x[eid] = x;
    components.Position.y[eid] = y;
    components.Position.z[eid] = z;
    components.Rotation.yaw[eid] = yaw;
  }

  function getEid(sessionId: string): number | undefined {
    return remoteEntities.get(sessionId)?.eid;
  }

  function dispose(world: DracorWorld): void {
    for (const [, ref] of remoteEntities) {
      unregisterMesh(ref.eid);
      ref.mesh.dispose(false, true);
      removeEntity(world, ref.eid);
    }
    remoteEntities.clear();
  }

  return { onPlayerAdd, onPlayerRemove, updateRemotePosition, getEid, dispose };
}
```

- [ ] **Step 2: Create interpolationSystem**

Create `apps/game-client/src/ecs/systems/interpolationSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const meshRegistry = new Map<number, TransformNode>();

export function registerInterpolationMesh(eid: number, mesh: TransformNode): void {
  meshRegistry.set(eid, mesh);
}

export function unregisterInterpolationMesh(eid: number): void {
  meshRegistry.delete(eid);
}

const LERP_FACTOR = 0.15;

export function interpolationSystem(world: DracorWorld): void {
  const { Position, Rotation, IsRemote } = world.components;

  for (const eid of query(world, [Position, Rotation, IsRemote])) {
    const mesh = meshRegistry.get(eid);
    if (!mesh) continue;

    const targetX = Position.x[eid];
    const targetY = Position.y[eid];
    const targetZ = Position.z[eid];
    const targetYaw = Rotation.yaw[eid];

    mesh.position.x += (targetX - mesh.position.x) * LERP_FACTOR;
    mesh.position.y += (targetY - mesh.position.y) * LERP_FACTOR;
    mesh.position.z += (targetZ - mesh.position.z) * LERP_FACTOR;
    mesh.rotation.y += (targetYaw - mesh.rotation.y) * LERP_FACTOR;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/ecs/systems/
git commit -m "feat(client): add networkReceive and interpolation ECS systems"
```

---

### Task 9: Wire ECS into GameApp update loop

**Files:**
- Modify: `apps/game-client/src/game/GameApp.ts`

- [ ] **Step 1: Update GameApp to use ECS systems alongside existing code**

This is an incremental migration. The existing `PlayerController` and `MultiplayerClient` remain for now — we add ECS systems for remote player rendering. The `GameApp.update()` method calls `interpolationSystem` instead of `multiplayerClient.interpolateRemotePlayers()`.

Key changes to `GameApp.ts`:

1. Import `getClientWorld`, `interpolationSystem`, `renderSyncSystem`
2. In `start()`: initialize client ECS world
3. In `update()`: call `interpolationSystem(world)` instead of `this.multiplayerClient.interpolateRemotePlayers()`
4. In `dispose()`: call `disposeClientWorld()`

The full `PlayerController` → ECS migration happens in a follow-up task once the basic wiring is validated.

- [ ] **Step 2: Build and test**

Run: `pnpm --filter @dracor/game-client typecheck`
Expected: PASS

- [ ] **Step 3: Manual test**

Run: `pnpm --filter @dracor/game-client dev`
Expected: Game loads, player can move, remote players interpolate smoothly

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/game/GameApp.ts
git commit -m "feat(client): wire ECS interpolation into GameApp update loop"
```

---

### Task 10: Add F12 Inspector toggle (quick win)

**Files:**
- Create: `apps/game-client/src/debug/inspectorToggle.ts`
- Modify: `apps/game-client/src/game/GameApp.ts`
- Modify: `apps/game-client/package.json`

- [ ] **Step 1: Add @babylonjs/inspector as devDep**

Add `"@babylonjs/inspector": "^9.0.0"` to `devDependencies` in `apps/game-client/package.json`.

Run: `pnpm install`

- [ ] **Step 2: Create inspector toggle**

Create `apps/game-client/src/debug/inspectorToggle.ts`:

```typescript
import type { Scene } from '@babylonjs/core/scene';

let inspectorLoaded = false;
let inspectorVisible = false;

export function setupInspectorToggle(scene: Scene): void {
  if (!import.meta.env.DEV) return;

  window.addEventListener('keydown', async (e) => {
    if (e.key !== 'F12') return;
    e.preventDefault();

    if (!inspectorLoaded) {
      await import('@babylonjs/inspector');
      inspectorLoaded = true;
    }

    if (inspectorVisible) {
      scene.debugLayer.hide();
      inspectorVisible = false;
    } else {
      await scene.debugLayer.show({ embedMode: true });
      inspectorVisible = true;
    }
  });
}
```

- [ ] **Step 3: Wire into GameApp**

In `GameApp.ts`, after the scene is created (after `this.scene = this.sceneResult.scene`), add:

```typescript
import { setupInspectorToggle } from '../debug/inspectorToggle';
// ... after scene creation:
setupInspectorToggle(this.scene);
```

- [ ] **Step 4: Test**

Run: `pnpm --filter @dracor/game-client dev`
Expected: Press F12 → Inspector panel appears. Press F12 again → hides. In production build, F12 does nothing.

- [ ] **Step 5: Commit**

```bash
git add apps/game-client/src/debug/ apps/game-client/src/game/GameApp.ts apps/game-client/package.json
git commit -m "feat(client): add F12 Inspector toggle in dev builds"
```

---

## Phase 2: Recast/Detour Navmesh

### Task 11: Create AI components

**Files:**
- Create: `packages/ecs/src/components-ai.ts`
- Modify: `packages/ecs/src/components.ts`
- Modify: `packages/ecs/src/world.ts`

- [ ] **Step 1: Define AI components**

Create `packages/ecs/src/components-ai.ts`:

```typescript
const MAX_ENTITIES = 10_000;

export const AI_STATE_IDLE = 0;
export const AI_STATE_PATROL = 1;
export const AI_STATE_CHASE = 2;
export const AI_STATE_FLEE = 3;

export const AIAgent = {
  state: new Uint8Array(MAX_ENTITIES),
  targetEntity: new Uint32Array(MAX_ENTITIES),
  navGoalX: new Float32Array(MAX_ENTITIES),
  navGoalZ: new Float32Array(MAX_ENTITIES),
  pathRecalcTimer: new Float32Array(MAX_ENTITIES),
  aggroRange: new Float32Array(MAX_ENTITIES),
};

export const IsNPC = {};
```

- [ ] **Step 2: Add AI components to world factory**

Update `packages/ecs/src/world.ts` to include `AIAgent` and `IsNPC` in the components object.

- [ ] **Step 3: Export from barrel**

Update `packages/ecs/src/index.ts` to export from `components-ai.ts`.

- [ ] **Step 4: Run tests**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All existing tests still pass

- [ ] **Step 5: Commit**

```bash
git add packages/ecs/src/
git commit -m "feat(ecs): add AIAgent and IsNPC components for navmesh phase"
```

---

### Task 12: Implement navmesh builder

**Files:**
- Create: `apps/game-server/src/navigation/navmeshBuilder.ts`

- [ ] **Step 1: Create navmesh builder**

Create `apps/game-server/src/navigation/navmeshBuilder.ts`:

```typescript
import { RecastJSPlugin } from '@babylonjs/core/Navigation/Plugins/recastJSPlugin';
import Recast from 'recast-detour';

const AGENT_RADIUS = 0.35;
const AGENT_HEIGHT = 1.8;
const AGENT_MAX_CLIMB = 0.35;
const AGENT_MAX_SLOPE = 55;

export interface NavmeshConfig {
  cellSize?: number;
  cellHeight?: number;
}

export async function createNavmeshPlugin(config?: NavmeshConfig): Promise<RecastJSPlugin> {
  const recast = await Recast();
  const plugin = new RecastJSPlugin(recast);
  return plugin;
}

export function bakeNavmeshFromHeightmap(
  plugin: RecastJSPlugin,
  positions: Float32Array,
  indices: Int32Array,
  config?: NavmeshConfig,
): void {
  plugin.createNavMesh(
    [{ positions, indices }] as any,
    {
      cs: config?.cellSize ?? 0.2,
      ch: config?.cellHeight ?? 0.2,
      walkableSlopeAngle: AGENT_MAX_SLOPE,
      walkableHeight: Math.ceil(AGENT_HEIGHT / (config?.cellHeight ?? 0.2)),
      walkableClimb: Math.ceil(AGENT_MAX_CLIMB / (config?.cellHeight ?? 0.2)),
      walkableRadius: Math.ceil(AGENT_RADIUS / (config?.cellSize ?? 0.2)),
      maxEdgeLen: 12,
      maxSimplificationError: 1.3,
      minRegionArea: 8,
      mergeRegionArea: 20,
      maxVertsPerPoly: 6,
      detailSampleDist: 6,
      detailSampleMaxError: 1,
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/game-server/src/navigation/
git commit -m "feat(server): add Recast/Detour navmesh builder"
```

---

### Task 13: Implement AI system

**Files:**
- Create: `packages/ecs/src/systems/aiSystem.ts`
- Create: `packages/ecs/src/__tests__/aiSystem.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ecs/src/__tests__/aiSystem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { aiSystem } from '../systems/aiSystem';
import { AI_STATE_IDLE, AI_STATE_CHASE } from '../components-ai';

describe('aiSystem', () => {
  it('switches NPC to chase when player is within aggro range', () => {
    const world = createDracorWorld();
    const c = world.components;

    const npc = addEntity(world);
    addComponent(world, npc, c.Position);
    addComponent(world, npc, c.Rotation);
    addComponent(world, npc, c.Velocity);
    addComponent(world, npc, c.InputState);
    addComponent(world, npc, c.AIAgent);
    addComponent(world, npc, c.IsNPC);

    c.Position.x[npc] = 0;
    c.Position.z[npc] = 0;
    c.AIAgent.state[npc] = AI_STATE_IDLE;
    c.AIAgent.aggroRange[npc] = 10;

    const player = addEntity(world);
    addComponent(world, player, c.Position);
    addComponent(world, player, c.IsPlayer);
    c.Position.x[player] = 5;
    c.Position.z[player] = 0;

    world.time.delta = 1 / 20;
    aiSystem(world, null);

    expect(c.AIAgent.state[npc]).toBe(AI_STATE_CHASE);
  });

  it('stays idle when no player is in range', () => {
    const world = createDracorWorld();
    const c = world.components;

    const npc = addEntity(world);
    addComponent(world, npc, c.Position);
    addComponent(world, npc, c.Rotation);
    addComponent(world, npc, c.Velocity);
    addComponent(world, npc, c.InputState);
    addComponent(world, npc, c.AIAgent);
    addComponent(world, npc, c.IsNPC);

    c.Position.x[npc] = 0;
    c.Position.z[npc] = 0;
    c.AIAgent.state[npc] = AI_STATE_IDLE;
    c.AIAgent.aggroRange[npc] = 10;

    const player = addEntity(world);
    addComponent(world, player, c.Position);
    addComponent(world, player, c.IsPlayer);
    c.Position.x[player] = 100;
    c.Position.z[player] = 100;

    world.time.delta = 1 / 20;
    aiSystem(world, null);

    expect(c.AIAgent.state[npc]).toBe(AI_STATE_IDLE);
  });
});
```

- [ ] **Step 2: Implement aiSystem**

Create `packages/ecs/src/systems/aiSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '../world';
import { AI_STATE_IDLE, AI_STATE_CHASE } from '../components-ai';

export function aiSystem(world: DracorWorld, navPlugin: any): void {
  const { Position, InputState, AIAgent, IsNPC, IsPlayer } = world.components;
  const dt = world.time.delta;

  const players: number[] = [];
  for (const eid of query(world, [Position, IsPlayer])) {
    players.push(eid);
  }

  for (const eid of query(world, [Position, InputState, AIAgent, IsNPC])) {
    const npcX = Position.x[eid];
    const npcZ = Position.z[eid];
    const aggroRange = AIAgent.aggroRange[eid];

    let closestPlayer = -1;
    let closestDist = Infinity;

    for (const pid of players) {
      const dx = Position.x[pid] - npcX;
      const dz = Position.z[pid] - npcZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = pid;
      }
    }

    if (closestPlayer >= 0 && closestDist <= aggroRange) {
      AIAgent.state[eid] = AI_STATE_CHASE;
      AIAgent.targetEntity[eid] = closestPlayer;

      const dx = Position.x[closestPlayer] - npcX;
      const dz = Position.z[closestPlayer] - npcZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1.5) {
        InputState.moveX[eid] = 0;
        InputState.moveZ[eid] = 1;
        InputState.yaw[eid] = Math.atan2(dx, dz);
        InputState.sprint[eid] = closestDist > aggroRange * 0.5 ? 1 : 0;
      } else {
        InputState.moveX[eid] = 0;
        InputState.moveZ[eid] = 0;
      }
    } else {
      AIAgent.state[eid] = AI_STATE_IDLE;
      InputState.moveX[eid] = 0;
      InputState.moveZ[eid] = 0;
    }
  }
}
```

- [ ] **Step 3: Update systems barrel**

Add to `packages/ecs/src/systems/index.ts`:

```typescript
export { aiSystem } from './aiSystem';
```

- [ ] **Step 4: Run tests**

Run: `cd packages/ecs && npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ecs/src/systems/aiSystem.ts packages/ecs/src/__tests__/aiSystem.test.ts packages/ecs/src/systems/index.ts
git commit -m "feat(ecs): implement aiSystem with aggro detection"
```

---

## Phase 3: Howler.js Audio

### Task 14: Create Howler.js AudioManager

**Files:**
- Create: `apps/game-client/src/audio/AudioManager.ts`
- Create: `apps/game-client/src/audio/soundRegistry.ts`
- Modify: `apps/game-client/package.json`

- [ ] **Step 1: Install howler**

Add to `apps/game-client/package.json` dependencies:
```json
"howler": "^2.2.4"
```
Add to devDependencies:
```json
"@types/howler": "^2.2.11"
```

Run: `pnpm install`

- [ ] **Step 2: Create sound registry**

Create `apps/game-client/src/audio/soundRegistry.ts`:

```typescript
export type SoundCategory = 'ambient' | 'music' | 'sfx' | 'ui';

export interface SoundDef {
  src: string[];
  category: SoundCategory;
  loop?: boolean;
  volume?: number;
  spatial?: boolean;
}

export const SOUNDS: Record<string, SoundDef> = {
  // Ambient
  'ambient-wind': { src: ['/audio/ambient/wind.webm', '/audio/ambient/wind.mp3'], category: 'ambient', loop: true, volume: 0.3, spatial: true },
  'ambient-birds': { src: ['/audio/ambient/birds.webm', '/audio/ambient/birds.mp3'], category: 'ambient', loop: true, volume: 0.2, spatial: true },

  // SFX
  'sfx-footstep': { src: ['/audio/sfx/footstep.webm', '/audio/sfx/footstep.mp3'], category: 'sfx', volume: 0.5, spatial: true },
  'sfx-sword': { src: ['/audio/sfx/sword.webm', '/audio/sfx/sword.mp3'], category: 'sfx', volume: 0.6, spatial: true },

  // UI
  'ui-click': { src: ['/audio/ui/click.webm', '/audio/ui/click.mp3'], category: 'ui', volume: 0.4 },

  // Music
  'music-ironvale': { src: ['/audio/music/ironvale.webm', '/audio/music/ironvale.mp3'], category: 'music', loop: true, volume: 0.3 },
};
```

- [ ] **Step 3: Create new AudioManager**

Create `apps/game-client/src/audio/AudioManager.ts`:

```typescript
import { Howl, Howler } from 'howler';
import type { SettingsManager } from '../systems/SettingsManager';
import { SOUNDS, type SoundCategory, type SoundDef } from './soundRegistry';

interface ActiveSound {
  howl: Howl;
  id: number;
  category: SoundCategory;
}

export class AudioManager {
  private howls = new Map<string, Howl>();
  private activeSounds = new Map<string, ActiveSound>();
  private settings: SettingsManager;
  private categoryVolumes: Record<SoundCategory, number> = {
    ambient: 1,
    music: 1,
    sfx: 1,
    ui: 1,
  };

  constructor(settings: SettingsManager) {
    this.settings = settings;
    this.settings.onChange(() => this.updateVolumes());
    this.updateVolumes();
  }

  private getOrCreateHowl(soundId: string): Howl | null {
    if (this.howls.has(soundId)) return this.howls.get(soundId)!;

    const def = SOUNDS[soundId];
    if (!def) return null;

    const howl = new Howl({
      src: def.src,
      loop: def.loop ?? false,
      volume: def.volume ?? 1,
      html5: def.category === 'music',
    });

    this.howls.set(soundId, howl);
    return howl;
  }

  play(soundId: string, key?: string): string {
    const howl = this.getOrCreateHowl(soundId);
    if (!howl) return '';

    const def = SOUNDS[soundId];
    const id = howl.play();
    const activeKey = key || `${soundId}-${id}`;

    const catVol = this.categoryVolumes[def.category];
    howl.volume((def.volume ?? 1) * catVol, id);

    this.activeSounds.set(activeKey, { howl, id, category: def.category });
    return activeKey;
  }

  stop(key: string): void {
    const active = this.activeSounds.get(key);
    if (!active) return;
    active.howl.stop(active.id);
    this.activeSounds.delete(key);
  }

  setPosition(key: string, x: number, y: number, z: number): void {
    const active = this.activeSounds.get(key);
    if (!active) return;
    active.howl.pos(x, y, z, active.id);
  }

  setListenerPosition(x: number, y: number, z: number, fx: number, fy: number, fz: number): void {
    Howler.pos(x, y, z);
    Howler.orientation(fx, fy, fz, 0, 1, 0);
  }

  startAmbient(): void {
    this.play('music-ironvale', 'zone-music');
  }

  private updateVolumes(): void {
    const s = this.settings.get();
    const master = (s as any).masterVolume ?? 1;
    this.categoryVolumes.ambient = ((s as any).ambientVolume ?? 0.5) * master;
    this.categoryVolumes.music = ((s as any).musicVolume ?? 0.3) * master;
    this.categoryVolumes.sfx = ((s as any).sfxVolume ?? 0.7) * master;
    this.categoryVolumes.ui = ((s as any).uiVolume ?? 0.5) * master;

    Howler.volume(master);
  }

  dispose(): void {
    for (const [, active] of this.activeSounds) {
      active.howl.stop(active.id);
    }
    this.activeSounds.clear();
    for (const [, howl] of this.howls) {
      howl.unload();
    }
    this.howls.clear();
  }
}
```

- [ ] **Step 4: Delete old AudioManager**

Delete `apps/game-client/src/systems/AudioManager.ts`.

Update the import in `GameApp.ts`:
```typescript
import { AudioManager } from '../audio/AudioManager';
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @dracor/game-client typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/game-client/src/audio/ apps/game-client/package.json
git rm apps/game-client/src/systems/AudioManager.ts
git add apps/game-client/src/game/GameApp.ts
git commit -m "feat(audio): replace Web Audio drone with Howler.js AudioManager"
```

---

### Task 15: Create audio ECS components and system

**Files:**
- Create: `packages/ecs/src/components-audio.ts`
- Create: `apps/game-client/src/ecs/systems/audioSystem.ts`

- [ ] **Step 1: Define audio components**

Create `packages/ecs/src/components-audio.ts`:

```typescript
const MAX_ENTITIES = 10_000;

export const AudioSource = {
  soundId: new Uint16Array(MAX_ENTITIES),
  volume: new Float32Array(MAX_ENTITIES),
  radius: new Float32Array(MAX_ENTITIES),
  loop: new Uint8Array(MAX_ENTITIES),
  playing: new Uint8Array(MAX_ENTITIES),
};

export const AudioListener = {};
```

- [ ] **Step 2: Add to world factory**

Update `packages/ecs/src/world.ts` to include `AudioSource` and `AudioListener`.

- [ ] **Step 3: Create audioSystem**

Create `apps/game-client/src/ecs/systems/audioSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';
import type { AudioManager } from '../../audio/AudioManager';

const activeAudioKeys = new Map<number, string>();

export function audioSystem(world: DracorWorld, audioManager: AudioManager, listenerX: number, listenerY: number, listenerZ: number): void {
  const { Position, AudioSource } = world.components;

  for (const eid of query(world, [Position, AudioSource])) {
    const playing = AudioSource.playing[eid] !== 0;
    const radius = AudioSource.radius[eid];
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const ez = Position.z[eid];

    const dx = ex - listenerX;
    const dz = ez - listenerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const inRange = dist <= radius * 2;

    const key = activeAudioKeys.get(eid);

    if (playing && inRange) {
      if (!key) {
        const soundId = AudioSource.soundId[eid];
        const newKey = audioManager.play(String(soundId), `ecs-${eid}`);
        activeAudioKeys.set(eid, newKey);
      }
      const activeKey = activeAudioKeys.get(eid);
      if (activeKey) {
        audioManager.setPosition(activeKey, ex, ey, ez);
      }
    } else if (key) {
      audioManager.stop(key);
      activeAudioKeys.delete(eid);
    }
  }
}
```

- [ ] **Step 4: Export and commit**

```bash
git add packages/ecs/src/components-audio.ts apps/game-client/src/ecs/systems/audioSystem.ts packages/ecs/src/world.ts packages/ecs/src/index.ts
git commit -m "feat(audio): add AudioSource ECS component and audioSystem"
```

---

## Phase 4: Asset Pipeline (Draco + meshoptimizer)

### Task 16: Extend asset-optimizer with gltf-transform

**Files:**
- Modify: `tools/asset-optimizer/package.json`
- Create: `tools/asset-optimizer/src/optimize.ts`
- Create: `tools/asset-optimizer/src/lod.ts`

- [ ] **Step 1: Add gltf-transform dependencies**

Add to `tools/asset-optimizer/package.json` devDependencies:

```json
"@gltf-transform/core": "^4.1.0",
"@gltf-transform/extensions": "^4.1.0",
"@gltf-transform/functions": "^4.1.0",
"draco3dgltf": "^1.5.7",
"meshoptimizer": "^0.22.0"
```

Run: `pnpm install`

- [ ] **Step 2: Create optimize pipeline**

Create `tools/asset-optimizer/src/optimize.ts`:

```typescript
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, quantize, reorder, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder } from 'meshoptimizer';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

export async function optimizeAssets(inputDir: string, outputDir: string): Promise<void> {
  await MeshoptEncoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  const files = await findGltfFiles(inputDir);

  for (const file of files) {
    const document = await io.read(file);

    await document.transform(
      dedup(),
      weld(),
      reorder({ encoder: MeshoptEncoder }),
      quantize(),
      prune(),
    );

    const outName = basename(file, extname(file)) + '.glb';
    const outPath = join(outputDir, outName);
    await io.write(outPath, document);

    console.log(`Optimized: ${basename(file)} → ${outName}`);
  }
}

async function findGltfFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      results.push(...await findGltfFiles(full));
    } else if (/\.(gltf|glb)$/i.test(entry)) {
      results.push(full);
    }
  }
  return results;
}
```

- [ ] **Step 3: Create LOD generator**

Create `tools/asset-optimizer/src/lod.ts`:

```typescript
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const LOD_RATIOS = [1.0, 0.5, 0.25];
const LOD_ERRORS = [0.0, 0.01, 0.05];

export async function generateLODs(inputPath: string, outputDir: string): Promise<string[]> {
  await MeshoptSimplifier.ready;

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const outputs: string[] = [];

  for (let i = 0; i < LOD_RATIOS.length; i++) {
    const document = await io.read(inputPath);

    if (i > 0) {
      await document.transform(
        weld(),
        simplify({ simplifier: MeshoptSimplifier, ratio: LOD_RATIOS[i], error: LOD_ERRORS[i] }),
      );
    }

    const outPath = `${outputDir}/${inputPath.replace(/\.[^.]+$/, '')}_lod${i}.glb`;
    await io.write(outPath, document);
    outputs.push(outPath);
  }

  return outputs;
}
```

- [ ] **Step 4: Commit**

```bash
git add tools/asset-optimizer/
git commit -m "feat(tools): add Draco + meshoptimizer asset compression pipeline"
```

---

### Task 17: Add LOD ECS components and system

**Files:**
- Create: `packages/ecs/src/components-render.ts`
- Create: `apps/game-client/src/ecs/systems/lodSystem.ts`

- [ ] **Step 1: Define render components**

Create `packages/ecs/src/components-render.ts`:

```typescript
const MAX_ENTITIES = 10_000;

export const Renderable = {
  meshIndex: new Uint32Array(MAX_ENTITIES),
  materialIndex: new Uint32Array(MAX_ENTITIES),
  visible: new Uint8Array(MAX_ENTITIES),
};

export const LODGroup = {
  lod0: new Uint32Array(MAX_ENTITIES),
  lod1: new Uint32Array(MAX_ENTITIES),
  lod2: new Uint32Array(MAX_ENTITIES),
  currentLOD: new Uint8Array(MAX_ENTITIES),
};
```

- [ ] **Step 2: Add to world factory**

Update `packages/ecs/src/world.ts` to include `Renderable` and `LODGroup`.

- [ ] **Step 3: Create LOD system**

Create `apps/game-client/src/ecs/systems/lodSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';

const LOD_DISTANCES = [50, 150, 400];

export function lodSystem(world: DracorWorld, cameraX: number, cameraY: number, cameraZ: number): void {
  const { Position, Renderable, LODGroup } = world.components;

  for (const eid of query(world, [Position, Renderable, LODGroup])) {
    const dx = Position.x[eid] - cameraX;
    const dy = Position.y[eid] - cameraY;
    const dz = Position.z[eid] - cameraZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let targetLOD = 2;
    if (dist < LOD_DISTANCES[0]) targetLOD = 0;
    else if (dist < LOD_DISTANCES[1]) targetLOD = 1;

    if (LODGroup.currentLOD[eid] !== targetLOD) {
      LODGroup.currentLOD[eid] = targetLOD;
      const meshIndices = [LODGroup.lod0[eid], LODGroup.lod1[eid], LODGroup.lod2[eid]];
      Renderable.meshIndex[eid] = meshIndices[targetLOD];
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ecs/src/components-render.ts apps/game-client/src/ecs/systems/lodSystem.ts packages/ecs/src/world.ts packages/ecs/src/index.ts
git commit -m "feat(ecs): add Renderable, LODGroup components and lodSystem"
```

---

## Phase 5: Visual Polish (NME + Procedural Textures)

### Task 18: Create Node Material loader and MaterialSystem

**Files:**
- Create: `packages/ecs/src/components-material.ts`
- Create: `apps/game-client/src/shaders/loadNodeMaterial.ts`
- Create: `apps/game-client/src/ecs/systems/materialSystem.ts`

- [ ] **Step 1: Define material component**

Create `packages/ecs/src/components-material.ts`:

```typescript
const MAX_ENTITIES = 10_000;

export const MaterialOverride = {
  shaderId: new Uint16Array(MAX_ENTITIES),
};
```

- [ ] **Step 2: Create NME loader**

Create `apps/game-client/src/shaders/loadNodeMaterial.ts`:

```typescript
import { NodeMaterial } from '@babylonjs/core/Materials/Node/nodeMaterial';
import type { Scene } from '@babylonjs/core/scene';

const materialCache = new Map<string, NodeMaterial>();

export async function loadNodeMaterial(scene: Scene, path: string, name: string): Promise<NodeMaterial> {
  const cached = materialCache.get(name);
  if (cached) return cached;

  const response = await fetch(path);
  const json = await response.json();

  const mat = NodeMaterial.Parse(json, scene, '');
  mat.name = name;
  await mat.buildAsync();

  materialCache.set(name, mat);
  return mat;
}

export function getCachedMaterial(name: string): NodeMaterial | undefined {
  return materialCache.get(name);
}
```

- [ ] **Step 3: Create materialSystem**

Create `apps/game-client/src/ecs/systems/materialSystem.ts`:

```typescript
import { query } from 'bitecs';
import type { DracorWorld } from '@dracor/ecs';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { NodeMaterial } from '@babylonjs/core/Materials/Node/nodeMaterial';

const meshRegistry = new Map<number, AbstractMesh>();
const shaderRegistry = new Map<number, NodeMaterial>();
const appliedShaders = new Map<number, number>();

export function registerMaterialMesh(eid: number, mesh: AbstractMesh): void {
  meshRegistry.set(eid, mesh);
}

export function registerShader(shaderId: number, material: NodeMaterial): void {
  shaderRegistry.set(shaderId, material);
}

export function materialSystem(world: DracorWorld): void {
  const { MaterialOverride } = world.components;

  for (const eid of query(world, [MaterialOverride])) {
    const shaderId = MaterialOverride.shaderId[eid];
    if (shaderId === 0) continue;

    if (appliedShaders.get(eid) === shaderId) continue;

    const mesh = meshRegistry.get(eid);
    const material = shaderRegistry.get(shaderId);
    if (!mesh || !material) continue;

    mesh.material = material;
    appliedShaders.set(eid, shaderId);
  }
}
```

- [ ] **Step 4: Add to world factory and export**

Update `packages/ecs/src/world.ts` to include `MaterialOverride`.

- [ ] **Step 5: Commit**

```bash
git add packages/ecs/src/components-material.ts apps/game-client/src/shaders/ apps/game-client/src/ecs/systems/materialSystem.ts packages/ecs/src/world.ts packages/ecs/src/index.ts
git commit -m "feat(visual): add NME shader loader and materialSystem"
```

---

### Task 19: Final integration — wire all systems into GameApp

**Files:**
- Modify: `apps/game-client/src/game/GameApp.ts`

- [ ] **Step 1: Update GameApp update loop**

Add all Phase 2-5 systems to the `update()` method in `GameApp.ts`. The final system execution order per frame:

```typescript
// In update(dt):
// 1. Input (existing PlayerController for now)
// 2. Client movement (existing PlayerController for now)
// 3. Interpolation (ECS)
interpolationSystem(clientWorld);
// 4. LOD (ECS)
const camPos = this.cameraController.getPosition();
lodSystem(clientWorld, camPos.x, camPos.y, camPos.z);
// 5. Render sync (ECS)
renderSyncSystem(clientWorld);
// 6. Material (ECS)
materialSystem(clientWorld);
// 7. Audio (ECS)
audioSystem(clientWorld, this.audio, camPos.x, camPos.y, camPos.z);
// 8. Atmosphere (existing)
// 9. Streaming (existing)
// 10. UI updates (existing)
```

- [ ] **Step 2: Build and typecheck all packages**

Run: `pnpm typecheck`
Expected: All 22+ tasks pass

- [ ] **Step 3: Manual test**

Run: `pnpm dev`
Expected: Game loads on :5173, server runs on :2567, player moves, chat works, F12 opens Inspector

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/game/GameApp.ts
git commit -m "feat: wire all ECS systems into GameApp update loop"
```

---

### Task 20: Clean up deprecated files

**Files:**
- Delete: `apps/game-server/src/simulation/simulatePlayerMovement.ts` (replaced by ECS movementSystem)

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "simulatePlayerMovement" apps/game-server/src/ --include="*.ts"`
Expected: No results (WorldRoom now uses ECS)

- [ ] **Step 2: Delete the file**

```bash
git rm apps/game-server/src/simulation/simulatePlayerMovement.ts
```

- [ ] **Step 3: Final typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove simulatePlayerMovement.ts (replaced by ECS movementSystem)"
```
