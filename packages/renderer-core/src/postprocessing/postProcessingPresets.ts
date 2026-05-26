import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';

export interface PostProcessingPreset {
  name: string;
  bloomEnabled: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  bloomKernel: number;
  ssaoEnabled: boolean;
  ssaoRadius: number;
  ssaoSamples: number;
  tonemapping: boolean;
  vignetteEnabled: boolean;
  vignetteWeight: number;
  chromaticAberration: boolean;
  grain: boolean;
  grainAmount: number;
}

export const POST_PROCESSING_PRESETS: Record<string, PostProcessingPreset> = {
  cinematic: {
    name: 'cinematic',
    bloomEnabled: true,
    bloomThreshold: 0.8,
    bloomWeight: 0.3,
    bloomKernel: 64,
    ssaoEnabled: true,
    ssaoRadius: 2.0,
    ssaoSamples: 16,
    tonemapping: true,
    vignetteEnabled: true,
    vignetteWeight: 1.5,
    chromaticAberration: true,
    grain: true,
    grainAmount: 8,
  },
  performance: {
    name: 'performance',
    bloomEnabled: false,
    bloomThreshold: 0.9,
    bloomWeight: 0.15,
    bloomKernel: 32,
    ssaoEnabled: false,
    ssaoRadius: 1.0,
    ssaoSamples: 8,
    tonemapping: true,
    vignetteEnabled: false,
    vignetteWeight: 0,
    chromaticAberration: false,
    grain: false,
    grainAmount: 0,
  },
  off: {
    name: 'off',
    bloomEnabled: false,
    bloomThreshold: 0,
    bloomWeight: 0,
    bloomKernel: 0,
    ssaoEnabled: false,
    ssaoRadius: 0,
    ssaoSamples: 0,
    tonemapping: false,
    vignetteEnabled: false,
    vignetteWeight: 0,
    chromaticAberration: false,
    grain: false,
    grainAmount: 0,
  },
};

export function applyPostProcessingToScene(
  scene: Scene,
  camera: Camera,
  preset: PostProcessingPreset
): void {
  // Clean up existing pipelines
  const existingDefault = scene.postProcessRenderPipelineManager.supportedPipelines
    .find((p) => p.name === 'defaultPipeline');
  if (existingDefault) {
    existingDefault.dispose();
  }

  const existingSsao = scene.postProcessRenderPipelineManager.supportedPipelines
    .find((p) => p.name === 'ssao2Pipeline');
  if (existingSsao) {
    existingSsao.dispose();
  }

  // If preset is 'off', nothing more to do
  if (preset.name === 'off') {
    return;
  }

  // Default rendering pipeline (bloom, tonemapping, vignette, grain, chromatic aberration)
  const defaultPipeline = new DefaultRenderingPipeline(
    'defaultPipeline',
    true,
    scene,
    [camera]
  );

  // Bloom
  defaultPipeline.bloomEnabled = preset.bloomEnabled;
  if (preset.bloomEnabled) {
    defaultPipeline.bloomThreshold = preset.bloomThreshold;
    defaultPipeline.bloomWeight = preset.bloomWeight;
    defaultPipeline.bloomKernel = preset.bloomKernel;
  }

  // Tonemapping
  if (preset.tonemapping) {
    defaultPipeline.imageProcessingEnabled = true;
    defaultPipeline.imageProcessing.toneMappingEnabled = true;
    defaultPipeline.imageProcessing.toneMappingType = 1; // ACES
    defaultPipeline.imageProcessing.exposure = 1.0;
    defaultPipeline.imageProcessing.contrast = 1.1;
  }

  // Vignette
  if (preset.vignetteEnabled) {
    defaultPipeline.imageProcessingEnabled = true;
    defaultPipeline.imageProcessing.vignetteEnabled = true;
    defaultPipeline.imageProcessing.vignetteWeight = preset.vignetteWeight;
    defaultPipeline.imageProcessing.vignetteCameraFov = 0.5;
  }

  // Chromatic aberration
  defaultPipeline.chromaticAberrationEnabled = preset.chromaticAberration;
  if (preset.chromaticAberration) {
    defaultPipeline.chromaticAberration.aberrationAmount = 30;
    defaultPipeline.chromaticAberration.radialIntensity = 0.8;
  }

  // Film grain
  defaultPipeline.grainEnabled = preset.grain;
  if (preset.grain) {
    defaultPipeline.grain.intensity = preset.grainAmount;
    defaultPipeline.grain.animated = true;
  }

  // SSAO (separate pipeline)
  if (preset.ssaoEnabled) {
    const ssao = new SSAO2RenderingPipeline(
      'ssao2Pipeline',
      scene,
      { ssaoRatio: 0.5, blurRatio: 0.5 },
      [camera],
      false
    );
    ssao.radius = preset.ssaoRadius;
    ssao.totalStrength = 1.5;
    ssao.expensiveBlur = true;
    ssao.samples = preset.ssaoSamples;
    ssao.maxZ = 250;
    ssao.minZAspect = 0.5;
  }
}
