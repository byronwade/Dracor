// Capabilities
export {
  detectRendererCapabilities,
  type RendererCapabilities,
} from './capabilities/detectRendererCapabilities';

// Engine
export { createBabylonEngine } from './engine/createBabylonEngine';

// Scene
export { SceneController } from './scene/SceneController';

// Quality
export {
  getQualitySettings,
  autoSelectQuality,
  type QualityTier,
  type QualitySettings,
} from './quality/renderQuality';

// Lighting
export {
  LIGHTING_PRESETS,
  type LightingPreset,
} from './lighting/lightingPresets';

// Fog
export {
  FOG_PRESETS,
  type FogPreset,
} from './fog/fogPresets';

// Materials
export {
  createPbrMaterial,
  type PbrMaterialOptions,
} from './materials/createPbrMaterial';

export {
  createEmissiveMaterial,
  type EmissiveMaterialOptions,
} from './materials/createEmissiveMaterial';

// Instances
export {
  createInstanceBatch,
  type InstanceData,
} from './instances/createInstanceBatch';

// Performance
export {
  getBudgetForTier,
  type PerformanceBudget,
} from './performance/PerformanceBudget';

export {
  PerformanceMonitor,
  type PerformanceSnapshot,
} from './performance/PerformanceMonitor';

// Post Processing
export {
  POST_PROCESSING_PRESETS,
  applyPostProcessingToScene,
  type PostProcessingPreset,
} from './postprocessing/postProcessingPresets';
