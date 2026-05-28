import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class SSAOEnhancer implements SceneEnhancer {
  readonly name = 'SSAO';
  readonly priority = 50;
  private pipeline: any = null;
  private scene: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (!ctx.quality.ssaoEnabled) return;
    this.scene = ctx.scene;
    const camera = ctx.scene.activeCamera;
    if (!camera) return;

    const { SSAO2RenderingPipeline } = await import('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline');
    await import('@babylonjs/core/Rendering/depthRendererSceneComponent');

    this.pipeline = new SSAO2RenderingPipeline('ssao', ctx.scene, {
      ssaoRatio: ctx.quality.tier === 'ultra' ? 0.75 : 0.5,
      blurRatio: 0.5,
    });
    this.pipeline.radius = 1.5;
    this.pipeline.totalStrength = 0.5;
    this.pipeline.base = 0.15;
    this.pipeline.samples = 8;
    this.pipeline.maxZ = 100;
    ctx.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
  }

  dispose(): void { this.pipeline?.dispose(); }
}
