import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import {
  buildIronvaleOutskirtsScene,
  type QualitySettings,
} from './IronvaleOutskirtsScene';
import type { AtmosphereEngine } from '@dracor/atmosphere';
import type { BabylonAtmosphereRenderer } from '../atmosphere/BabylonAtmosphereRenderer';
import type { StreamingManager } from '../streaming/StreamingManager';

export type SceneName = 'ironvale_outskirts';

export interface SceneBuildResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
  atmosphereEngine: AtmosphereEngine;
  atmosphereRenderer: BabylonAtmosphereRenderer;
  updateWind: (dt: number) => void;
  streamingManager: StreamingManager;
}

type SceneBuilder = (engine: Engine, quality: QualitySettings) => Promise<SceneBuildResult>;

const SCENE_BUILDERS: Record<SceneName, SceneBuilder> = {
  ironvale_outskirts: async (engine, quality) => {
    const result = await buildIronvaleOutskirtsScene(engine, quality);
    return {
      scene: result.scene,
      getHeightAt: result.getHeightAt,
      atmosphereEngine: result.atmosphereEngine,
      atmosphereRenderer: result.atmosphereRenderer,
      updateWind: result.updateWind,
      streamingManager: result.streamingManager,
    };
  },
};

export function getSceneBuilder(name: SceneName): SceneBuilder {
  const builder = SCENE_BUILDERS[name];
  if (!builder) {
    throw new Error(`Unknown scene: ${name}`);
  }
  return builder;
}
