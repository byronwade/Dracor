# Photoreal Rendering Upgrade — Roadmap

> **For agentic workers:** This is a roadmap, not an executable plan. It frames four detailed plans (A, B, C, D) that should be executed in order. Each detailed plan lives in its own file and uses checkbox (`- [ ]`) syntax for task tracking.

**Goal:** Push the Dracor game client toward UE4-tier stylized realism (Elden Ring / Witcher 3 vibe) on the ultra quality tier, leveraging Babylon.js 9 and WebGPU. Browser-realistic, not Unreal-Engine-5-realistic — Lumen/Nanite/hardware RT aren't reachable in WebGL2/WebGPU today.

**Art direction:** Dark fantasy frontier. Heavy atmosphere, dramatic lighting, rich saturated colors, painterly fog. Inspired by Ironvale Outskirts as a dark pine frontier at dusk.

**Performance budget (ultra tier):** 16.6ms/frame (60 FPS) on RTX 3070+ at 1080p. F3 dev panel verifies budget after each phase.

**Phase 0 — completed:** broken-thing fixes have already landed in the working tree:
- HDR environment path corrected (`/environment/qwantani_sunset_2k.hdr`)
- Duplicate sky system removed (Babylon `SkyMaterial` via `SkyEnhancer` is the single source)
- Shadow quality wired to quality settings (ultra now uses 2048 map, 4 cascades, PCF soft filtering)
- Terrain shader now samples `*_arm.webp` textures and uses Cook-Torrance PBR lighting
- `SSAOEnhancer` registered in the enhancer array (was previously orphaned)

---

## Plan Index

Each plan stands alone — Plan A produces working, testable software on its own, and Plan B/C/D each build on what shipped previously. Execute in order.

### [Plan A — Lighting & Reflections](2026-05-27-photoreal-plan-a-lighting.md)
Foundations of physically-based light. SSR for puddles and water, volumetric god rays from the sun through trees, lens flare, dynamic reflection probe to fix IBL drift, contact shadows under foliage. **Biggest single visual leap.**

Key Babylon APIs: `SSRRenderingPipeline`, `VolumetricLightScatteringPostProcess`, `LensFlareSystem`, `ReflectionProbe`.

### [Plan B — Surfaces & Materials](2026-05-27-photoreal-plan-b-surfaces.md)
Parallax occlusion mapping on terrain, subsurface scattering on foliage and grass (so the sun glows through leaves), proper PBR water with depth-based transparency, refraction, caustics, edge foam, micro-detail normal overlay for close-up surfaces, decal system for ground details.

Key Babylon APIs: `PBRMaterial.subSurface`, `MaterialPluginBase`, `DecalMapConfiguration`, custom shader extensions to terrain.

### [Plan C — Atmosphere & Weather](2026-05-27-photoreal-plan-c-atmosphere.md)
Volumetric height fog with noise-driven density, dynamic weather particles (rain, snow, drifting dust), cloud shadows projected onto terrain, richer ambient particles (motes, fireflies, falling leaves), atmospheric refraction near the horizon, replace cylinder-mountains with proper heightfield meshes.

Key Babylon APIs: custom volumetric fog post-process, `ParticleSystem`, `ProjectionTexture` on directional light.

### [Plan D — Camera & Post-Processing](2026-05-27-photoreal-plan-d-camera.md)
Replace FXAA with TAA, add camera motion blur, cinematic depth of field with bokeh, LUT-based color grading, finalize the cinematic look. Tune exposure, contrast, vignette, grain.

Key Babylon APIs: `DefaultRenderingPipeline.depthOfField`, `MotionBlurPostProcess`, `ImageProcessingConfiguration.colorGradingTexture`.

---

## Cross-Cutting Decisions Locked In

These apply to every plan. They were resolved during brainstorming and shouldn't be relitigated mid-execution.

- **Quality tier scope.** All upgrades target ultra only. The `QualitySettings.tier === 'ultra'` check gates every new system. Lower tiers keep their current visuals.
- **Custom shader vs PBRMaterial.** The terrain stays on a custom `ShaderMaterial` (it has too much custom logic to migrate). PBR lighting math (Cook-Torrance BRDF) lives inside the custom shader. Other surfaces — foliage, water, props — can use `PBRMaterial` directly.
- **WebGPU vs WebGL2.** Ultra tier prefers WebGPU when available (compute shaders, better validation). Code must still run on WebGL2 — never assume WebGPU at runtime; check `engine.isWebGPU` for compute-shader paths.
- **Atmosphere drives lighting.** All directional/ambient color and intensity changes flow through `BabylonAtmosphereRenderer.update(state)`. New systems hook into it via the enhancer pattern, not by directly mutating lights.
- **Visual verification is the test.** For rendering work, "the test" is loading the dev server, comparing screenshots before/after, and confirming F3 frame time stays under 16.6ms. Unit tests cover shader compilation and config math only.

---

## Execution Order & Dependencies

```
Phase 0 (DONE) ──→ Plan A ──→ Plan B ──→ Plan C ──→ Plan D
                    │
                    └── Plan A is foundation: SSR + IBL + god rays
                        unblock Plan B's water and Plan C's volumetric fog
```

- Plan A must ship first — its reflection probe and SSR are dependencies for Plan B's PBR water.
- Plans C and D have no hard dependencies on each other but are sequenced for compounding visual impact.
- Each plan is one PR. Don't merge plans together.

---

## Out of Scope (Don't Pursue)

The advisor flagged these as not reachable or not worth the cost:

- **Hardware tessellation / displacement.** WebGL2 doesn't have it; WebGPU's support in Babylon 9 isn't production-ready.
- **True real-time GI (Lumen-style).** Only Screen-Space GI approximations (SSGI) or baked probes. SSGI is in Plan A as a stretch goal but not core.
- **Nanite-style virtualized geometry.** Not happening in a browser.
- **Per-object motion blur via velocity buffer.** Plan D does camera motion blur only — per-object is expensive and finicky for marginal gain.
- **Hardware ray tracing.** No browser API exists.

---

## Self-Review Checklist (For Each Sub-Plan)

When writing Plan A/B/C/D, verify:
- [ ] Every task has exact file paths (no globs, no "files like X")
- [ ] Every code step shows complete code, not placeholders
- [ ] Visual verification steps name a specific thing to look for ("the puddle near the shrine reflects the sky")
- [ ] Performance budget step appears at the end of each phase
- [ ] Types/method signatures defined in earlier tasks are still used the same way in later tasks
- [ ] Quality-tier gating (`if (quality.tier !== 'ultra') return;`) is in every new system
