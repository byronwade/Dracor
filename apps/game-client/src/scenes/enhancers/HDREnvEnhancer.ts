import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class HDREnvEnhancer implements SceneEnhancer {
  readonly name = 'HDR Environment';
  readonly priority = 20;
  private hdr: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
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
