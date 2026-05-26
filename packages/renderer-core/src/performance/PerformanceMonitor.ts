import type { Engine } from '@babylonjs/core/Engines/engine';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
import type { Scene } from '@babylonjs/core/scene';
import type { PerformanceBudget } from './PerformanceBudget';

export interface PerformanceSnapshot {
  fps: number;
  drawCalls: number;
  triangles: number;
  activeMeshes: number;
  frameTimeMs: number;
  gpuFrameTimeMs: number;
}

export class PerformanceMonitor {
  private _engine: Engine;
  private _scene: Scene;
  private _sceneInstrumentation: SceneInstrumentation;
  private _engineInstrumentation: EngineInstrumentation;
  private _disposed = false;

  constructor(engine: Engine, scene: Scene) {
    this._engine = engine;
    this._scene = scene;

    this._sceneInstrumentation = new SceneInstrumentation(scene);
    this._sceneInstrumentation.captureFrameTime = true;
    this._sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
    this._sceneInstrumentation.captureRenderTime = true;

    this._engineInstrumentation = new EngineInstrumentation(engine);
    this._engineInstrumentation.captureGPUFrameTime = true;
  }

  getSnapshot(): PerformanceSnapshot {
    if (this._disposed) {
      return {
        fps: 0,
        drawCalls: 0,
        triangles: 0,
        activeMeshes: 0,
        frameTimeMs: 0,
        gpuFrameTimeMs: 0,
      };
    }

    // _drawCalls is a PerfCounter on AbstractEngine
    const engine = this._scene.getEngine() as unknown as {
      _drawCalls: { current: number };
    };
    const drawCallsCount = engine._drawCalls?.current ?? 0;

    // totalActiveIndicesPerfCounter gives rendered triangle count (indices / 3)
    const triangles = Math.floor(
      this._scene.totalActiveIndicesPerfCounter.current / 3
    );

    return {
      fps: this._engine.getFps(),
      drawCalls: drawCallsCount,
      triangles,
      activeMeshes: this._scene.getActiveMeshes().length,
      frameTimeMs:
        this._sceneInstrumentation.frameTimeCounter.lastSecAverage,
      gpuFrameTimeMs:
        this._engineInstrumentation.gpuFrameTimeCounter?.lastSecAverage ?? 0,
    };
  }

  isOverBudget(budget: PerformanceBudget): boolean {
    const snap = this.getSnapshot();
    return (
      snap.fps < budget.targetFps * 0.85 ||
      snap.drawCalls > budget.maxDrawCalls ||
      snap.triangles > budget.maxTriangles
    );
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._sceneInstrumentation.dispose();
    this._engineInstrumentation.dispose();
  }
}
