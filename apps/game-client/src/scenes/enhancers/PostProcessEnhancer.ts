import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { AtmosphereState } from '@dracor/atmosphere';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class PostProcessEnhancer implements SceneEnhancer {
  readonly name = 'Post-Processing';
  readonly priority = 40;
  private pipeline: any = null;
  private baseExposure = 1.35;

  async init(ctx: EnhancerContext): Promise<void> {
    if (!ctx.quality.postProcessingEnabled) return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;

    const { DefaultRenderingPipeline } = await import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline');
    await import('@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent');

    const pipeline = new DefaultRenderingPipeline('cinematicPipeline', true, ctx.scene, [camera]);
    this.pipeline = pipeline;

    // Bloom — sun, lava, emissives, lens flare halos. Threshold tuned so the sky
    // doesn't bloom out into a white blob.
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 1.0;
    pipeline.bloomWeight = 0.35;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    // Tone mapping — ACES filmic curve
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = 1; // ACES filmic

    // Cinematic exposure + contrast
    pipeline.imageProcessing.exposure = this.baseExposure;
    pipeline.imageProcessing.contrast = 1.18;

    // Color grading — gentle stylized push, NOT heavy crush. Earlier settings (shadowsExposure
    // = -4) made daylit scenes unreadable.
    const { ColorCurves } = await import('@babylonjs/core/Materials/colorCurves');
    const curves = new ColorCurves();
    curves.shadowsHue = 210;
    curves.shadowsSaturation = 6;
    curves.shadowsExposure = 0;
    curves.shadowsDensity = 0;
    curves.midtonesHue = 35;
    curves.midtonesSaturation = 4;
    curves.midtonesExposure = 0;
    curves.highlightsHue = 30;
    curves.highlightsSaturation = 8;
    curves.highlightsExposure = 2;
    curves.highlightsDensity = 0;
    pipeline.imageProcessing.colorCurves = curves;
    pipeline.imageProcessing.colorCurvesEnabled = true;

    // Vignette — cinematic framing
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.8;
    pipeline.imageProcessing.vignetteStretch = 0.4;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
    pipeline.imageProcessing.vignetteCameraFov = 0.6;

    // Chromatic aberration — barely-there for lens realism
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 6;
    pipeline.chromaticAberration.radialIntensity = 0.5;

    // Grain — subtle film texture
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 5;
    pipeline.grain.animated = true;

    // DOF disabled by default for a 3rd-person action game — too soft to read distant detail.
    // Re-enable per scene/mode if a cinematic shot is wanted.
    pipeline.depthOfFieldEnabled = false;

    // Anti-aliasing
    pipeline.fxaaEnabled = true;

    // Edge sharpen
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.3;
    pipeline.sharpen.colorAmount = 1.0;

    console.log('[PostProcess] Cinematic pipeline configured');
  }

  update(state: AtmosphereState): void {
    if (!this.pipeline) return;
    // Simulated auto-exposure: brighten under low light (twilight, night),
    // tighten exposure at high noon to avoid blowout
    const sunAlt = Math.max(0, -state.sky.sunDirection.y);
    const adapt = 1.0 - sunAlt * 0.35; // 1.0 at night, ~0.65 at noon
    this.pipeline.imageProcessing.exposure = this.baseExposure * adapt;
  }

  dispose(): void { this.pipeline?.dispose(); }
}
