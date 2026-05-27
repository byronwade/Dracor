import type { Scene } from '@babylonjs/core/scene';

let inspectorLoaded = false;
let inspectorVisible = false;

export function setupInspectorToggle(scene: Scene): void {
  if (!import.meta.env.DEV) return;

  window.addEventListener('keydown', async (e) => {
    if (e.key !== 'F12') return;
    e.preventDefault();

    if (!inspectorLoaded) {
      await import('@babylonjs/inspector');
      inspectorLoaded = true;
    }

    if (inspectorVisible) {
      scene.debugLayer.hide();
      inspectorVisible = false;
    } else {
      await scene.debugLayer.show({ embedMode: true });
      inspectorVisible = true;
    }
  });
}
