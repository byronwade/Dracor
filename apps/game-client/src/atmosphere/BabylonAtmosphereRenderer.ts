import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { type Observer } from '@babylonjs/core/Misc/observable';
import { type AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { type AtmosphereState, type Color3 as AtmoColor3 } from '@dracor/atmosphere';

const _tmpColor = new Color3();
const _tmpVec = new Vector3();

function toColor3(c: AtmoColor3): Color3 {
  return new Color3(c.r, c.g, c.b);
}

function setColor3(target: Color3, c: AtmoColor3): void {
  target.r = c.r;
  target.g = c.g;
  target.b = c.b;
}

export class BabylonAtmosphereRenderer {
  private scene: Scene;
  private skybox: Mesh | null = null;
  private sunLight: DirectionalLight;
  private ambientLight: HemisphericLight;
  private shadowGenerator: ShadowGenerator | null = null;
  private meshObserver: Observer<AbstractMesh> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;

    // --- Ambient light (reuse if scene builder already created one) ---
    const existingAmbient = (scene.getLightByName('ambient') ?? scene.getLightByName('atmosphereAmbient')) as HemisphericLight | null;
    this.ambientLight = existingAmbient
      ?? new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.ambientLight.specular = Color3.Black();
    this.ambientLight.intensity = 0.4;
    this.ambientLight.diffuse = new Color3(0.5, 0.55, 0.65);
    this.ambientLight.groundColor = new Color3(0.15, 0.12, 0.1);

    // --- Sun (directional) light (reuse if scene builder already created one) ---
    const existingSun = (scene.getLightByName('sun') ?? scene.getLightByName('atmosphereSun')) as DirectionalLight | null;
    this.sunLight = existingSun
      ?? new DirectionalLight('sun', new Vector3(-0.5, -1, -0.5).normalize(), scene);
    this.sunLight.intensity = 1.5;
    this.sunLight.diffuse = new Color3(1.0, 0.9, 0.75);
    this.sunLight.specular = new Color3(0.5, 0.45, 0.35);
    this.sunLight.shadowMinZ = 1;
    this.sunLight.shadowMaxZ = 300;

    console.log('[Atmosphere] Lights initialized (no skybox, no shadows — fast load)');
  }

  private shouldCastShadow(mesh: AbstractMesh): boolean {
    const n = mesh.name;
    return n.startsWith('foliage_fir') ||
           n.startsWith('player_') ||
           n.startsWith('landmark_') ||
           n.startsWith('shrine_') ||
           n.startsWith('rock_');
  }

  update(state: AtmosphereState): void {
    const { sky, fog, ambientColor, ambientIntensity, directionalColor, directionalIntensity } = state;

    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogStart = Math.max(200, fog.distance.start);
    this.scene.fogEnd = Math.max(400, fog.distance.end);
    setColor3(this.scene.fogColor, fog.distance.color);

    setColor3(this.ambientLight.diffuse, ambientColor);
    this.ambientLight.intensity = Math.max(0.35, ambientIntensity * 0.5);

    _tmpVec.set(sky.sunDirection.x, sky.sunDirection.y, sky.sunDirection.z);
    this.sunLight.direction = _tmpVec;
    setColor3(this.sunLight.diffuse, directionalColor);
    this.sunLight.intensity = Math.max(0.2, directionalIntensity * 0.6);

    this.scene.clearColor.r = sky.horizonColor.r;
    this.scene.clearColor.g = sky.horizonColor.g;
    this.scene.clearColor.b = sky.horizonColor.b;
    this.scene.clearColor.a = 1.0;
  }

  dispose(): void {
    if (this.meshObserver) {
      this.scene.onNewMeshAddedObservable.remove(this.meshObserver);
      this.meshObserver = null;
    }
    if (this.shadowGenerator) this.shadowGenerator.dispose();
    if (this.skybox) this.skybox.dispose();
    this.sunLight.dispose();
    this.ambientLight.dispose();
  }
}
