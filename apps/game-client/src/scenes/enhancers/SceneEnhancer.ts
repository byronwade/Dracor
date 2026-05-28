import type { Scene } from '@babylonjs/core/scene';
import type { AtmosphereState } from '@dracor/atmosphere';
import type { QualitySettings } from '../IronvaleOutskirtsScene';

export interface EnhancerContext {
  scene: Scene;
  quality: QualitySettings;
}

export interface SceneEnhancer {
  readonly name: string;
  readonly priority: number;
  init(ctx: EnhancerContext): Promise<void> | void;
  update?(state: AtmosphereState, dt: number): void;
  dispose?(): void;
}

export async function runEnhancers(
  ctx: EnhancerContext,
  enhancers: SceneEnhancer[]
): Promise<SceneEnhancer[]> {
  const sorted = [...enhancers].sort((a, b) => a.priority - b.priority);
  const active: SceneEnhancer[] = [];
  for (const e of sorted) {
    try {
      await e.init(ctx);
      active.push(e);
      console.log(`[Enhancer] ${e.name} initialized`);
    } catch (err) {
      console.warn(`[Enhancer] ${e.name} failed:`, err);
    }
  }
  return active;
}
