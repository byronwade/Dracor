import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';

export class ShadowsEnhancer implements SceneEnhancer {
  readonly name = 'Shadows';
  readonly priority = 30;
  private gen: any = null;
  private scene: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    if (ctx.quality.shadowQuality === 'off') return;
    this.scene = ctx.scene;
    const { CascadedShadowGenerator } = await import('@babylonjs/core/Lights/Shadows/cascadedShadowGenerator');
    await import('@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent');
    const sun = ctx.scene.getLightByName('sun') as DirectionalLight | null;
    if (!sun) return;

    const mapSize = ctx.quality.shadowMapSize;
    this.gen = new CascadedShadowGenerator(mapSize, sun);
    this.gen.numCascades = ctx.quality.tier === 'ultra' ? 4 : 2;
    this.gen.lambda = 0.7;
    this.gen.cascadeBlendPercentage = 0.15;
    this.gen.shadowMaxZ = ctx.quality.maxRenderDistance;
    this.gen.stabilizeCascades = true;
    this.gen.depthClamp = true;
    this.gen.filteringQuality = ctx.quality.tier === 'ultra' ? 2 : 1;
    this.gen.bias = 0.001;
    this.gen.normalBias = 0.02;

    const shouldCast = (m: AbstractMesh): boolean => {
      const meta = (m.metadata ?? {}) as { castsShadow?: boolean };
      if (meta.castsShadow) return true;
      const n = m.name;
      return (
        n.startsWith('player_') ||
        n.startsWith('localPlayer') ||
        n.startsWith('landmark_') ||
        n.startsWith('shrine_')
      );
    };

    const shouldReceive = (m: AbstractMesh): boolean => {
      return m.name.startsWith('terrain_') || m.name.startsWith('water_');
    };

    for (const mesh of ctx.scene.meshes) {
      if (shouldReceive(mesh)) mesh.receiveShadows = true;
      if (shouldCast(mesh)) this.gen.addShadowCaster(mesh);
    }
    ctx.scene.onNewMeshAddedObservable.add((mesh: AbstractMesh) => {
      if (shouldReceive(mesh)) mesh.receiveShadows = true;
      if (shouldCast(mesh)) this.gen.addShadowCaster(mesh);
    });
  }

  dispose(): void { this.gen?.dispose(); }
}
