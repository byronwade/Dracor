import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

/**
 * Runs the engine render loop and calls an update callback each frame.
 */
export class GameLoop {
  private running = false;

  constructor(
    private engine: Engine,
    private scene: Scene,
    private update: (dt: number) => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000; // seconds
      this.update(dt);
      this.scene.render();
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.engine.stopRenderLoop();
  }
}
