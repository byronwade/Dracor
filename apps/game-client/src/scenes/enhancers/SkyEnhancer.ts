import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import type { AtmosphereState } from '@dracor/atmosphere';
import type { SceneEnhancer, EnhancerContext } from './SceneEnhancer';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

export class SkyEnhancer implements SceneEnhancer {
  readonly name = 'Sky';
  readonly priority = 10;

  private skyMat: any = null;
  private skybox: Mesh | null = null;
  private sunLight: DirectionalLight | null = null;
  private scene: any = null;

  async init(ctx: EnhancerContext): Promise<void> {
    this.scene = ctx.scene;
    const { SkyMaterial } = await import('@babylonjs/materials/sky/skyMaterial');

    this.skyMat = new SkyMaterial('sky', ctx.scene);
    this.skyMat.backFaceCulling = false;
    this.skyMat.useSunPosition = false;
    this.skyMat.turbidity = 8;
    this.skyMat.luminance = 0.4;
    this.skyMat.rayleigh = 2.5;
    this.skyMat.mieDirectionalG = 0.92;
    this.skyMat.mieCoefficient = 0.006;
    this.skyMat.inclination = 0.4;
    this.skyMat.azimuth = 0.25;

    this.skybox = MeshBuilder.CreateBox('skyDome', { size: 2000 }, ctx.scene);
    this.skybox.material = this.skyMat;
    this.skybox.infiniteDistance = true;
    this.skybox.isPickable = false;
    this.skybox.applyFog = false;

    this.sunLight = ctx.scene.getLightByName('sun') as DirectionalLight | null;

    ctx.scene.fogColor = new Color3(0.55, 0.6, 0.7);
  }

  update(state: AtmosphereState): void {
    if (!this.skyMat || !this.sunLight) return;
    const d = state.sky.sunDirection;
    const inclination = Math.max(-0.5, Math.min(0.5, -d.y * 0.5));
    const azimuth = (Math.atan2(d.x, d.z) + Math.PI) / (Math.PI * 2);
    this.skyMat.inclination = inclination;
    this.skyMat.azimuth = azimuth;
    this.sunLight.direction.set(d.x, d.y, d.z);

    const alt = Math.max(0, -d.y);
    this.skyMat.luminance = 0.15 + alt * 0.6;
    this.skyMat.turbidity = 6 + (1 - alt) * 6;
  }

  dispose(): void {
    this.skybox?.dispose();
    this.skyMat?.dispose();
  }
}
