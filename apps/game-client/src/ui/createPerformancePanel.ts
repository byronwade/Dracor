import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import type { QualitySettings } from '../scenes/IronvaleOutskirtsScene';

/**
 * Performance overlay: FPS, draw calls, active meshes, quality tier.
 * Toggle visibility with F3. Updates every 500ms.
 */
export interface PerformancePanel {
  update: () => void;
  dispose: () => void;
}

export function createPerformancePanel(
  engine: Engine,
  scene: Scene,
  quality: QualitySettings
): PerformancePanel {
  let visible = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Panel element
  const panel = document.createElement('div');
  panel.id = 'perf-panel';
  panel.style.cssText = `
    position: absolute;
    top: 12px;
    right: 16px;
    background: rgba(0, 0, 0, 0.7);
    color: #a0a0a0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    pointer-events: none;
    user-select: none;
    line-height: 1.6;
    display: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
  `;
  document.body.appendChild(panel);

  // Hint label (always visible when panel hidden)
  const hint = document.createElement('div');
  hint.id = 'perf-hint';
  hint.style.cssText = `
    position: absolute;
    top: 12px;
    right: 16px;
    color: #606060;
    font-size: 11px;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.4);
    padding: 3px 8px;
    border-radius: 4px;
    pointer-events: none;
    user-select: none;
  `;
  hint.textContent = 'F3: stats';
  document.body.appendChild(hint);

  function refresh(): void {
    if (!visible) return;
    const fps = engine.getFps().toFixed(0);
    const drawCalls = (engine as unknown as { _drawCalls?: { current: number } })._drawCalls?.current ?? 0;
    const activeMeshes = scene.getActiveMeshes().length;
    const totalMeshes = scene.meshes.length;

    panel.innerHTML = [
      `<span style="color:#70c070">${fps}</span> FPS`,
      `Draw calls: ${drawCalls}`,
      `Meshes: ${activeMeshes} / ${totalMeshes}`,
      `Quality: <span style="color:#f0a050">${quality.tier}</span>`,
      `Render dist: ${quality.maxRenderDistance}`,
    ].join('<br>');
  }

  function toggle(): void {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    hint.style.display = visible ? 'none' : 'block';
  }

  // Listen for F3 toggle
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'F3') {
      e.preventDefault();
      // Skip if chat input is focused
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      toggle();
    }
  };
  window.addEventListener('keydown', handleKey);

  // Update interval
  intervalId = setInterval(refresh, 500);

  return {
    update() {
      // Called each frame but actual refresh is on interval
    },
    dispose() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      window.removeEventListener('keydown', handleKey);
      panel.remove();
      hint.remove();
    },
  };
}
