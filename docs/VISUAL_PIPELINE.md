# Visual Pipeline

## Art Direction

Dracor targets stylized semi-realistic dark fantasy. Not photorealistic, not cartoonish. The goal is atmospheric landscapes that read as handcrafted rather than procedurally generated or stock-asset assembled. Think painted environments with modern lighting.

## Composition First

Sky, fog, lighting, and color do more for visual quality than polygon count. A scene with 50K triangles and great atmospheric composition will look better than 500K triangles with flat lighting. Every zone starts with sky gradient, fog distance, light angle, and color palette before any geometry is placed.

## PBR Materials Workflow

All materials use the metallic/roughness PBR model:

- **Roughness** controls surface sheen — stone is rough (0.8+), metal is smooth (0.2-0.4)
- **Metallic** is binary in practice — metal objects are 1.0, everything else is 0.0
- **Emissive** is reserved for magic effects — ember glows, memory marks, shrine pulses, UI highlights
- **Normal maps** add surface detail without geometry cost
- **Ambient occlusion** baked into textures for contact shadows

Materials are defined as presets in `renderer-core` and referenced by name in zone manifests.

## Asset Format: GLB/GLTF

All 3D assets follow this pipeline:

1. Model in Blender
2. UV unwrap and texture in Blender or Substance
3. Export as GLB (binary GLTF — single file, includes textures)
4. Optional: run through gltf-transform for compression (Draco mesh, KTX2 textures)
5. Load at runtime via Babylon.js SceneLoader

GLB is the universal format. No proprietary formats. No FBX at runtime.

## Texture Compression

| Environment | Format | Why |
|-------------|--------|-----|
| Production | KTX2 / Basis Universal | GPU-compressed, ~4x smaller than PNG, decoded on GPU |
| Development | PNG | Human-readable, easy to inspect, no toolchain required |

Texture conversion from PNG to KTX2 happens in the asset pipeline build step, not at runtime.

## Terrain Chunking

Terrain is divided into 100m x 100m chunks:

- Each chunk has a heightmap (grayscale texture or procedural function)
- Chunks are loaded/unloaded based on player distance
- 3 LOD levels per chunk: full detail (near), simplified (mid), minimal (far)
- Chunk seams are handled by overlapping edges by one vertex row
- The terrain system queries chunk data for physics collision (height at x,z)

## Instanced Foliage

Trees, grass, rocks, and other repeated objects use hardware instancing:

- One mesh uploaded to GPU, drawn many times with different transforms
- Instance data (position, rotation, scale) stored in a buffer
- Culling removes instances outside the camera frustum
- LOD switches instances to simpler meshes at distance
- Grass uses billboards beyond a threshold distance

Instance counts per quality tier are defined in `renderer-core/performance/PerformanceBudget.ts`.

## LOD Strategy

Every significant object has 3 LOD levels:

| Level | Distance | Detail |
|-------|----------|--------|
| LOD 0 | 0-50m | Full geometry, full textures, all material maps |
| LOD 1 | 50-150m | Simplified geometry (50% triangles), half-res textures |
| LOD 2 | 150m+ | Billboard impostor or 10% triangle mesh, quarter-res textures |

LOD transitions use distance-based switching with hysteresis (switch up at a different distance than switch down) to prevent flickering.

## Baked vs Dynamic Lighting

- **Baked ambient occlusion:** Stored in AO texture channel. Provides contact shadows in corners, under overhangs, between rocks. Zero runtime cost.
- **Dynamic directional light:** One sun/moon light casts real-time shadows. Shadow map resolution scales by quality tier (512px to 2048px).
- **No dynamic point lights in the initial build.** Campfires, torches, and magic effects use emissive materials and bloom, not shadow-casting point lights.
- Future: add 2-4 dynamic point lights for important gameplay moments (boss encounters, shrine activation).

## Water

Not implemented in the initial build. Future plan:

- Reflective plane with animated normal maps for surface ripple
- Fresnel-based transparency (see-through at steep angles, reflective at shallow)
- Foam at shoreline using alpha-blended particles
- No underwater rendering initially

## Post-Processing

Post-processing effects applied in order:

| Effect | Purpose | Quality Tier |
|--------|---------|-------------|
| Tonemapping | Map HDR to screen range, warm the palette | All tiers |
| Bloom | Glow on emissive surfaces (magic, fire, shrines) | High and above |
| SSAO | Screen-space ambient occlusion for depth and contact shadows | Ultra only |
| Vignette | Darken screen edges for cinematic framing | High and above |

Effects are configured per quality tier in `renderer-core/postprocessing/postProcessingPresets.ts`.

## Visual Debugging

Development tools for visual inspection:

- **Performance overlay (F3):** FPS, draw calls, triangle count, texture memory, active instances
- **Wireframe toggle:** See mesh density and LOD boundaries
- **LOD visualization:** Color-code objects by current LOD level (green = LOD 0, yellow = LOD 1, red = LOD 2)
- **Bounding box display:** Show collision volumes and trigger zones
- **Chunk boundaries:** Visualize terrain chunk borders and loading states

## When to Consider Unreal

If Dracor reaches a point where it needs AAA cinematic cutscenes, massive seamless worlds beyond browser memory limits, or hardware-accelerated ray tracing, a native client built in Unreal Engine 5 becomes worth evaluating. But the browser foundation comes first. The web client is the primary platform. A native client would be supplementary, not a replacement.

## WebGPU Future

WebGPU is the successor to WebGL. When browser support reaches broad adoption:

- **Compute shaders** for grass simulation, particle physics, and water dynamics
- **Indirect drawing** for more efficient instancing
- **Better texture formats** and bindless resources
- **Reduced driver overhead** for higher draw call budgets

Babylon.js already supports WebGPU as a rendering backend. The migration path is engine-level — game code and assets remain unchanged. Quality tiers in `renderer-core` already define a separate "ultra" tier that maps to WebGPU capabilities.
