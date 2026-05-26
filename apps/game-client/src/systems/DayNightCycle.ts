import { Scene } from '@babylonjs/core/scene';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

import type { QualitySettings } from '../scenes/IronvaleOutskirtsScene';

const GAME_HOURS_PER_REAL_MINUTE = 1;
const DAY_DURATION_SECONDS = (24 / GAME_HOURS_PER_REAL_MINUTE) * 60;

interface TimeKeyframe {
  time: number;
  sunColor: [number, number, number];
  sunIntensity: number;
  ambientColor: [number, number, number];
  ambientIntensity: number;
  groundColor: [number, number, number];
  skyZenith: [number, number, number];
  skyHorizon: [number, number, number];
  fogColor: [number, number, number];
  fogDensity: number;
  exposure: number;
  bloomThreshold: number;
  bloomWeight: number;
}

const KEYFRAMES: TimeKeyframe[] = [
  { // 0.0 — Midnight
    time: 0.0,
    sunColor: [0.05, 0.05, 0.15], sunIntensity: 0.0,
    ambientColor: [0.03, 0.03, 0.08], ambientIntensity: 0.15,
    groundColor: [0.01, 0.01, 0.03],
    skyZenith: [0.005, 0.005, 0.02], skyHorizon: [0.01, 0.01, 0.03],
    fogColor: [0.02, 0.02, 0.05], fogDensity: 0.015,
    exposure: 0.6, bloomThreshold: 0.3, bloomWeight: 0.5,
  },
  { // 0.22 — Pre-dawn
    time: 0.22,
    sunColor: [0.4, 0.15, 0.1], sunIntensity: 0.0,
    ambientColor: [0.08, 0.05, 0.06], ambientIntensity: 0.2,
    groundColor: [0.03, 0.02, 0.03],
    skyZenith: [0.02, 0.015, 0.04], skyHorizon: [0.15, 0.06, 0.03],
    fogColor: [0.08, 0.05, 0.06], fogDensity: 0.014,
    exposure: 0.7, bloomThreshold: 0.5, bloomWeight: 0.45,
  },
  { // 0.27 — Dawn (golden hour start)
    time: 0.27,
    sunColor: [1.0, 0.5, 0.2], sunIntensity: 0.8,
    ambientColor: [0.2, 0.12, 0.08], ambientIntensity: 0.35,
    groundColor: [0.08, 0.05, 0.03],
    skyZenith: [0.06, 0.04, 0.1], skyHorizon: [0.5, 0.2, 0.05],
    fogColor: [0.25, 0.15, 0.1], fogDensity: 0.011,
    exposure: 0.9, bloomThreshold: 0.6, bloomWeight: 0.4,
  },
  { // 0.35 — Morning
    time: 0.35,
    sunColor: [1.0, 0.85, 0.6], sunIntensity: 1.5,
    ambientColor: [0.25, 0.22, 0.18], ambientIntensity: 0.4,
    groundColor: [0.1, 0.08, 0.06],
    skyZenith: [0.15, 0.2, 0.4], skyHorizon: [0.35, 0.3, 0.25],
    fogColor: [0.35, 0.33, 0.3], fogDensity: 0.009,
    exposure: 1.0, bloomThreshold: 0.8, bloomWeight: 0.3,
  },
  { // 0.5 — Noon
    time: 0.5,
    sunColor: [1.0, 0.95, 0.85], sunIntensity: 2.0,
    ambientColor: [0.3, 0.3, 0.3], ambientIntensity: 0.5,
    groundColor: [0.12, 0.12, 0.1],
    skyZenith: [0.2, 0.3, 0.55], skyHorizon: [0.45, 0.45, 0.5],
    fogColor: [0.4, 0.4, 0.42], fogDensity: 0.007,
    exposure: 1.1, bloomThreshold: 0.9, bloomWeight: 0.2,
  },
  { // 0.65 — Afternoon
    time: 0.65,
    sunColor: [1.0, 0.85, 0.55], sunIntensity: 1.6,
    ambientColor: [0.25, 0.2, 0.15], ambientIntensity: 0.4,
    groundColor: [0.1, 0.08, 0.05],
    skyZenith: [0.15, 0.2, 0.4], skyHorizon: [0.4, 0.3, 0.2],
    fogColor: [0.35, 0.3, 0.25], fogDensity: 0.009,
    exposure: 1.0, bloomThreshold: 0.75, bloomWeight: 0.3,
  },
  { // 0.73 — Dusk (golden hour)
    time: 0.73,
    sunColor: [1.0, 0.45, 0.15], sunIntensity: 1.0,
    ambientColor: [0.2, 0.1, 0.08], ambientIntensity: 0.35,
    groundColor: [0.08, 0.04, 0.03],
    skyZenith: [0.06, 0.03, 0.1], skyHorizon: [0.6, 0.2, 0.05],
    fogColor: [0.3, 0.15, 0.08], fogDensity: 0.012,
    exposure: 0.9, bloomThreshold: 0.5, bloomWeight: 0.45,
  },
  { // 0.8 — Twilight
    time: 0.8,
    sunColor: [0.3, 0.1, 0.15], sunIntensity: 0.1,
    ambientColor: [0.06, 0.04, 0.08], ambientIntensity: 0.2,
    groundColor: [0.02, 0.02, 0.04],
    skyZenith: [0.02, 0.015, 0.05], skyHorizon: [0.08, 0.04, 0.06],
    fogColor: [0.06, 0.05, 0.08], fogDensity: 0.014,
    exposure: 0.7, bloomThreshold: 0.4, bloomWeight: 0.45,
  },
  { // 1.0 — Midnight (wrap)
    time: 1.0,
    sunColor: [0.05, 0.05, 0.15], sunIntensity: 0.0,
    ambientColor: [0.03, 0.03, 0.08], ambientIntensity: 0.15,
    groundColor: [0.01, 0.01, 0.03],
    skyZenith: [0.005, 0.005, 0.02], skyHorizon: [0.01, 0.01, 0.03],
    fogColor: [0.02, 0.02, 0.05], fogDensity: 0.015,
    exposure: 0.6, bloomThreshold: 0.3, bloomWeight: 0.5,
  },
];

function lerpColor3(out: Color3, a: [number, number, number], b: [number, number, number], t: number): void {
  out.r = a[0] + (b[0] - a[0]) * t;
  out.g = a[1] + (b[1] - a[1]) * t;
  out.b = a[2] + (b[2] - a[2]) * t;
}

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function findKeyframes(time: number): { a: TimeKeyframe; b: TimeKeyframe; t: number } {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (time >= KEYFRAMES[i].time && time <= KEYFRAMES[i + 1].time) {
      const span = KEYFRAMES[i + 1].time - KEYFRAMES[i].time;
      const t = span > 0 ? (time - KEYFRAMES[i].time) / span : 0;
      const smooth = t * t * (3 - 2 * t);
      return { a: KEYFRAMES[i], b: KEYFRAMES[i + 1], t: smooth };
    }
  }
  return { a: KEYFRAMES[0], b: KEYFRAMES[0], t: 0 };
}

function computeSunDirection(time: number): Vector3 {
  const sunAngle = (time - 0.25) * Math.PI * 2;
  const x = Math.cos(sunAngle) * 0.8;
  const y = -Math.sin(sunAngle);
  const z = Math.cos(sunAngle) * 0.3;
  return new Vector3(x, y, z).normalize();
}

export class DayNightCycle {
  private scene: Scene;
  private quality: QualitySettings;
  private timeOfDay: number;
  private speed: number;

  private sunLight: DirectionalLight;
  private moonLight: DirectionalLight;
  private ambientLight: HemisphericLight;
  private shadowGen: ShadowGenerator | CascadedShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;

  private skyDomeMat: StandardMaterial | null = null;
  private horizonMat: StandardMaterial | null = null;
  private moonMesh: Mesh | null = null;
  private moonMat: StandardMaterial | null = null;

  private tempColor = new Color3();

  constructor(scene: Scene, quality: QualitySettings, startTime: number = 0.73) {
    this.scene = scene;
    this.quality = quality;
    this.timeOfDay = startTime;
    this.speed = 1 / DAY_DURATION_SECONDS;

    this.ambientLight = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.ambientLight.specular = Color3.Black();

    this.sunLight = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.5), scene);
    this.sunLight.specular = new Color3(0.5, 0.45, 0.3);

    this.moonLight = new DirectionalLight('moon', new Vector3(0.5, -0.8, 0.3), scene);
    this.moonLight.specular = new Color3(0.1, 0.1, 0.15);
    this.moonLight.intensity = 0;

    if (quality.shadowQuality !== 'off') {
      this.createShadows();
    }

    this.createMoon();
    this.applyTimeOfDay();
  }

  private createShadows(): void {
    const mapSize = this.quality.shadowMapSize;

    if (mapSize >= 1024) {
      const csm = new CascadedShadowGenerator(mapSize, this.sunLight);
      csm.cascadeBlendPercentage = 0.05;
      csm.lambda = 0.9;
      csm.stabilizeCascades = true;
      csm.depthClamp = true;
      csm.autoCalcDepthBounds = true;
      csm.shadowMaxZ = this.quality.maxRenderDistance;
      csm.bias = 0.002;
      csm.normalBias = 0.02;
      csm.filteringQuality = this.quality.shadowQuality === 'high'
        ? ShadowGenerator.QUALITY_HIGH
        : ShadowGenerator.QUALITY_MEDIUM;
      this.shadowGen = csm;
    } else {
      const sg = new ShadowGenerator(mapSize, this.sunLight);
      sg.useBlurExponentialShadowMap = true;
      sg.blurKernel = 16;
      sg.bias = 0.005;
      sg.normalBias = 0.02;
      sg.depthScale = 50;
      this.shadowGen = sg;
    }

    this.scene.meshes.forEach((mesh) => {
      if (mesh.name.startsWith('terrain') || mesh.name === 'localPlayer') {
        mesh.receiveShadows = true;
      }
      if (
        mesh.name.includes('pine') || mesh.name.includes('dead') ||
        mesh.name.includes('rock') || mesh.name.includes('gate') ||
        mesh.name.includes('bridge') || mesh.name.includes('shrine') ||
        mesh.name.includes('localPlayer')
      ) {
        if (this.shadowGen) {
          const sm = this.shadowGen.getShadowMap();
          if (sm && sm.renderList) {
            sm.renderList.push(mesh);
          }
        }
      }
    });
  }

  private createMoon(): void {
    this.moonMesh = MeshBuilder.CreateSphere('moon', { diameter: 8, segments: 16 }, this.scene);
    this.moonMat = new StandardMaterial('moonMat', this.scene);
    this.moonMat.diffuseColor = Color3.Black();
    this.moonMat.specularColor = Color3.Black();
    this.moonMat.emissiveColor = new Color3(0.7, 0.75, 0.9);
    this.moonMat.disableLighting = true;
    this.moonMesh.material = this.moonMat;
    this.moonMesh.isPickable = false;
    this.moonMesh.applyFog = false;
    this.moonMesh.infiniteDistance = true;
    this.moonMesh.renderingGroupId = 0;
  }

  bindSky(skyDomeMat: StandardMaterial, horizonMat: StandardMaterial): void {
    this.skyDomeMat = skyDomeMat;
    this.horizonMat = horizonMat;
  }

  bindPipeline(pipeline: DefaultRenderingPipeline): void {
    this.pipeline = pipeline;
  }

  getShadowGenerator(): ShadowGenerator | CascadedShadowGenerator | null {
    return this.shadowGen;
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  getTimeLabel(): string {
    const hours = Math.floor(this.timeOfDay * 24);
    const minutes = Math.floor((this.timeOfDay * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  setTimeOfDay(t: number): void {
    this.timeOfDay = ((t % 1) + 1) % 1;
    this.applyTimeOfDay();
  }

  update(dt: number): void {
    this.timeOfDay += this.speed * dt;
    if (this.timeOfDay >= 1) this.timeOfDay -= 1;
    this.applyTimeOfDay();
  }

  private applyTimeOfDay(): void {
    const { a, b, t } = findKeyframes(this.timeOfDay);

    lerpColor3(this.tempColor, a.sunColor, b.sunColor, t);
    this.sunLight.diffuse.copyFrom(this.tempColor);
    this.sunLight.intensity = lerpScalar(a.sunIntensity, b.sunIntensity, t);

    const sunDir = computeSunDirection(this.timeOfDay);
    this.sunLight.direction.copyFrom(sunDir);

    const sunAboveHorizon = sunDir.y < 0;
    this.sunLight.setEnabled(sunAboveHorizon && this.sunLight.intensity > 0.05);

    const moonAngle = ((this.timeOfDay + 0.5) % 1 - 0.25) * Math.PI * 2;
    const moonY = -Math.sin(moonAngle);
    const moonAbove = moonY < 0;
    this.moonLight.direction.set(Math.cos(moonAngle) * 0.6, moonY, Math.cos(moonAngle) * 0.4).normalize();
    const nightness = Math.max(0, 1 - this.sunLight.intensity / 0.5);
    this.moonLight.intensity = moonAbove ? nightness * 0.3 : 0;
    this.moonLight.setEnabled(moonAbove && nightness > 0.1);

    if (this.moonMesh) {
      const moonDist = 350;
      const moonDir = this.moonLight.direction;
      this.moonMesh.position.set(-moonDir.x * moonDist, -moonDir.y * moonDist, -moonDir.z * moonDist);
      this.moonMesh.isVisible = moonAbove && nightness > 0.1;
      if (this.moonMat) {
        const brightness = nightness * 0.8;
        this.moonMat.emissiveColor.set(0.7 * brightness, 0.75 * brightness, 0.9 * brightness);
      }
    }

    lerpColor3(this.tempColor, a.ambientColor, b.ambientColor, t);
    this.ambientLight.diffuse.copyFrom(this.tempColor);
    this.ambientLight.intensity = lerpScalar(a.ambientIntensity, b.ambientIntensity, t);
    lerpColor3(this.tempColor, a.groundColor, b.groundColor, t);
    this.ambientLight.groundColor.copyFrom(this.tempColor);

    lerpColor3(this.tempColor, a.fogColor, b.fogColor, t);
    this.scene.fogColor.copyFrom(this.tempColor);
    this.scene.fogDensity = lerpScalar(a.fogDensity, b.fogDensity, t);

    lerpColor3(this.tempColor, a.skyZenith, b.skyZenith, t);
    this.scene.clearColor.set(this.tempColor.r, this.tempColor.g, this.tempColor.b, 1);

    if (this.skyDomeMat) {
      lerpColor3(this.tempColor, a.skyZenith, b.skyZenith, t);
      this.skyDomeMat.emissiveColor.copyFrom(this.tempColor);
    }
    if (this.horizonMat) {
      lerpColor3(this.tempColor, a.skyHorizon, b.skyHorizon, t);
      this.horizonMat.emissiveColor.copyFrom(this.tempColor);
      this.horizonMat.alpha = Math.min(0.7, 0.2 + this.sunLight.intensity * 0.3);
    }

    if (this.pipeline) {
      const exp = lerpScalar(a.exposure, b.exposure, t);
      this.pipeline.imageProcessing.exposure = exp;
      if (this.pipeline.bloomEnabled) {
        this.pipeline.bloomThreshold = lerpScalar(a.bloomThreshold, b.bloomThreshold, t);
        this.pipeline.bloomWeight = lerpScalar(a.bloomWeight, b.bloomWeight, t);
      }
    }
  }

  dispose(): void {
    this.sunLight.dispose();
    this.moonLight.dispose();
    this.ambientLight.dispose();
    if (this.shadowGen) this.shadowGen.dispose();
    if (this.moonMesh) this.moonMesh.dispose();
  }
}
