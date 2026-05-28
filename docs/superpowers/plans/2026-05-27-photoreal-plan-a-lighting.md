# Plan A — Lighting & Reflections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Screen Space Reflections, dynamic environment probe (replacing baked HDR), volumetric god rays from the sun, lens flare, and contact shadows on the ultra quality tier — making the Ironvale Outskirts scene feel physically illuminated.

**Architecture:** Each new system lives as a `SceneEnhancer` in `apps/game-client/src/scenes/enhancers/`, gated by `quality.tier === 'ultra'`, registered in `IronvaleOutskirtsScene.ts`. Sun direction flows from the atmosphere engine into each system via the `update(state)` callback. The reflection probe replaces the static HDR cube and updates every frame for moving sun/atmosphere.

**Tech Stack:** Babylon.js 9.0, `SSRRenderingPipeline`, `ReflectionProbe`, `VolumetricLightScatteringPostProcess`, `LensFlareSystem`, custom contact-shadow post-process.

**Prereq (Phase 0):** Already complete on `main` — HDR path fixed, sky deduplicated, shadows wired to quality settings, terrain shader upgraded to Cook-Torrance PBR with ARM textures, SSAOEnhancer registered.

---

## File Structure

**Create:**
- `apps/game-client/src/scenes/enhancers/SSREnhancer.ts` — Screen Space Reflections
- `apps/game-client/src/scenes/enhancers/ReflectionProbeEnhancer.ts` — dynamic env probe
- `apps/game-client/src/scenes/enhancers/GodRaysEnhancer.ts` — volumetric light scattering
- `apps/game-client/src/scenes/enhancers/LensFlareEnhancer.ts` — sun lens flare
- `apps/game-client/src/scenes/enhancers/ContactShadowsEnhancer.ts` — short-range contact shadows
- `apps/game-client/src/__tests__/enhancers.test.ts` — shader compilation + config tests

**Modify:**
- `apps/game-client/src/scenes/enhancers/index.ts` — export new enhancers
- `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts` — register new enhancers
- `apps/game-client/src/scenes/enhancers/HDREnvEnhancer.ts` — defer to ReflectionProbeEnhancer when probe is active

**Delete:** none.

---

## Task 1: SSREnhancer skeleton + ultra-tier gate

**Files:**
- Create: `apps/game-client/src/scenes/enhancers/SSREnhancer.ts`

- [ ] **Step 1: Create the enhancer file**

```typescript
// apps/game-client/src/scenes/enhancers/SSREnhancer.ts
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class SSREnhancer implements SceneEnhancer {
  readonly name = 'SSR';
  readonly priority = 45;
  private pipeline: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.tier !== 'ultra') return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;

    const { SSRRenderingPipeline } = await import(
      '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssrRenderingPipeline'
    );
    await import('@babylonjs/core/Rendering/depthRendererSceneComponent');
    await import('@babylonjs/core/Rendering/geometryBufferRendererSceneComponent');
    await import('@babylonjs/core/Rendering/prePassRendererSceneComponent');

    const ssr = new SSRRenderingPipeline(
      'ssr',
      ctx.scene,
      [camera],
      false,
      0,
    );
    ssr.thickness = 0.1;
    ssr.selfCollisionNumSkip = 2;
    ssr.enableSmoothReflections = true;
    ssr.environmentTexture = ctx.scene.environmentTexture as any;
    ssr.environmentTextureIsProbe = false;
    ssr.maxSteps = 256;
    ssr.maxDistance = 1000;
    ssr.roughnessFactor = 0.2;
    ssr.reflectivityThreshold = 0.04;
    ssr.blurDispersionStrength = 0.05;
    ssr.blurQuality = 1;

    this.pipeline = ssr;
    console.log('[SSR] Pipeline configured for ultra tier');
  }

  dispose(): void {
    this.pipeline?.dispose();
  }
}
```

- [ ] **Step 2: Register the export in `index.ts`**

Open `apps/game-client/src/scenes/enhancers/index.ts` and replace its contents with:

```typescript
export type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';
export { runEnhancers } from './SceneEnhancer';
export { SkyEnhancer } from './SkyEnhancer';
export { HDREnvEnhancer } from './HDREnvEnhancer';
export { ShadowsEnhancer } from './ShadowsEnhancer';
export { PostProcessEnhancer } from './PostProcessEnhancer';
export { SSAOEnhancer } from './SSAOEnhancer';
export { SSREnhancer } from './SSREnhancer';
export { ReflectionProbeEnhancer } from './ReflectionProbeEnhancer';
export { GodRaysEnhancer } from './GodRaysEnhancer';
export { LensFlareEnhancer } from './LensFlareEnhancer';
export { ContactShadowsEnhancer } from './ContactShadowsEnhancer';
```

(The other four exports won't resolve yet — they're created in later tasks. That's expected; TypeScript will fail until Task 5 lands. Don't try to run typecheck after this step.)

- [ ] **Step 3: Verify shader compilation test placeholder**

Create `apps/game-client/src/__tests__/enhancers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SSREnhancer } from '../scenes/enhancers/SSREnhancer';

describe('SSREnhancer', () => {
  it('has a name and priority', () => {
    const e = new SSREnhancer();
    expect(e.name).toBe('SSR');
    expect(e.priority).toBe(45);
  });
});
```

(Vitest isn't configured yet. If `pnpm --filter @dracor/game-client test` fails with "no test runner", skip this step — visual verification covers it.)

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/scenes/enhancers/SSREnhancer.ts apps/game-client/src/scenes/enhancers/index.ts apps/game-client/src/__tests__/enhancers.test.ts
git commit -m "feat(rendering): scaffold SSR enhancer with ultra-tier gate"
```

---

## Task 2: ReflectionProbeEnhancer — dynamic env probe

**Files:**
- Create: `apps/game-client/src/scenes/enhancers/ReflectionProbeEnhancer.ts`
- Modify: `apps/game-client/src/scenes/enhancers/HDREnvEnhancer.ts`

The static HDR cube doesn't update when the atmosphere changes (sun moves, clouds shift). A `ReflectionProbe` re-renders every N frames from the player position, capturing the live sky + nearby terrain into a dynamic cubemap that becomes `scene.environmentTexture`. SSR then samples it for off-screen fallback.

- [ ] **Step 1: Create the probe enhancer**

```typescript
// apps/game-client/src/scenes/enhancers/ReflectionProbeEnhancer.ts
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

const PROBE_RESOLUTION = 256;
const PROBE_UPDATE_INTERVAL_MS = 500;

export class ReflectionProbeEnhancer implements SceneEnhancer {
  readonly name = 'Reflection Probe';
  readonly priority = 18; // before HDREnv (20) so we can take over
  private probe: ReflectionProbe | null = null;
  private scene: Scene | null = null;
  private lastUpdate = 0;
  private observer: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.tier !== 'ultra') return;
    this.scene = ctx.scene;

    this.probe = new ReflectionProbe('envProbe', PROBE_RESOLUTION, ctx.scene);
    this.probe.refreshRate = 0; // we drive it manually
    this.probe.position = new Vector3(0, 10, 0);

    // Render skybox + distant mountains + terrain into the probe
    const renderList = this.probe.renderList!;
    for (const mesh of ctx.scene.meshes) {
      if (this.shouldRenderToProbe(mesh)) renderList.push(mesh);
    }
    ctx.scene.onNewMeshAddedObservable.add((mesh: AbstractMesh) => {
      if (this.shouldRenderToProbe(mesh)) renderList.push(mesh);
    });

    ctx.scene.environmentTexture = this.probe.cubeTexture;
    ctx.scene.environmentIntensity = 0.7;

    this.observer = ctx.scene.onBeforeRenderObservable.add(() => this.tick());
    console.log('[ReflectionProbe] Active at 2Hz update rate');
  }

  private shouldRenderToProbe(mesh: AbstractMesh): boolean {
    const n = mesh.name;
    return (
      n === 'skyDome' ||
      n.startsWith('distPeak_') ||
      n.startsWith('distCap_') ||
      n.startsWith('distSub_') ||
      n.startsWith('terrain_')
    );
  }

  private tick(): void {
    if (!this.probe || !this.scene) return;
    const now = performance.now();
    if (now - this.lastUpdate < PROBE_UPDATE_INTERVAL_MS) return;
    this.lastUpdate = now;

    const cam = this.scene.activeCamera;
    if (cam) {
      this.probe.position.set(cam.position.x, cam.position.y + 4, cam.position.z);
    }
    this.probe.cubeTexture.render();
  }

  dispose(): void {
    if (this.observer && this.scene) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
    }
    this.probe?.dispose();
  }
}
```

- [ ] **Step 2: Make HDREnvEnhancer step aside when the probe is active**

Open `apps/game-client/src/scenes/enhancers/HDREnvEnhancer.ts` and replace its contents with:

```typescript
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class HDREnvEnhancer implements SceneEnhancer {
  readonly name = 'HDR Environment';
  readonly priority = 20;
  private hdr: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    // If ReflectionProbeEnhancer already set environmentTexture, defer to it
    if (ctx.scene.environmentTexture) {
      console.log('[HDREnv] Skipped — reflection probe is providing environment');
      return;
    }
    const { HDRCubeTexture } = await import('@babylonjs/core/Materials/Textures/hdrCubeTexture');
    this.hdr = new HDRCubeTexture('/environment/qwantani_sunset_2k.hdr', ctx.scene, 128);
    ctx.scene.environmentTexture = this.hdr;
    ctx.scene.environmentIntensity = 0.5;
  }

  dispose(): void {
    this.hdr?.dispose();
  }
}
```

- [ ] **Step 3: Visual verification**

Run the dev server:

```bash
pnpm --filter @dracor/game-client dev
```

Open `localhost:5173`, log in, enter world. Expected: the scene loads normally. With the inspector open (Ctrl+Alt+I), there should be a "envProbe" texture in the textures list, and `scene.environmentTexture` should reference a `RenderTargetTexture` not an `HDRCubeTexture` on ultra tier.

If the scene goes dark or PBR materials lose all reflection, the probe isn't capturing. Check the browser console for `[ReflectionProbe] Active at 2Hz update rate`.

- [ ] **Step 4: Commit**

```bash
git add apps/game-client/src/scenes/enhancers/ReflectionProbeEnhancer.ts apps/game-client/src/scenes/enhancers/HDREnvEnhancer.ts
git commit -m "feat(rendering): add dynamic reflection probe for ultra tier"
```

---

## Task 3: GodRaysEnhancer — volumetric light scattering from sun

**Files:**
- Create: `apps/game-client/src/scenes/enhancers/GodRaysEnhancer.ts`

Volumetric light scattering takes a bright object (a sun sphere placed at the directional light's direction × 500) and ray-marches outward in screen space, producing god rays through fog and trees. Babylon ships `VolumetricLightScatteringPostProcess`.

- [ ] **Step 1: Create the enhancer**

```typescript
// apps/game-client/src/scenes/enhancers/GodRaysEnhancer.ts
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import type { AtmosphereState } from '@dracor/atmosphere';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

const SUN_DISTANCE = 500;

export class GodRaysEnhancer implements SceneEnhancer {
  readonly name = 'God Rays';
  readonly priority = 55; // after SSAO (50)
  private vls: any = null;
  private sunMesh: Mesh | null = null;
  private scene: Scene | null = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.tier !== 'ultra') return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;
    this.scene = ctx.scene;

    const { VolumetricLightScatteringPostProcess } = await import(
      '@babylonjs/core/PostProcesses/volumetricLightScatteringPostProcess'
    );

    // Sun proxy — small bright sphere at the light's direction
    this.sunMesh = MeshBuilder.CreateSphere('sunProxy', { diameter: 30, segments: 8 }, ctx.scene);
    const sunMat = new StandardMaterial('sunProxyMat', ctx.scene);
    sunMat.emissiveColor = new Color3(1.0, 0.85, 0.55);
    sunMat.diffuseColor = Color3.Black();
    sunMat.specularColor = Color3.Black();
    sunMat.disableLighting = true;
    this.sunMesh.material = sunMat;
    this.sunMesh.isPickable = false;
    this.sunMesh.applyFog = false;
    this.sunMesh.infiniteDistance = true;

    this.vls = new VolumetricLightScatteringPostProcess(
      'godRays',
      1.0,
      camera,
      this.sunMesh,
      80,
      undefined,
      ctx.scene.getEngine(),
      false,
    );
    this.vls.exposure = 0.15;
    this.vls.decay = 0.96;
    this.vls.weight = 0.6;
    this.vls.density = 0.9;
    console.log('[GodRays] Volumetric scattering active');
  }

  update(state: AtmosphereState): void {
    if (!this.sunMesh) return;
    const d = state.sky.sunDirection;
    // Place sun at -direction × distance so it appears where the light comes from
    this.sunMesh.position.set(-d.x * SUN_DISTANCE, -d.y * SUN_DISTANCE, -d.z * SUN_DISTANCE);

    // Dim god rays when sun is below horizon
    const altitude = -d.y;
    if (this.vls) {
      this.vls.exposure = Math.max(0, altitude) * 0.18;
    }
  }

  dispose(): void {
    this.vls?.dispose(this.scene?.activeCamera);
    this.sunMesh?.dispose();
  }
}
```

- [ ] **Step 2: Visual verification**

Run `pnpm --filter @dracor/game-client dev`. Look toward the sun (orbit camera with right-click drag). Expected: visible god rays streaming outward from the sun through trees. They should be subtle — too obvious looks game-y, not cinematic. Adjust `vls.exposure` if too strong/weak.

When the atmosphere engine ticks to night, rays should fade out (sun goes below horizon).

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/scenes/enhancers/GodRaysEnhancer.ts
git commit -m "feat(rendering): volumetric god rays from sun on ultra tier"
```

---

## Task 4: LensFlareEnhancer — sun flare elements

**Files:**
- Create: `apps/game-client/src/scenes/enhancers/LensFlareEnhancer.ts`

- [ ] **Step 1: Create the enhancer**

```typescript
// apps/game-client/src/scenes/enhancers/LensFlareEnhancer.ts
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LensFlareSystem } from '@babylonjs/core/LensFlares/lensFlareSystem';
import { LensFlare } from '@babylonjs/core/LensFlares/lensFlare';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { AtmosphereState } from '@dracor/atmosphere';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';
import '@babylonjs/core/LensFlares/lensFlareSystemSceneComponent';

const SUN_DISTANCE = 500;

export class LensFlareEnhancer implements SceneEnhancer {
  readonly name = 'Lens Flare';
  readonly priority = 60;
  private system: LensFlareSystem | null = null;
  private anchor: Mesh | null = null;
  private scene: Scene | null = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.tier !== 'ultra') return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;
    this.scene = ctx.scene;

    // Reuse existing sunProxy if GodRays already created one; otherwise create our own
    let anchor = ctx.scene.getMeshByName('sunProxy') as Mesh | null;
    if (!anchor) {
      anchor = MeshBuilder.CreateSphere('lensFlareAnchor', { diameter: 1, segments: 4 }, ctx.scene);
      const m = new StandardMaterial('lensFlareAnchorMat', ctx.scene);
      m.alpha = 0;
      anchor.material = m;
      anchor.isPickable = false;
      anchor.isVisible = false;
      this.anchor = anchor;
    }

    this.system = new LensFlareSystem('sunFlare', anchor, ctx.scene);
    // Procedural data URLs — small circular gradients in different colors.
    // We use a single white-disc texture and tint via the color property.
    new LensFlare(0.5, 0, new Color3(1.0, 0.85, 0.5), this.flareDataUrl('1.0,0.85,0.5'), this.system);
    new LensFlare(0.18, 0.2, new Color3(0.95, 0.7, 0.4), this.flareDataUrl('0.95,0.7,0.4'), this.system);
    new LensFlare(0.10, 0.55, new Color3(0.8, 0.5, 0.3), this.flareDataUrl('0.8,0.5,0.3'), this.system);
    new LensFlare(0.06, 0.9, new Color3(0.6, 0.4, 0.2), this.flareDataUrl('0.6,0.4,0.2'), this.system);
    new LensFlare(0.22, 1.25, new Color3(0.4, 0.3, 0.5), this.flareDataUrl('0.4,0.3,0.5'), this.system);

    console.log('[LensFlare] Sun lens flare active');
  }

  private flareDataUrl(color: string): string {
    // 32×32 radial gradient PNG encoded as data URL.
    // Generated procedurally so we don't ship texture assets for this.
    const [r, g, b] = color.split(',').map(parseFloat);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    const rgb = `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return canvas.toDataURL('image/png');
  }

  update(state: AtmosphereState): void {
    if (!this.system) return;
    // Hide flares at night (sun below horizon)
    const altitude = -state.sky.sunDirection.y;
    this.system.borderLimit = altitude > 0 ? 1.0 : 0.0;
  }

  dispose(): void {
    this.system?.dispose();
    this.anchor?.dispose();
  }
}
```

- [ ] **Step 2: Visual verification**

Reload the game. Point the camera roughly at the sun. Expected: 4–5 colored discs in a line from the sun across the frame, fading as you look away. Should NOT appear when sun is below horizon.

If flares are too intense, reduce the first arg to each `new LensFlare()` (scale factor).

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/scenes/enhancers/LensFlareEnhancer.ts
git commit -m "feat(rendering): sun lens flare with atmosphere-driven visibility"
```

---

## Task 5: ContactShadowsEnhancer — short-range AO under foliage

**Files:**
- Create: `apps/game-client/src/scenes/enhancers/ContactShadowsEnhancer.ts`

Babylon doesn't ship a standalone contact-shadow post-process. We approximate by adjusting SSAO parameters for a second, tighter pass — short radius (0.3m), high contrast — that adds dark contact AO at the base of foliage and props. We layer it on top of the existing SSAO.

- [ ] **Step 1: Create the enhancer**

```typescript
// apps/game-client/src/scenes/enhancers/ContactShadowsEnhancer.ts
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class ContactShadowsEnhancer implements SceneEnhancer {
  readonly name = 'Contact Shadows';
  readonly priority = 52; // after SSAO (50), before god rays (55)
  private pipeline: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.tier !== 'ultra') return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;

    const { SSAO2RenderingPipeline } = await import(
      '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline'
    );
    await import('@babylonjs/core/Rendering/depthRendererSceneComponent');

    this.pipeline = new SSAO2RenderingPipeline('contactShadows', ctx.scene, {
      ssaoRatio: 1.0,
      blurRatio: 1.0,
    });
    this.pipeline.radius = 0.3;
    this.pipeline.totalStrength = 1.4;
    this.pipeline.base = 0.05;
    this.pipeline.samples = 12;
    this.pipeline.maxZ = 8; // tight radius — only nearby contact
    this.pipeline.minZAspect = 0.5;
    this.pipeline.epsilon = 0.005;
    ctx.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
      'contactShadows', camera,
    );
    console.log('[ContactShadows] Tight-radius AO active');
  }

  dispose(): void {
    this.pipeline?.dispose();
  }
}
```

- [ ] **Step 2: Visual verification**

Reload the game. Walk near a tree or boulder. Expected: a darker shaded band where the object meets the ground, distinct from the broader SSAO darkening. Without contact shadows, objects appear to float slightly above terrain.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/scenes/enhancers/ContactShadowsEnhancer.ts
git commit -m "feat(rendering): tight-radius AO pass for contact shadows"
```

---

## Task 6: Register all new enhancers in the scene builder

**Files:**
- Modify: `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts:580-588`

- [ ] **Step 1: Update the enhancer registration block**

Open `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts`. Find the `scene.onAfterRenderObservable.addOnce` block (currently around line 580). Replace it with:

```typescript
  scene.onAfterRenderObservable.addOnce(async () => {
    try {
      const {
        runEnhancers,
        SkyEnhancer,
        ReflectionProbeEnhancer,
        HDREnvEnhancer,
        ShadowsEnhancer,
        SSAOEnhancer,
        ContactShadowsEnhancer,
        SSREnhancer,
        GodRaysEnhancer,
        LensFlareEnhancer,
        PostProcessEnhancer,
      } = await import('./enhancers');
      const enhancers = await runEnhancers({ scene, quality }, [
        new SkyEnhancer(),
        new ReflectionProbeEnhancer(),
        new HDREnvEnhancer(),
        new ShadowsEnhancer(),
        new SSAOEnhancer(),
        new ContactShadowsEnhancer(),
        new SSREnhancer(),
        new GodRaysEnhancer(),
        new LensFlareEnhancer(),
        new PostProcessEnhancer(),
      ]);
      (scene as any).__enhancers = enhancers;
      console.log(`[Scene] ${enhancers.length} enhancers active`);
    } catch (err) {
      console.warn('[Scene] Enhancers failed:', err);
    }
  });
```

The order matters — priority numbers control init order, but listing them in the priority order makes the file readable.

- [ ] **Step 2: Run the typecheck**

```bash
pnpm --filter @dracor/game-client typecheck
```

Expected: no errors. If the SSR pipeline import path is wrong (Babylon 9 sometimes shifts paths), fix in `SSREnhancer.ts` and re-run.

- [ ] **Step 3: Commit**

```bash
git add apps/game-client/src/scenes/IronvaleOutskirtsScene.ts
git commit -m "feat(rendering): register lighting enhancers in scene builder"
```

---

## Task 7: Performance verification

**Files:** none modified — observation only.

- [ ] **Step 1: Build the client**

```bash
pnpm --filter @dracor/game-client build
```

Expected: build succeeds. Bundle size grows by ~50KB (the SSR/probe code), still under any soft budget.

- [ ] **Step 2: Run dev and measure frame time**

```bash
pnpm --filter @dracor/game-client dev
```

Load `localhost:5173`, enter world, press F3 to open the dev panel. Expected:
- Frame time stays under 16.6ms on ultra (60 FPS budget)
- Draw call count is healthy (typically < 800 with all enhancers active)
- VRAM usage from probe + SSR adds ~50MB

If frame time exceeds budget:
- Drop probe resolution from 256 → 128 (`PROBE_RESOLUTION` in `ReflectionProbeEnhancer.ts`)
- Lower SSR `maxSteps` from 256 → 128
- Reduce god-rays `numSamples` from 80 → 60

- [ ] **Step 3: Visual capture**

Take a screenshot of the scene with all enhancers active. Save as `docs/screenshots/plan-a-after.png` (create the directory if missing). Compare to a pre-Plan-A screenshot if you have one.

You should see, in order of obviousness:
1. Reflections in water (SSR)
2. God rays through trees pointing toward the sun
3. Lens flare elements when sun is in frame
4. Darker shading at the base of trees and rocks (contact shadows)
5. Subtly different reflection highlights on shrine metal and water vs. before (dynamic probe)

- [ ] **Step 4: Final commit + push**

```bash
git push origin <branch-name>
```

End of Plan A.

---

## Self-Review Notes

This plan adds five enhancers. Each is independently testable (visual checkpoint per task) and rolls back cleanly (delete the file + remove from the array). All gated on `quality.tier === 'ultra'`, so low/medium/high tiers are unaffected.

**Known limitations:**
- The reflection probe re-renders at 2Hz, so very fast atmosphere transitions (impossible at the current 20-min day length) would show slight lag in reflected sky color.
- SSR only reflects what's on-screen — when the camera looks away from a puddle, distant terrain isn't visible in the reflection. The reflection probe provides off-screen fallback via `ssr.environmentTexture`.
- Lens flare uses procedurally-generated 32×32 PNGs. If the look feels too pixelated, swap in proper texture assets later.

**What ships:** SSR on puddles and water; volumetric god rays; sun lens flare; contact shadows; dynamic environment probe. All on ultra tier. Frame time under budget.

**Next:** Plan B (Surfaces & Materials).
