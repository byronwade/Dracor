# GLB Foliage Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace procedural cylinder/cone tree geometry with a GLB model loading pipeline that thin-instances realistic trees using biome-aware placement with exclusion zones, slope filtering, and wind animation.

**Architecture:** Three new modules — model loader (async GLB loading + caching), placement engine (jittered grid with slope/exclusion filtering), and wind shader (vertex displacement by height). The rewritten foliage builder orchestrates all three, falling back to procedural geometry when GLB files are missing.

**Tech Stack:** Babylon.js 7 (deep imports), `@babylonjs/loaders` for glTF, Vite (static assets from `public/`), TypeScript

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `apps/game-client/src/world/modelLoader.ts` | Load `.glb` files via `LoadAssetContainerAsync`, cache by ID, merge multi-mesh GLBs, return null on 404 |
| `apps/game-client/src/world/placementEngine.ts` | Generate thin-instance matrix buffers using jittered grid, slope filtering, exclusion zones |
| `apps/game-client/src/world/windShader.ts` | Create wind `ShaderMaterial` wrapping PBR textures, expose `updateWind(dt)` |
| `apps/game-client/public/models/foliage/.gitkeep` | Placeholder so the asset directory is tracked in git |

### Modified Files
| File | Change |
|------|--------|
| `apps/game-client/package.json` | Add `@babylonjs/loaders` dependency |
| `packages/world-data/src/types/FoliageDefinition.ts` | Add `modelId`, `maxSlope`, `alignToSlope`, `exclusionRadii`, `tree_broadleaf` to FoliageGroup |
| `packages/world-data/src/types/BiomeDefinition.ts` | Add `tree_broadleaf` to foliageTypes union comment |
| `packages/world-data/src/biomes/ironvaleBiomes.ts` | Add `tree_broadleaf` to `dark_pine_frontier` biome |
| `packages/world-data/src/zones/ironvaleOutskirts.ts` | Add `modelId`, slope, exclusion fields to each foliage group; add broadleaf group |
| `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts` | Update embedded `FoliageGroup` type, update embedded manifest data, make `buildIronvaleOutskirtsScene` async, return `windUpdate` handle |
| `apps/game-client/src/world/loadZoneFromManifest.ts` | Build `ExclusionData` from manifest, make function async, pass exclusions to foliage builder |
| `apps/game-client/src/world/createFoliageFromManifest.ts` | Full rewrite: async, loads GLB models, uses placement engine, applies wind shader, falls back to procedural |
| `apps/game-client/src/scenes/SceneRegistry.ts` | Make `SceneBuilder` async, update call site |
| `apps/game-client/src/game/GameApp.ts` | Await async scene builder, call `windUpdate` in update loop |

---

## Task 1: Install `@babylonjs/loaders` and create asset directory

**Files:**
- Modify: `apps/game-client/package.json`
- Create: `apps/game-client/public/models/foliage/.gitkeep`

- [ ] **Step 1: Install the loaders package**

```bash
cd apps/game-client && pnpm add @babylonjs/loaders@^7.0.0
```

- [ ] **Step 2: Create the asset directory with .gitkeep**

```bash
mkdir -p apps/game-client/public/models/foliage
touch apps/game-client/public/models/foliage/.gitkeep
```

- [ ] **Step 3: Verify Vite serves the public directory**

Vite serves `public/` as the static root by default. No config change needed. Verify by running:
```bash
cd apps/game-client && pnpm dev
```
Then open `http://localhost:5173/models/foliage/.gitkeep` in a browser — it should return a 200 (empty file).

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/package.json apps/game-client/public/models/foliage/.gitkeep pnpm-lock.yaml
git commit -m "feat(game-client): add @babylonjs/loaders and create GLB asset directory"
```

---

## Task 2: Update type definitions (`FoliageDefinition.ts` + `BiomeDefinition.ts`)

**Files:**
- Modify: `packages/world-data/src/types/FoliageDefinition.ts`
- Modify: `packages/world-data/src/types/BiomeDefinition.ts`
- Modify: `packages/world-data/src/biomes/ironvaleBiomes.ts`

- [ ] **Step 1: Update FoliageGroup interface**

Replace the contents of `packages/world-data/src/types/FoliageDefinition.ts` with:

```typescript
export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'tree_broadleaf' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  modelId: string;
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
}

export interface RockGroup {
  id: string;
  type: 'boulder_large' | 'boulder_medium' | 'stone_cluster' | 'cliff_face';
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
}
```

- [ ] **Step 2: Add `tree_broadleaf` to ironvale biome**

In `packages/world-data/src/biomes/ironvaleBiomes.ts`, update the `dark_pine_frontier` biome's `foliageTypes` array:

```typescript
foliageTypes: ['tree_pine', 'tree_dead', 'tree_broadleaf', 'bush', 'fern'],
```

- [ ] **Step 3: Build the world-data package to verify types compile**

```bash
pnpm --filter @dracor/world-data build
```

Expected: Build succeeds (the zone manifest file will fail because it doesn't have the new fields yet — that's expected and fixed in Task 3).

- [ ] **Step 4: Commit**

```bash
git add packages/world-data/src/types/FoliageDefinition.ts packages/world-data/src/types/BiomeDefinition.ts packages/world-data/src/biomes/ironvaleBiomes.ts
git commit -m "feat(world-data): add modelId, slope, exclusion fields to FoliageGroup"
```

---

## Task 3: Update zone manifest with new foliage fields

**Files:**
- Modify: `packages/world-data/src/zones/ironvaleOutskirts.ts`

- [ ] **Step 1: Update all existing foliage groups and add broadleaf**

Replace the `foliage` array in `packages/world-data/src/zones/ironvaleOutskirts.ts` with:

```typescript
foliage: [
  {
    id: 'foliage_pine_main',
    type: 'tree_pine',
    modelId: 'pine_tree_01',
    count: 200,
    area: { centerX: 0, centerZ: 0, radius: 220 },
    minScale: 0.8,
    maxScale: 1.4,
    density: 0.6,
    lodDistance: 120,
    castShadow: true,
    maxSlope: 30,
    alignToSlope: true,
    exclusionRadii: { road: 8, water: 6, landmark: 12, spawn: 10 },
  },
  {
    id: 'foliage_dead_trees',
    type: 'tree_dead',
    modelId: 'dead_tree_01',
    count: 30,
    area: { centerX: -80, centerZ: 60, radius: 150 },
    minScale: 0.7,
    maxScale: 1.1,
    density: 0.15,
    lodDistance: 100,
    castShadow: true,
    maxSlope: 35,
    alignToSlope: true,
    exclusionRadii: { road: 6, water: 5, landmark: 10, spawn: 8 },
  },
  {
    id: 'foliage_broadleaf',
    type: 'tree_broadleaf',
    modelId: 'broadleaf_tree_01',
    count: 60,
    area: { centerX: 50, centerZ: -40, radius: 180 },
    minScale: 0.9,
    maxScale: 1.6,
    density: 0.25,
    lodDistance: 100,
    castShadow: true,
    maxSlope: 25,
    alignToSlope: true,
    exclusionRadii: { road: 10, water: 8, landmark: 15, spawn: 10 },
  },
  {
    id: 'foliage_tall_grass',
    type: 'grass_tall',
    modelId: 'grass_tall_patch',
    count: 500,
    area: { centerX: 0, centerZ: 0, radius: 50 },
    minScale: 0.6,
    maxScale: 1.0,
    density: 0.9,
    lodDistance: 40,
    castShadow: false,
    maxSlope: 40,
    alignToSlope: false,
    exclusionRadii: { road: 3, water: 2, landmark: 5, spawn: 4 },
  },
  {
    id: 'foliage_bushes_edge',
    type: 'bush',
    modelId: 'bush_01',
    count: 80,
    area: { centerX: 40, centerZ: -30, radius: 180 },
    minScale: 0.5,
    maxScale: 1.2,
    density: 0.35,
    lodDistance: 60,
    castShadow: true,
    maxSlope: 35,
    alignToSlope: false,
    exclusionRadii: { road: 5, water: 4, landmark: 8, spawn: 6 },
  },
],
```

- [ ] **Step 2: Build world-data to verify**

```bash
pnpm --filter @dracor/world-data build
```

Expected: Clean build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/world-data/src/zones/ironvaleOutskirts.ts
git commit -m "feat(world-data): add modelId and placement rules to Ironvale foliage groups"
```

---

## Task 4: Create the model loader (`modelLoader.ts`)

**Files:**
- Create: `apps/game-client/src/world/modelLoader.ts`

- [ ] **Step 1: Create the model loader**

Write `apps/game-client/src/world/modelLoader.ts`:

```typescript
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import '@babylonjs/core/Meshes/thinInstanceMesh';

const modelCache = new Map<string, Mesh>();
let loadersRegistered = false;

function ensureLoaders(): void {
  if (loadersRegistered) return;
  registerBuiltInLoaders();
  loadersRegistered = true;
}

export function getModelBasePath(): string {
  return '/models/foliage/';
}

export async function loadModel(modelId: string, scene: Scene): Promise<Mesh | null> {
  const cached = modelCache.get(modelId);
  if (cached) return cached;

  ensureLoaders();

  const url = `${getModelBasePath()}${modelId}.glb`;

  try {
    const container = await LoadAssetContainerAsync(url, scene);

    const meshes = container.meshes.filter(
      (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0
    );

    if (meshes.length === 0) {
      console.warn(`[Foliage] Model ${modelId}.glb has no geometry`);
      container.dispose();
      return null;
    }

    let sourceMesh: Mesh;

    if (meshes.length === 1) {
      sourceMesh = meshes[0];
      container.addAllToScene();
    } else {
      container.addAllToScene();
      const merged = Mesh.MergeMeshes(
        meshes,
        true,
        true,
        undefined,
        false,
        true
      );
      if (!merged) {
        console.warn(`[Foliage] Failed to merge meshes for ${modelId}.glb`);
        container.dispose();
        return null;
      }
      sourceMesh = merged;
    }

    sourceMesh.name = `foliage_${modelId}`;
    sourceMesh.isVisible = true;
    sourceMesh.setEnabled(true);

    modelCache.set(modelId, sourceMesh);
    return sourceMesh;
  } catch (e) {
    console.warn(`[Foliage] Model ${modelId}.glb not found, using procedural fallback`);
    return null;
  }
}

export function clearModelCache(): void {
  modelCache.clear();
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | head -20
```

Expected: No errors from `modelLoader.ts` (other files may have errors due to upcoming changes — that's fine).

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/world/modelLoader.ts
git commit -m "feat(game-client): add GLB model loader with caching and fallback"
```

---

## Task 5: Create the placement engine (`placementEngine.ts`)

**Files:**
- Create: `apps/game-client/src/world/placementEngine.ts`

- [ ] **Step 1: Create the placement engine**

Write `apps/game-client/src/world/placementEngine.ts`:

```typescript
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';

export interface PlacementConfig {
  count: number;
  density: number;
  minScale: number;
  maxScale: number;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
  area: { centerX: number; centerZ: number; radius: number };
}

export interface ExclusionData {
  roadSegments: Array<{ ax: number; az: number; bx: number; bz: number; width: number }>;
  waterBodies: Array<{ x: number; z: number; radiusX: number; radiusZ: number }>;
  landmarks: Array<{ x: number; z: number; radius: number }>;
  spawns: Array<{ x: number; z: number; radius: number }>;
}

function distanceToSegment(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);

  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projZ = az + t * dz;
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

function computeSlopeAndNormal(
  x: number, z: number,
  getHeightAt: (x: number, z: number) => number
): { slopeDeg: number; normalX: number; normalY: number; normalZ: number } {
  const step = 1.0;
  const hC = getHeightAt(x, z);
  const hR = getHeightAt(x + step, z);
  const hF = getHeightAt(x, z + step);

  const edgeAx = step;
  const edgeAy = hR - hC;
  const edgeAz = 0;
  const edgeBx = 0;
  const edgeBy = hF - hC;
  const edgeBz = step;

  let nx = edgeAy * edgeBz - edgeAz * edgeBy;
  let ny = edgeAz * edgeBx - edgeAx * edgeBz;
  let nz = edgeAx * edgeBy - edgeAy * edgeBx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 0) { nx /= len; ny /= len; nz /= len; }
  else { nx = 0; ny = 1; nz = 0; }

  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }

  const slopeDeg = Math.acos(Math.min(1, Math.abs(ny))) * (180 / Math.PI);

  return { slopeDeg, normalX: nx, normalY: ny, normalZ: nz };
}

function isExcluded(
  x: number, z: number,
  config: PlacementConfig,
  exclusions: ExclusionData
): boolean {
  for (const seg of exclusions.roadSegments) {
    const dist = distanceToSegment(x, z, seg.ax, seg.az, seg.bx, seg.bz);
    if (dist < config.exclusionRadii.road + seg.width * 0.5) return true;
  }

  for (const w of exclusions.waterBodies) {
    const dx = (x - w.x) / w.radiusX;
    const dz = (z - w.z) / w.radiusZ;
    if (dx * dx + dz * dz < 1 + config.exclusionRadii.water * 0.1) return true;
  }

  for (const lm of exclusions.landmarks) {
    const dist = Math.sqrt((x - lm.x) ** 2 + (z - lm.z) ** 2);
    if (dist < lm.radius + config.exclusionRadii.landmark) return true;
  }

  for (const sp of exclusions.spawns) {
    const dist = Math.sqrt((x - sp.x) ** 2 + (z - sp.z) ** 2);
    if (dist < sp.radius + config.exclusionRadii.spawn) return true;
  }

  return false;
}

export function generatePlacements(
  config: PlacementConfig,
  exclusions: ExclusionData,
  getHeightAt: (x: number, z: number) => number,
  qualityDensity: number
): Float32Array {
  const targetCount = Math.max(1, Math.floor(config.count * qualityDensity));
  const matrices: number[] = [];

  const tmpPos = new Vector3();
  const tmpRot = new Quaternion();
  const tmpScale = new Vector3();
  const tmpMat = new Matrix();
  const tmpArr = new Array(16);

  const area = config.area;
  const cellSize = config.density > 0 ? 1 / Math.sqrt(config.density) : 20;
  const gridMinX = area.centerX - area.radius;
  const gridMaxX = area.centerX + area.radius;
  const gridMinZ = area.centerZ - area.radius;
  const gridMaxZ = area.centerZ + area.radius;

  const candidates: Array<{ x: number; z: number }> = [];

  for (let gx = gridMinX; gx < gridMaxX; gx += cellSize) {
    for (let gz = gridMinZ; gz < gridMaxZ; gz += cellSize) {
      const x = gx + Math.random() * cellSize;
      const z = gz + Math.random() * cellSize;

      const dx = x - area.centerX;
      const dz = z - area.centerZ;
      if (dx * dx + dz * dz > area.radius * area.radius) continue;

      candidates.push({ x, z });
    }
  }

  // Shuffle and take targetCount
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let placed = 0;
  for (const cand of candidates) {
    if (placed >= targetCount) break;

    if (isExcluded(cand.x, cand.z, config, exclusions)) continue;

    const { slopeDeg, normalX, normalY, normalZ } = computeSlopeAndNormal(
      cand.x, cand.z, getHeightAt
    );

    if (slopeDeg > config.maxSlope) continue;

    const y = getHeightAt(cand.x, cand.z);
    const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
    const rotY = Math.random() * Math.PI * 2;

    tmpPos.set(cand.x, y, cand.z);

    if (config.alignToSlope && normalY < 0.99) {
      const up = Vector3.Up();
      const normal = new Vector3(normalX, normalY, normalZ);
      const axis = Vector3.Cross(up, normal);
      const angle = Math.acos(Math.min(1, Vector3.Dot(up, normal)));
      Quaternion.RotationAxisToRef(axis.normalize(), angle, tmpRot);
      const yawQuat = Quaternion.RotationAxis(Vector3.Up(), rotY);
      tmpRot.multiplyInPlace(yawQuat);
    } else {
      Quaternion.FromEulerAnglesToRef(0, rotY, 0, tmpRot);
    }

    tmpScale.set(scale, scale, scale);
    Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);
    tmpMat.copyToArray(tmpArr, 0);
    for (let j = 0; j < 16; j++) matrices.push(tmpArr[j]);

    placed++;
  }

  return new Float32Array(matrices);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | grep "placementEngine" | head -5
```

Expected: No errors from `placementEngine.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/world/placementEngine.ts
git commit -m "feat(game-client): add biome-aware placement engine with slope and exclusion filtering"
```

---

## Task 6: Create the wind shader (`windShader.ts`)

**Files:**
- Create: `apps/game-client/src/world/windShader.ts`

- [ ] **Step 1: Create the wind shader module**

Write `apps/game-client/src/world/windShader.ts`:

```typescript
import { Scene } from '@babylonjs/core/scene';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Material } from '@babylonjs/core/Materials/material';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 viewProjection;
uniform mat4 world;
uniform float windTime;
uniform float windStrength;
uniform vec2 windDirection;
uniform float windSpeed;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;

#include<instancesDeclaration>

void main() {
  vec3 positionUpdated = position;

  #include<instancesVertex>

  vec4 worldPos = finalWorld * vec4(position, 1.0);

  float height = max(0.0, position.y);
  float swayAmount = height * height * windStrength * 0.002;
  float phase = windTime * windSpeed + worldPos.x * 0.05 + worldPos.z * 0.07;
  float sway = sin(phase) * 0.7 + sin(phase * 2.3 + 1.4) * 0.3;

  worldPos.x += sway * swayAmount * windDirection.x;
  worldPos.z += sway * swayAmount * windDirection.y;

  vUV = uv;
  vNormal = normalize((finalWorld * vec4(normal, 0.0)).xyz);
  vWorldPos = worldPos.xyz;

  gl_Position = viewProjection * worldPos;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 baseColor;
uniform float roughness;
uniform float metallic;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform sampler2D albedoTexture;
uniform float hasAlbedoTexture;

void main() {
  vec3 albedo;
  if (hasAlbedoTexture > 0.5) {
    vec4 texColor = texture2D(albedoTexture, vUV);
    if (texColor.a < 0.3) discard;
    albedo = texColor.rgb * baseColor;
  } else {
    albedo = baseColor;
  }

  vec3 N = normalize(vNormal);
  vec3 L = normalize(-lightDirection);
  float NdotL = max(dot(N, L), 0.0);

  vec3 diffuse = albedo * lightColor * NdotL;
  vec3 ambient = albedo * ambientColor;

  vec3 color = ambient + diffuse;

  color = color / (color + vec3(1.0));

  gl_FragColor = vec4(color, 1.0);
}
`;

let shaderRegistered = false;

function ensureShaderRegistered(): void {
  if (shaderRegistered) return;

  Effect.ShadersStore['foliageWindVertexShader'] = VERTEX_SHADER;
  Effect.ShadersStore['foliageWindFragmentShader'] = FRAGMENT_SHADER;
  shaderRegistered = true;
}

export interface WindState {
  time: number;
  strength: number;
  speed: number;
  directionX: number;
  directionZ: number;
  materials: ShaderMaterial[];
}

let globalWindState: WindState | null = null;

export function getOrCreateWindState(): WindState {
  if (!globalWindState) {
    globalWindState = {
      time: 0,
      strength: 0.8,
      speed: 1.5,
      directionX: 1.0,
      directionZ: 0.3,
      materials: [],
    };
  }
  return globalWindState;
}

export function createWindMaterial(
  scene: Scene,
  baseMaterial: Material | null,
  name: string
): ShaderMaterial {
  ensureShaderRegistered();

  const windMat = new ShaderMaterial(`wind_${name}`, scene, 'foliageWind', {
    attributes: ['position', 'normal', 'uv'],
    uniforms: [
      'viewProjection', 'world',
      'windTime', 'windStrength', 'windDirection', 'windSpeed',
      'baseColor', 'roughness', 'metallic',
      'lightDirection', 'lightColor', 'ambientColor',
      'hasAlbedoTexture',
    ],
    samplers: ['albedoTexture'],
    defines: ['#define THIN_INSTANCES'],
  });

  let color = new Color3(0.15, 0.25, 0.1);
  let rough = 0.9;
  let metal = 0.0;
  let albedoTex: Texture | null = null;

  if (baseMaterial instanceof PBRMaterial) {
    color = baseMaterial.albedoColor || color;
    rough = baseMaterial.roughness ?? rough;
    metal = baseMaterial.metallic ?? metal;
    albedoTex = baseMaterial.albedoTexture as Texture | null;
  } else if (baseMaterial instanceof StandardMaterial) {
    color = baseMaterial.diffuseColor || color;
    albedoTex = baseMaterial.diffuseTexture as Texture | null;
  }

  windMat.setColor3('baseColor', color);
  windMat.setFloat('roughness', rough);
  windMat.setFloat('metallic', metal);
  windMat.setVector3('lightDirection', new Vector3(-0.6, -0.3, -0.75));
  windMat.setColor3('lightColor', new Color3(1.0, 0.7, 0.35));
  windMat.setColor3('ambientColor', new Color3(0.15, 0.1, 0.08));

  if (albedoTex) {
    windMat.setTexture('albedoTexture', albedoTex);
    windMat.setFloat('hasAlbedoTexture', 1.0);
  } else {
    windMat.setFloat('hasAlbedoTexture', 0.0);
  }

  windMat.backFaceCulling = false;

  const wind = getOrCreateWindState();
  wind.materials.push(windMat);

  return windMat;
}

export function updateWind(deltaTime: number): void {
  const wind = getOrCreateWindState();
  if (!wind) return;

  wind.time += deltaTime;

  for (const mat of wind.materials) {
    mat.setFloat('windTime', wind.time);
    mat.setFloat('windStrength', wind.strength);
    mat.setFloat('windSpeed', wind.speed);
    mat.setFloat2('windDirection', wind.directionX, wind.directionZ);
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | grep "windShader" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/world/windShader.ts
git commit -m "feat(game-client): add wind vertex shader for foliage animation"
```

---

## Task 7: Rewrite `createFoliageFromManifest.ts`

**Files:**
- Modify: `apps/game-client/src/world/createFoliageFromManifest.ts`

This is the core integration file. It uses the model loader, placement engine, and wind shader — falling back to procedural geometry when GLB models are missing.

- [ ] **Step 1: Replace the entire file**

Replace all contents of `apps/game-client/src/world/createFoliageFromManifest.ts` with:

```typescript
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/thinInstanceMesh';

import type { QualitySettings, FoliageGroup } from '../scenes/IronvaleOutskirtsScene';
import { loadModel } from './modelLoader';
import { generatePlacements, type PlacementConfig, type ExclusionData } from './placementEngine';
import { createWindMaterial, updateWind } from './windShader';

export { type ExclusionData } from './placementEngine';

export interface FoliageResult {
  updateWind: (dt: number) => void;
}

// ─── Procedural Fallback Materials (cached) ───

let pineNeedleMat: StandardMaterial | null = null;
let pineTrunkMat: StandardMaterial | null = null;
let deadTreeMat: StandardMaterial | null = null;
let bushMat: StandardMaterial | null = null;
let grassMat: StandardMaterial | null = null;

function ensureFallbackMaterials(scene: Scene): void {
  if (pineNeedleMat) return;

  pineNeedleMat = new StandardMaterial('pineNeedleMat', scene);
  pineNeedleMat.diffuseColor = new Color3(0.08, 0.18, 0.06);
  pineNeedleMat.specularColor = new Color3(0.01, 0.02, 0.01);
  pineNeedleMat.ambientColor = new Color3(0.03, 0.06, 0.02);

  pineTrunkMat = new StandardMaterial('pineTrunkMat', scene);
  pineTrunkMat.diffuseColor = new Color3(0.18, 0.12, 0.07);
  pineTrunkMat.specularColor = new Color3(0.02, 0.02, 0.01);

  deadTreeMat = new StandardMaterial('deadTreeMat', scene);
  deadTreeMat.diffuseColor = new Color3(0.16, 0.13, 0.1);
  deadTreeMat.specularColor = new Color3(0.02, 0.02, 0.01);

  bushMat = new StandardMaterial('bushMat', scene);
  bushMat.diffuseColor = new Color3(0.1, 0.2, 0.07);
  bushMat.specularColor = new Color3(0.01, 0.02, 0.01);

  grassMat = new StandardMaterial('grassMat', scene);
  grassMat.diffuseColor = new Color3(0.12, 0.22, 0.08);
  grassMat.specularColor = Color3.Black();
  grassMat.backFaceCulling = false;
  grassMat.alpha = 0.7;
}

// ─── Procedural Fallback Meshes ───

function createFallbackPine(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const trunk = MeshBuilder.CreateCylinder('_pt', { diameter: 0.4, height: 4, tessellation: 6 }, scene);
  trunk.position.y = 2;
  const c1 = MeshBuilder.CreateCylinder('_pc1', { diameterTop: 0, diameterBottom: 4, height: 4, tessellation: 6 }, scene);
  c1.position.y = 4.5;
  const c2 = MeshBuilder.CreateCylinder('_pc2', { diameterTop: 0, diameterBottom: 3, height: 3.5, tessellation: 6 }, scene);
  c2.position.y = 6.5;
  const c3 = MeshBuilder.CreateCylinder('_pc3', { diameterTop: 0, diameterBottom: 2, height: 3, tessellation: 6 }, scene);
  c3.position.y = 8.5;
  trunk.material = pineTrunkMat;
  c1.material = pineNeedleMat;
  c2.material = pineNeedleMat;
  c3.material = pineNeedleMat;
  const merged = Mesh.MergeMeshes([trunk, c1, c2, c3], true, true, undefined, false, true);
  if (!merged) throw new Error('Failed to merge pine fallback');
  merged.name = 'pineTree_fallback';
  merged.material = pineNeedleMat;
  return merged;
}

function createFallbackDeadTree(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const trunk = MeshBuilder.CreateCylinder('_dt', { diameterTop: 0.2, diameterBottom: 0.6, height: 5, tessellation: 5 }, scene);
  trunk.position.y = 2.5;
  const b1 = MeshBuilder.CreateCylinder('_db1', { diameterTop: 0.05, diameterBottom: 0.15, height: 2, tessellation: 5 }, scene);
  b1.position.set(0.4, 3.5, 0);
  b1.rotation.z = -0.8;
  const b2 = MeshBuilder.CreateCylinder('_db2', { diameterTop: 0.04, diameterBottom: 0.12, height: 1.5, tessellation: 5 }, scene);
  b2.position.set(-0.3, 4.0, 0.2);
  b2.rotation.z = 0.6;
  trunk.material = deadTreeMat;
  b1.material = deadTreeMat;
  b2.material = deadTreeMat;
  const merged = Mesh.MergeMeshes([trunk, b1, b2], true, true, undefined, false, true);
  if (!merged) throw new Error('Failed to merge dead tree fallback');
  merged.name = 'deadTree_fallback';
  merged.material = deadTreeMat;
  return merged;
}

function createFallbackBush(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const bush = MeshBuilder.CreateBox('bush_fallback', { width: 1.5, height: 1, depth: 1.5 }, scene);
  bush.material = bushMat;
  return bush;
}

function createFallbackGrass(scene: Scene): Mesh {
  ensureFallbackMaterials(scene);
  const grass = MeshBuilder.CreatePlane('grass_fallback', { width: 0.4, height: 0.8 }, scene);
  grass.material = grassMat;
  return grass;
}

function getFallbackMesh(type: string, scene: Scene): Mesh | null {
  switch (type) {
    case 'tree_pine': return createFallbackPine(scene);
    case 'tree_dead': return createFallbackDeadTree(scene);
    case 'tree_broadleaf': return createFallbackPine(scene);
    case 'bush': return createFallbackBush(scene);
    case 'grass_tall':
    case 'grass_short': return createFallbackGrass(scene);
    default: return null;
  }
}

// ─── Main Entry Point ───

export async function createFoliageFromManifest(
  foliageGroups: FoliageGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number,
  exclusions: ExclusionData
): Promise<FoliageResult> {
  for (const group of foliageGroups) {
    const placementConfig: PlacementConfig = {
      count: group.count,
      density: group.density,
      minScale: group.minScale,
      maxScale: group.maxScale,
      maxSlope: group.maxSlope,
      alignToSlope: group.alignToSlope,
      exclusionRadii: group.exclusionRadii,
      area: group.area,
    };

    let sourceMesh: Mesh | null = null;
    let usedGlb = false;

    if (group.modelId) {
      sourceMesh = await loadModel(group.modelId, scene);
      if (sourceMesh) {
        usedGlb = true;
        const baseMat = sourceMesh.material;
        const windMat = createWindMaterial(scene, baseMat, group.modelId);
        sourceMesh.material = windMat;
      }
    }

    if (!sourceMesh) {
      sourceMesh = getFallbackMesh(group.type, scene);
      if (!sourceMesh) continue;
    }

    const matrices = generatePlacements(
      placementConfig,
      exclusions,
      getHeightAt,
      quality.foliageDensity
    );

    if (matrices.length > 0) {
      sourceMesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
    }
  }

  return {
    updateWind: (dt: number) => updateWind(dt),
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter @dracor/game-client typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/world/createFoliageFromManifest.ts
git commit -m "feat(game-client): rewrite foliage builder with GLB loading, placement engine, and wind"
```

---

## Task 8: Update embedded types and manifest in `IronvaleOutskirtsScene.ts`

**Files:**
- Modify: `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts`

- [ ] **Step 1: Update the FoliageGroup type**

In `IronvaleOutskirtsScene.ts`, replace the `FoliageGroup` interface (lines 68-79) with:

```typescript
export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'tree_broadleaf' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  modelId: string;
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
}
```

- [ ] **Step 2: Update the embedded foliage data**

Replace the `foliage` array inside the `IRONVALE_OUTSKIRTS` constant (lines 280-325) with:

```typescript
foliage: [
  {
    id: 'foliage_pine_main',
    type: 'tree_pine',
    modelId: 'pine_tree_01',
    count: 200,
    area: { centerX: 0, centerZ: 0, radius: 220 },
    minScale: 0.8,
    maxScale: 1.4,
    density: 0.6,
    lodDistance: 120,
    castShadow: true,
    maxSlope: 30,
    alignToSlope: true,
    exclusionRadii: { road: 8, water: 6, landmark: 12, spawn: 10 },
  },
  {
    id: 'foliage_dead_trees',
    type: 'tree_dead',
    modelId: 'dead_tree_01',
    count: 30,
    area: { centerX: -80, centerZ: 60, radius: 150 },
    minScale: 0.7,
    maxScale: 1.1,
    density: 0.15,
    lodDistance: 100,
    castShadow: true,
    maxSlope: 35,
    alignToSlope: true,
    exclusionRadii: { road: 6, water: 5, landmark: 10, spawn: 8 },
  },
  {
    id: 'foliage_broadleaf',
    type: 'tree_broadleaf',
    modelId: 'broadleaf_tree_01',
    count: 60,
    area: { centerX: 50, centerZ: -40, radius: 180 },
    minScale: 0.9,
    maxScale: 1.6,
    density: 0.25,
    lodDistance: 100,
    castShadow: true,
    maxSlope: 25,
    alignToSlope: true,
    exclusionRadii: { road: 10, water: 8, landmark: 15, spawn: 10 },
  },
  {
    id: 'foliage_tall_grass',
    type: 'grass_tall',
    modelId: 'grass_tall_patch',
    count: 500,
    area: { centerX: 0, centerZ: 0, radius: 50 },
    minScale: 0.6,
    maxScale: 1.0,
    density: 0.9,
    lodDistance: 40,
    castShadow: false,
    maxSlope: 40,
    alignToSlope: false,
    exclusionRadii: { road: 3, water: 2, landmark: 5, spawn: 4 },
  },
  {
    id: 'foliage_bushes_edge',
    type: 'bush',
    modelId: 'bush_01',
    count: 80,
    area: { centerX: 40, centerZ: -30, radius: 180 },
    minScale: 0.5,
    maxScale: 1.2,
    density: 0.35,
    lodDistance: 60,
    castShadow: true,
    maxSlope: 35,
    alignToSlope: false,
    exclusionRadii: { road: 5, water: 4, landmark: 8, spawn: 6 },
  },
],
```

- [ ] **Step 3: Update the IronvaleSceneResult interface and make buildIronvaleOutskirtsScene async**

Update the interface:
```typescript
export interface IronvaleSceneResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
  dayNight: DayNightCycle;
  updateWind: (dt: number) => void;
}
```

Change the function signature from:
```typescript
export function buildIronvaleOutskirtsScene(
```
to:
```typescript
export async function buildIronvaleOutskirtsScene(
```

And change the return type to `Promise<IronvaleSceneResult>`.

Change `loadZoneFromManifest` call from:
```typescript
const zoneResult = loadZoneFromManifest(IRONVALE_OUTSKIRTS, scene, quality);
```
to:
```typescript
const zoneResult = await loadZoneFromManifest(IRONVALE_OUTSKIRTS, scene, quality);
```

Add `zoneResult.updateWind` to the return object:
```typescript
return {
  scene,
  getHeightAt: zoneResult.terrain.getHeightAt,
  dayNight,
  updateWind: zoneResult.updateWind,
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/scenes/IronvaleOutskirtsScene.ts
git commit -m "feat(game-client): update scene types for GLB foliage pipeline"
```

---

## Task 9: Update `loadZoneFromManifest.ts` to build exclusion data

**Files:**
- Modify: `apps/game-client/src/world/loadZoneFromManifest.ts`

- [ ] **Step 1: Replace the entire file**

Replace all contents of `apps/game-client/src/world/loadZoneFromManifest.ts` with:

```typescript
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

import type { QualitySettings, ZoneManifest, RockGroup } from '../scenes/IronvaleOutskirtsScene';
import { createTerrainFromManifest, type TerrainResult } from './createTerrainFromManifest';
import { createFoliageFromManifest, type ExclusionData } from './createFoliageFromManifest';
import { createRoadFromManifest } from './createRoadFromManifest';
import { createShrineFromManifest } from './createShrineFromManifest';
import { createLandmarksFromManifest } from './createLandmarksFromManifest';
import { createSkyAndAtmosphere, type SkyResult } from './createSkyAndAtmosphere';
import { createWater } from './createWater';
import { createDistantMountains } from './createDistantMountains';

export type HeightSampler = (x: number, z: number) => number;

export interface ZoneLoadResult {
  terrain: TerrainResult;
  sky: SkyResult;
  updateWind: (dt: number) => void;
}

function buildExclusionData(manifest: ZoneManifest): ExclusionData {
  const roadSegments: ExclusionData['roadSegments'] = [];
  for (const road of manifest.roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      roadSegments.push({
        ax: a.x, az: a.z,
        bx: b.x, bz: b.z,
        width: road.width,
      });
    }
  }

  const waterBodies: ExclusionData['waterBodies'] = manifest.water.map((w) => ({
    x: w.position.x,
    z: w.position.z,
    radiusX: w.size.width * 0.5,
    radiusZ: w.size.depth * 0.5,
  }));

  const landmarks: ExclusionData['landmarks'] = manifest.landmarks.map((lm) => ({
    x: lm.position.x,
    z: lm.position.z,
    radius: (lm.scale ?? 1) * 5,
  }));

  const spawns: ExclusionData['spawns'] = manifest.spawns.map((sp) => ({
    x: sp.position.x,
    z: sp.position.z,
    radius: sp.radius ?? 5,
  }));

  return { roadSegments, waterBodies, landmarks, spawns };
}

export async function loadZoneFromManifest(
  manifest: ZoneManifest,
  scene: Scene,
  quality: QualitySettings
): Promise<ZoneLoadResult> {
  const terrain = createTerrainFromManifest(manifest.terrain, scene, quality);
  const h = terrain.getHeightAt;

  const exclusions = buildExclusionData(manifest);
  const foliageResult = await createFoliageFromManifest(
    manifest.foliage, scene, quality, h, exclusions
  );

  createRocksFromManifest(manifest.rocks, scene, quality, h);

  for (const road of manifest.roads) {
    createRoadFromManifest(road, scene, h);
  }

  for (const landmark of manifest.landmarks) {
    if (landmark.type === 'shrine') {
      createShrineFromManifest(landmark, scene, h);
    } else {
      createLandmarksFromManifest(landmark, scene, h);
    }
  }

  for (const water of manifest.water) {
    createWater(water, scene, h);
  }

  const sky = createSkyAndAtmosphere(scene, quality);
  createDistantMountains(scene);

  return {
    terrain,
    sky,
    updateWind: foliageResult.updateWind,
  };
}

function createRocksFromManifest(
  rocks: RockGroup[],
  scene: Scene,
  quality: QualitySettings,
  getHeightAt: (x: number, z: number) => number
): void {
  const rockMat = new StandardMaterial('rockMat', scene);
  rockMat.diffuseColor = new Color3(0.15, 0.15, 0.16);
  rockMat.specularColor = new Color3(0.03, 0.03, 0.03);
  rockMat.roughness = 1.0;

  const sourceMesh = MeshBuilder.CreateBox('rock', { width: 2, height: 1.5, depth: 2 }, scene);
  sourceMesh.material = rockMat;

  const allMatrices: number[] = [];
  const tmpPos = new Vector3();
  const tmpRot = Quaternion.Identity();
  const tmpScale = new Vector3();
  const tmpMat = Matrix.Identity();

  for (const group of rocks) {
    const count = Math.max(1, Math.floor(group.count * quality.foliageDensity));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * group.area.radius;
      const x = group.area.centerX + Math.cos(angle) * dist;
      const z = group.area.centerZ + Math.sin(angle) * dist;
      const scale = group.minScale + Math.random() * (group.maxScale - group.minScale);
      const y = getHeightAt(x, z);

      tmpPos.set(x, y + scale * 0.5, z);
      Quaternion.FromEulerAnglesToRef(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3,
        tmpRot
      );
      tmpScale.set(
        scale * (0.7 + Math.random() * 0.6),
        scale * (0.5 + Math.random() * 0.5),
        scale * (0.7 + Math.random() * 0.6)
      );
      Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);

      const arr = new Array(16);
      tmpMat.copyToArray(arr, 0);
      for (let j = 0; j < 16; j++) allMatrices.push(arr[j]);
    }
  }

  if (allMatrices.length > 0) {
    sourceMesh.thinInstanceSetBuffer('matrix', new Float32Array(allMatrices), 16, false);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/game-client/src/world/loadZoneFromManifest.ts
git commit -m "feat(game-client): add exclusion data builder and async zone loading"
```

---

## Task 10: Update `SceneRegistry.ts` and `GameApp.ts` for async scene building

**Files:**
- Modify: `apps/game-client/src/scenes/SceneRegistry.ts`
- Modify: `apps/game-client/src/game/GameApp.ts`

- [ ] **Step 1: Make SceneRegistry async**

Replace all contents of `apps/game-client/src/scenes/SceneRegistry.ts` with:

```typescript
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import {
  buildIronvaleOutskirtsScene,
  type QualitySettings,
} from './IronvaleOutskirtsScene';
import type { DayNightCycle } from '../systems/DayNightCycle';

export type SceneName = 'ironvale_outskirts';

export interface SceneBuildResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
  dayNight: DayNightCycle | null;
  updateWind: (dt: number) => void;
}

type SceneBuilder = (engine: Engine, quality: QualitySettings) => Promise<SceneBuildResult>;

const SCENE_BUILDERS: Record<SceneName, SceneBuilder> = {
  ironvale_outskirts: async (engine, quality) => {
    const result = await buildIronvaleOutskirtsScene(engine, quality);
    return {
      scene: result.scene,
      getHeightAt: result.getHeightAt,
      dayNight: result.dayNight,
      updateWind: result.updateWind,
    };
  },
};

export function getSceneBuilder(name: SceneName): SceneBuilder {
  const builder = SCENE_BUILDERS[name];
  if (!builder) {
    throw new Error(`Unknown scene: ${name}`);
  }
  return builder;
}
```

- [ ] **Step 2: Update GameApp to await scene build and call windUpdate**

In `apps/game-client/src/game/GameApp.ts`, make two changes:

**Change 1:** The scene builder call (around line 91-93) changes from:
```typescript
const builder = getSceneBuilder('ironvale_outskirts');
this.sceneResult = builder(this.engine, this.quality);
this.scene = this.sceneResult.scene;
```
to:
```typescript
const builder = getSceneBuilder('ironvale_outskirts');
this.sceneResult = await builder(this.engine, this.quality);
this.scene = this.sceneResult.scene;
```

**Change 2:** In the `update(dt)` method (around line 208), after the `dayNight` update, add the wind update:
```typescript
if (this.dayNight) this.dayNight.update(dt);
this.sceneResult.updateWind(dt);
```

- [ ] **Step 3: Verify the entire project type-checks**

```bash
pnpm typecheck 2>&1 | tail -20
```

Expected: All packages and apps pass type checking.

- [ ] **Step 4: Verify the project builds**

```bash
pnpm build 2>&1 | tail -20
```

Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add apps/game-client/src/scenes/SceneRegistry.ts apps/game-client/src/game/GameApp.ts
git commit -m "feat(game-client): wire async scene builder and wind updates into game loop"
```

---

## Task 11: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Verify procedural fallback works**

With no GLB files in `public/models/foliage/`, the scene should look identical to before — procedural trees, bushes, and grass rendered with thin instances. Check browser console for:
```
[Foliage] Model pine_tree_01.glb not found, using procedural fallback
[Foliage] Model dead_tree_01.glb not found, using procedural fallback
[Foliage] Model broadleaf_tree_01.glb not found, using procedural fallback
[Foliage] Model grass_tall_patch.glb not found, using procedural fallback
[Foliage] Model bush_01.glb not found, using procedural fallback
```

- [ ] **Step 3: Verify exclusion zones**

Check that no trees appear directly on the road, on water, or overlapping the shrine/gate/bridge landmarks. Compare with the previous version to confirm trees are now absent from those areas.

- [ ] **Step 4: Test with a GLB model (if available)**

If you have a `.glb` model to test with, place it in `apps/game-client/public/models/foliage/pine_tree_01.glb`, refresh the page, and verify:
- The GLB model loads and replaces procedural pine trees
- Thin instances are spread across the zone
- Wind animation is visible (canopy sways, trunk stays)
- No console errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(game-client): GLB foliage pipeline with biome-aware placement and wind shader"
```
