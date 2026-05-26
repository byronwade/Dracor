import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Camera } from '@babylonjs/core/Cameras/camera';

// Side-effect imports required by Babylon.js
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

import type { QualitySettings } from '../quality/renderQuality';
import type { LightingPreset } from '../lighting/lightingPresets';
import type { FogPreset } from '../fog/fogPresets';
import type { PostProcessingPreset } from '../postprocessing/postProcessingPresets';
import { applyPostProcessingToScene } from '../postprocessing/postProcessingPresets';

export class SceneController {
  public scene: Scene;

  private _quality: QualitySettings;
  private _ambientLight: HemisphericLight | null = null;
  private _sunLight: DirectionalLight | null = null;
  private _shadowGenerator: ShadowGenerator | null = null;

  constructor(engine: Engine, quality: QualitySettings) {
    this._quality = quality;

    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.02, 0.02, 0.04, 1.0);
    this.scene.ambientColor = new Color3(0.1, 0.1, 0.12);

    // Performance tuning based on quality
    this.scene.autoClear = true;
    this.scene.autoClearDepthAndStencil = true;

    // Reduce octree overhead on lower tiers
    if (quality.tier === 'low' || quality.tier === 'medium') {
      this.scene.blockMaterialDirtyMechanism = true;
    }

    // Freeze active meshes for performance on lower tiers
    if (quality.tier === 'low') {
      this.scene.skipFrustumClipping = true;
    }

    // Set up rendering groups
    this.scene.setRenderingAutoClearDepthStencil(0, true); // Default
    this.scene.setRenderingAutoClearDepthStencil(1, false); // Transparent
    this.scene.setRenderingAutoClearDepthStencil(2, false); // UI overlay
  }

  applyLightingPreset(preset: LightingPreset): void {
    // Dispose existing lights
    if (this._ambientLight) {
      this._ambientLight.dispose();
      this._ambientLight = null;
    }
    if (this._sunLight) {
      if (this._shadowGenerator) {
        this._shadowGenerator.dispose();
        this._shadowGenerator = null;
      }
      this._sunLight.dispose();
      this._sunLight = null;
    }

    // Ambient / hemispheric light
    this._ambientLight = new HemisphericLight(
      'ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    this._ambientLight.diffuse = new Color3(
      preset.ambientColor[0],
      preset.ambientColor[1],
      preset.ambientColor[2]
    );
    this._ambientLight.intensity = preset.ambientIntensity;
    this._ambientLight.specular = Color3.Black();

    // Directional (sun/moon) light
    if (preset.sunIntensity > 0) {
      this._sunLight = new DirectionalLight(
        'sun',
        new Vector3(
          preset.sunDirection[0],
          preset.sunDirection[1],
          preset.sunDirection[2]
        ),
        this.scene
      );
      this._sunLight.diffuse = new Color3(
        preset.sunColor[0],
        preset.sunColor[1],
        preset.sunColor[2]
      );
      this._sunLight.intensity = preset.sunIntensity;
      this._sunLight.specular = new Color3(
        preset.sunColor[0] * 0.5,
        preset.sunColor[1] * 0.5,
        preset.sunColor[2] * 0.5
      );

      // Shadow generator
      if (
        preset.shadowsEnabled &&
        this._quality.shadowQuality !== 'off'
      ) {
        this._shadowGenerator = new ShadowGenerator(
          this._quality.shadowMapSize,
          this._sunLight
        );
        this._shadowGenerator.useBlurExponentialShadowMap = true;
        this._shadowGenerator.blurKernel =
          this._quality.shadowQuality === 'high' ? 32 : 16;
        this._shadowGenerator.depthScale = 50;
        this._shadowGenerator.bias = 0.005;
        this._shadowGenerator.normalBias = 0.02;

        if (this._quality.shadowQuality === 'low') {
          this._shadowGenerator.useBlurExponentialShadowMap = false;
          this._shadowGenerator.useExponentialShadowMap = true;
        }
      }
    }
  }

  applyFogPreset(preset: FogPreset): void {
    switch (preset.mode) {
      case 'exp':
        this.scene.fogMode = Scene.FOGMODE_EXP;
        break;
      case 'exp2':
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        break;
      case 'linear':
        this.scene.fogMode = Scene.FOGMODE_LINEAR;
        break;
    }

    this.scene.fogDensity = preset.density;
    this.scene.fogColor = new Color3(
      preset.color[0],
      preset.color[1],
      preset.color[2]
    );

    if (preset.start !== undefined) {
      this.scene.fogStart = preset.start;
    }
    if (preset.end !== undefined) {
      this.scene.fogEnd = preset.end;
    }
  }

  applyPostProcessing(preset: PostProcessingPreset): void {
    const camera = this.scene.activeCamera;
    if (!camera) {
      return;
    }
    applyPostProcessingToScene(this.scene, camera as Camera, preset);
  }

  dispose(): void {
    if (this._shadowGenerator) {
      this._shadowGenerator.dispose();
      this._shadowGenerator = null;
    }
    if (this._ambientLight) {
      this._ambientLight.dispose();
      this._ambientLight = null;
    }
    if (this._sunLight) {
      this._sunLight.dispose();
      this._sunLight = null;
    }
    this.scene.dispose();
  }
}
