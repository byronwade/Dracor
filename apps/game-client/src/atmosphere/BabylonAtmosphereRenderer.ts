import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { type AtmosphereState, type Color3 as AtmoColor3 } from '@dracor/atmosphere';

function toColor3(c: AtmoColor3): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function toVec3(v: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

export class BabylonAtmosphereRenderer {
  private scene: Scene;
  private skybox: Mesh | null = null;
  private sunLight: DirectionalLight;
  private ambientLight: HemisphericLight;

  constructor(scene: Scene) {
    this.scene = scene;

    const hdrTexture = new HDRCubeTexture('/qwantani_sunset_2k.hdr', scene, 512);
    scene.environmentTexture = hdrTexture;

    this.skybox = scene.createDefaultSkybox(hdrTexture, true, 10000, 0.3) as Mesh;
    if (this.skybox) {
      this.skybox.infiniteDistance = true;
      this.skybox.isPickable = false;
    }

    const existingAmbient = scene.getLightByName('atmosphereAmbient') as HemisphericLight | null;
    this.ambientLight = existingAmbient
      ?? new HemisphericLight('atmosphereAmbient', new Vector3(0, 1, 0), scene);
    this.ambientLight.specular = Color3.Black();
    this.ambientLight.intensity = 0.5;
    this.ambientLight.diffuse = new Color3(0.6, 0.65, 0.75);
    this.ambientLight.groundColor = new Color3(0.2, 0.18, 0.15);

    const existingSun = scene.getLightByName('atmosphereSun') as DirectionalLight | null;
    this.sunLight = existingSun
      ?? new DirectionalLight('atmosphereSun', new Vector3(-0.5, -1, -0.5).normalize(), scene);
    this.sunLight.intensity = 1.8;
    this.sunLight.diffuse = new Color3(1.0, 0.9, 0.75);
    this.sunLight.specular = new Color3(0.8, 0.75, 0.6);

    console.log('[Atmosphere] HDRI skybox + IBL initialized');
  }

  update(state: AtmosphereState): void {
    const { sky, fog, ambientColor, ambientIntensity, directionalColor, directionalIntensity } = state;

    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogStart = 250;
    this.scene.fogEnd = 450;
    this.scene.fogColor = toColor3(sky.horizonColor);

    this.ambientLight.diffuse = toColor3(ambientColor);
    this.ambientLight.intensity = Math.max(0.15, ambientIntensity);
    this.ambientLight.groundColor = new Color3(
      ambientColor.r * 0.4,
      ambientColor.g * 0.4,
      ambientColor.b * 0.4
    );

    const sunDir = toVec3(sky.sunDirection);
    this.sunLight.direction = sunDir;
    this.sunLight.diffuse = toColor3(directionalColor);
    this.sunLight.intensity = Math.max(0, directionalIntensity);

    this.scene.clearColor = new Color4(
      sky.horizonColor.r,
      sky.horizonColor.g,
      sky.horizonColor.b,
      1.0
    );
  }

  dispose(): void {
    if (this.skybox) this.skybox.dispose();
    this.sunLight.dispose();
    this.ambientLight.dispose();
  }
}
