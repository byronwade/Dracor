import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import {
  buildIronvaleOutskirtsScene,
  type QualitySettings,
  type IronvaleSceneResult,
} from './IronvaleOutskirtsScene';

export type SceneName = 'ironvale_outskirts';

export interface SceneBuildResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
}

type SceneBuilder = (engine: Engine, quality: QualitySettings) => SceneBuildResult;

const SCENE_BUILDERS: Record<SceneName, SceneBuilder> = {
  ironvale_outskirts: (engine, quality) => {
    const result: IronvaleSceneResult = buildIronvaleOutskirtsScene(engine, quality);
    return { scene: result.scene, getHeightAt: result.getHeightAt };
  },
};

/**
 * Get a scene builder by name.
 */
export function getSceneBuilder(name: SceneName): SceneBuilder {
  const builder = SCENE_BUILDERS[name];
  if (!builder) {
    throw new Error(`Unknown scene: ${name}`);
  }
  return builder;
}
