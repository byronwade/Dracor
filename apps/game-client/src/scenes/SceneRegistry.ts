import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import {
  buildIronvaleOutskirtsScene,
  type QualitySettings,
  type IronvaleSceneResult,
} from './IronvaleOutskirtsScene';
import type { DayNightCycle } from '../systems/DayNightCycle';

export type SceneName = 'ironvale_outskirts';

export interface SceneBuildResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
  dayNight: DayNightCycle | null;
}

type SceneBuilder = (engine: Engine, quality: QualitySettings) => SceneBuildResult;

const SCENE_BUILDERS: Record<SceneName, SceneBuilder> = {
  ironvale_outskirts: (engine, quality) => {
    const result: IronvaleSceneResult = buildIronvaleOutskirtsScene(engine, quality);
    return { scene: result.scene, getHeightAt: result.getHeightAt, dayNight: result.dayNight };
  },
};

export function getSceneBuilder(name: SceneName): SceneBuilder {
  const builder = SCENE_BUILDERS[name];
  if (!builder) {
    throw new Error(`Unknown scene: ${name}`);
  }
  return builder;
}
