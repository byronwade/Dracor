import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

export interface PerformancePanel {
  update(): void;
  toggle(): void;
  dispose(): void;
}

export function createPerformancePanel(engine: Engine, scene: Scene): PerformancePanel {
  let visible = false;
  const fpsSamples: number[] = [];
  const FPS_HISTORY_SIZE = 120;

  /* ---- Build DOM once ---- */
  const container = document.createElement('div');
  container.id = 'perf-panel';
  container.style.display = 'none';
  document.body.appendChild(container);

  const style = document.createElement('style');
  style.textContent = `
    #perf-panel {
      position: absolute;
      bottom: 8px;
      left: 8px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      background: rgba(0,0,0,0.75);
      color: #aaa;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.06);
      pointer-events: none;
      user-select: none;
      z-index: 9999;
      line-height: 1.6;
      min-width: 160px;
    }
    #perf-panel .perf-title {
      color: #f0a050;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 2px;
    }
    #perf-panel .perf-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    #perf-panel .perf-label { color: #666; }
    #perf-panel .perf-val { color: #aaa; text-align: right; }
  `;
  document.head.appendChild(style);

  /* Title */
  const title = document.createElement('div');
  title.className = 'perf-title';
  title.textContent = 'PERF [F4]';
  container.appendChild(title);

  /* Row builder: returns a span whose textContent is updated each frame */
  function makeRow(labelText: string): HTMLSpanElement {
    const row = document.createElement('div');
    row.className = 'perf-row';
    const label = document.createElement('span');
    label.className = 'perf-label';
    label.textContent = labelText;
    const val = document.createElement('span');
    val.className = 'perf-val';
    val.textContent = '—';
    row.appendChild(label);
    row.appendChild(val);
    container.appendChild(row);
    return val;
  }

  const vFps       = makeRow('FPS');
  const vAvgFps    = makeRow('Avg FPS');
  const vFrameMs   = makeRow('Frame');
  const vDrawCalls = makeRow('Draw calls');
  const vMeshes    = makeRow('Meshes');
  const vTriangles = makeRow('Triangles');

  /* ---- F4 key listener (self-contained) ---- */
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'F4') {
      e.preventDefault();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      toggle();
    }
  };
  window.addEventListener('keydown', handleKey);

  function toggle(): void {
    visible = !visible;
    container.style.display = visible ? 'block' : 'none';
  }

  function fpsColor(fps: number): string {
    if (fps >= 55) return '#44cc44';
    if (fps >= 40) return '#cccc44';
    if (fps >= 25) return '#cc8844';
    return '#cc4444';
  }

  function update(): void {
    if (!visible) return;

    const fps = engine.getFps();
    const ft = engine.getDeltaTime();

    fpsSamples.push(fps);
    if (fpsSamples.length > FPS_HISTORY_SIZE) fpsSamples.shift();
    const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;

    const dc = (engine as unknown as { _drawCalls?: { current: number } })
      ._drawCalls?.current ?? 0;
    const activeMeshes = scene.getActiveMeshes().length;
    const triCount = Math.round(
      ((scene as unknown as { totalActiveIndicesPerfCounter?: { current: number } })
        .totalActiveIndicesPerfCounter?.current ?? 0) / 3
    );

    vFps.textContent = fps.toFixed(0);
    vFps.style.color = fpsColor(fps);
    vAvgFps.textContent = avgFps.toFixed(0);
    vAvgFps.style.color = fpsColor(avgFps);
    vFrameMs.textContent = `${ft.toFixed(1)}ms`;
    vDrawCalls.textContent = String(dc);
    vMeshes.textContent = String(activeMeshes);
    vTriangles.textContent = triCount.toLocaleString();
  }

  function dispose(): void {
    window.removeEventListener('keydown', handleKey);
    style.remove();
    container.remove();
  }

  return { update, toggle, dispose };
}
