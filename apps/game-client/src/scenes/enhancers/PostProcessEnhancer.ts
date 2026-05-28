import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class PostProcessEnhancer implements SceneEnhancer {
  readonly name = 'Post-Processing';
  readonly priority = 40;
  private pipeline: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (!ctx.quality.postProcessingEnabled) return;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;

    const { DefaultRenderingPipeline } = await import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline');
    await import('@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent');

    const pipeline = new DefaultRenderingPipeline('cinematicPipeline', true, ctx.scene, [camera]);
    this.pipeline = pipeline;

    // Bloom — makes sun, lava, emissive materials glow
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.7;
    pipeline.bloomWeight = 0.4;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    // Tone mapping — HDR to LDR with filmic curve
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = 1; // ACES filmic

    // Exposure and contrast
    pipeline.imageProcessing.exposure = 1.1;
    pipeline.imageProcessing.contrast = 1.15;

    // Vignette — darkens edges for cinematic framing
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.5;
    pipeline.imageProcessing.vignetteStretch = 0.5;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
    pipeline.imageProcessing.vignetteCameraFov = 0.6;

    // Chromatic aberration — subtle for realism
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 15;
    pipeline.chromaticAberration.radialIntensity = 0.8;

    // Grain — subtle film grain
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 8;
    pipeline.grain.animated = true;

    // Anti-aliasing
    pipeline.fxaaEnabled = true;

    // Sharpen
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.25;

    console.log('[PostProcess] Cinematic pipeline configured');
  }

  dispose(): void { this.pipeline?.dispose(); }
}
