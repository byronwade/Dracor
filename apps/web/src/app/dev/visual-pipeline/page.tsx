export default function VisualPipelinePage() {
  return (
    <div>
      <h1 className="ember-gradient-text mb-6 text-4xl font-black tracking-tight">
        Visual Pipeline
      </h1>

      <div className="space-y-12">
        {/* Overview */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Rendering Overview
          </h2>
          <p className="text-stone-300 leading-relaxed">
            Dracor targets atmospheric dark fantasy visuals rendered entirely in
            the browser. The rendering pipeline is built on Babylon.js 7, using
            WebGPU where available with a WebGL2 fallback. The visual strategy
            prioritizes composition and atmosphere over raw polygon counts —
            dense pine forests, misty valleys, ember-lit shrines, and golden hour
            lighting create mood through environmental storytelling rather than
            brute-force detail.
          </p>
        </section>

        {/* PBR Materials */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            PBR Materials
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            All surfaces use physically-based rendering with the
            metallic/roughness workflow. Materials are authored with albedo,
            normal, metalness, roughness, and ambient occlusion maps. This
            ensures consistent lighting response across the day-night cycle and
            different weather conditions.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Metallic/roughness workflow for all environment and character assets
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Baked ambient occlusion combined with one real-time directional shadow
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Texture atlasing for terrain and foliage to minimize draw calls
            </li>
          </ul>
        </section>

        {/* Instancing */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Hardware Instancing
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            Trees, grass, rocks, and other repeated objects use hardware
            instancing. A single mesh definition is uploaded once, then drawn
            thousands of times with per-instance transform data. This allows
            dense forests of 5,000+ trees to render in a single draw call per
            mesh variant, keeping frame times well within budget.
          </p>
          <div className="card-dark">
            <h3 className="mb-2 font-semibold text-stone-200">Instance Budget</h3>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-stone-400">Trees</p>
                <p className="text-lg font-semibold text-orange-400">~5,000</p>
              </div>
              <div>
                <p className="text-stone-400">Grass Patches</p>
                <p className="text-lg font-semibold text-orange-400">~10,000</p>
              </div>
              <div>
                <p className="text-stone-400">Rocks / Props</p>
                <p className="text-lg font-semibold text-orange-400">~2,000</p>
              </div>
            </div>
          </div>
        </section>

        {/* Terrain Streaming */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Terrain Streaming
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            The world is divided into terrain chunks that stream in and out based
            on the player&apos;s position. A view radius determines which chunks
            are loaded; chunks beyond the radius are disposed to keep memory
            under control. Height data, splat maps, and foliage placement are
            loaded per-chunk, allowing the world to feel vast without loading
            everything upfront.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Chunks stream based on player proximity with configurable view radius
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Under 10MB initial load to reach gameplay
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              LOD system with three detail levels per object for smooth transitions
            </li>
          </ul>
        </section>

        {/* Post-Processing */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Post-Processing
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            A lightweight post-processing pipeline adds visual polish without
            destroying frame budget. Effects are ordered carefully and can be
            toggled individually by the player or automatically by the quality
            tier system.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-dark">
              <h3 className="mb-1 font-semibold text-stone-200">Bloom</h3>
              <p className="text-sm text-stone-400">
                Soft glow on emissive surfaces: ember shrines, torch fire,
                magical effects. Adds warmth and atmosphere to night scenes.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-1 font-semibold text-stone-200">SSAO</h3>
              <p className="text-sm text-stone-400">
                Screen-space ambient occlusion adds contact shadows in crevices,
                under foliage, and around characters for grounded visuals.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-1 font-semibold text-stone-200">Tonemapping</h3>
              <p className="text-sm text-stone-400">
                ACES tonemapping compresses HDR values into displayable range
                while preserving color richness and contrast.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-1 font-semibold text-stone-200">Fog</h3>
              <p className="text-sm text-stone-400">
                Distance fog and height fog create depth and mystery. Doubles as
                a performance tool by hiding pop-in at chunk boundaries.
              </p>
            </div>
          </div>
        </section>

        {/* Quality Tiers */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Quality Tiers
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            Four quality presets automatically adapt to the player&apos;s hardware.
            The system monitors frame time and adjusts tier dynamically, or
            players can lock a specific tier manually. Each tier controls shadow
            resolution, post-processing features, LOD distances, and instance
            counts.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="py-3 pr-4 text-left font-medium text-stone-400">Tier</th>
                  <th className="py-3 pr-4 text-left font-medium text-stone-400">Shadows</th>
                  <th className="py-3 pr-4 text-left font-medium text-stone-400">Post-FX</th>
                  <th className="py-3 text-left font-medium text-stone-400">Target FPS</th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-medium text-orange-400">Ultra</td>
                  <td className="py-3 pr-4">2048px</td>
                  <td className="py-3 pr-4">All enabled</td>
                  <td className="py-3">60</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-medium text-stone-200">High</td>
                  <td className="py-3 pr-4">1024px</td>
                  <td className="py-3 pr-4">Bloom + Tonemap</td>
                  <td className="py-3">60</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-medium text-stone-200">Medium</td>
                  <td className="py-3 pr-4">512px</td>
                  <td className="py-3 pr-4">Tonemap only</td>
                  <td className="py-3">30</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-stone-200">Low</td>
                  <td className="py-3 pr-4">Off</td>
                  <td className="py-3 pr-4">None</td>
                  <td className="py-3">30</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
