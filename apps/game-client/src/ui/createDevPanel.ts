import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import type { QualitySettings } from '../scenes/IronvaleOutskirtsScene';
import type { ConnectionState } from '../networking/networkTypes';
import type { NetworkStats } from '../game/MultiplayerClient';

type PanelMode = 'hidden' | 'compact' | 'full';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function getMemoryInfo(): MemoryInfo | null {
  const p = performance as unknown as { memory?: MemoryInfo };
  if (p.memory) return p.memory;
  return null;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtMs(ms: number): string {
  return ms < 1 ? '<1ms' : `${ms.toFixed(1)}ms`;
}

function colorForFps(fps: number): string {
  if (fps >= 55) return '#44cc44';
  if (fps >= 40) return '#cccc44';
  if (fps >= 25) return '#cc8844';
  return '#cc4444';
}

function colorForConnection(state: ConnectionState): string {
  if (state === 'connected') return '#44cc44';
  if (state === 'connecting') return '#cccc44';
  return '#cc4444';
}

export interface DevPanel {
  update: (stats: {
    connectionState: ConnectionState;
    networkStats: NetworkStats;
    playerCount: number;
    roomName: string;
  }) => void;
  setQualityTier: (tier: string) => void;
  dispose: () => void;
}

export function createDevPanel(
  engine: Engine,
  scene: Scene,
  quality: QualitySettings
): DevPanel {
  let mode: PanelMode = 'compact';
  let refreshInterval: ReturnType<typeof setInterval> | null = null;
  let qualityTier: string = quality.tier;
  let lastConnectionState: ConnectionState = 'disconnected';
  let lastNetworkStats: NetworkStats = { messagesSent: 0, messagesReceived: 0, sendRate: 0, receiveRate: 0, reconnectCount: 0, lastPingMs: 0, connectionUptime: 0 };
  let lastPlayerCount = 0;
  let lastRoomName = '';

  const frameTimeSamples: number[] = [];
  let peakMemoryMB = 0;
  let warningFlags: string[] = [];

  const container = document.createElement('div');
  container.id = 'dev-panel';
  document.body.appendChild(container);

  const compactBar = document.createElement('div');
  compactBar.id = 'dev-compact';
  container.appendChild(compactBar);

  const fullPanel = document.createElement('div');
  fullPanel.id = 'dev-full';
  container.appendChild(fullPanel);

  const style = document.createElement('style');
  style.textContent = `
    #dev-panel {
      position: absolute;
      top: 8px;
      right: 8px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      pointer-events: auto;
      user-select: none;
      z-index: 9999;
    }
    #dev-compact {
      background: rgba(0,0,0,0.7);
      color: #888;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.06);
      cursor: pointer;
      white-space: nowrap;
    }
    #dev-compact:hover { border-color: rgba(255,255,255,0.15); }
    #dev-full {
      display: none;
      background: rgba(0,0,0,0.85);
      color: #999;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
      margin-top: 4px;
      line-height: 1.7;
      min-width: 280px;
      max-height: 80vh;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    #dev-full .section { margin-bottom: 8px; }
    #dev-full .section-title {
      color: #666;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 3px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 2px;
    }
    #dev-full .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    #dev-full .label { color: #666; }
    #dev-full .val { color: #aaa; text-align: right; }
    #dev-full .warn { color: #cc4444; }
    #dev-full .good { color: #44cc44; }
    #dev-full .mid { color: #cccc44; }
    #dev-full .bar-bg {
      height: 3px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      margin-top: 2px;
      overflow: hidden;
    }
    #dev-full .bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    #dev-panel .pop-out {
      float: right;
      color: #555;
      cursor: pointer;
      font-size: 10px;
      margin-left: 8px;
    }
    #dev-panel .pop-out:hover { color: #aaa; }
  `;
  document.head.appendChild(style);

  function applyMode(): void {
    if (mode === 'hidden') {
      compactBar.style.display = 'none';
      fullPanel.style.display = 'none';
    } else if (mode === 'compact') {
      compactBar.style.display = 'block';
      fullPanel.style.display = 'none';
    } else {
      compactBar.style.display = 'block';
      fullPanel.style.display = 'block';
    }
  }

  function cycleMode(): void {
    if (mode === 'hidden') mode = 'compact';
    else if (mode === 'compact') mode = 'full';
    else mode = 'hidden';
    applyMode();
  }

  compactBar.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mode === 'compact') mode = 'full';
    else if (mode === 'full') mode = 'compact';
    applyMode();
  });

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'F3') {
      e.preventDefault();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      cycleMode();
    }
  };
  window.addEventListener('keydown', handleKey);

  function openPopout(): void {
    const w = window.open('', 'dracor-devtools', 'width=400,height=700,menubar=no,toolbar=no');
    if (!w) return;
    w.document.title = 'Dracor Dev Tools';
    w.document.body.style.cssText = 'background:#111;color:#aaa;font-family:Courier New,monospace;font-size:12px;padding:16px;margin:0;';
    const pre = w.document.createElement('pre');
    pre.id = 'devdata';
    pre.style.cssText = 'white-space:pre-wrap;line-height:1.8;';
    w.document.body.appendChild(pre);

    const popInterval = setInterval(() => {
      if (w.closed) { clearInterval(popInterval); return; }
      pre.textContent = buildTextReport();
    }, 500);
  }

  function buildTextReport(): string {
    const fps = engine.getFps();
    const dc = (engine as unknown as { _drawCalls?: { current: number } })._drawCalls?.current ?? 0;
    const active = scene.getActiveMeshes().length;
    const total = scene.meshes.length;
    const ft = frameTimeSamples.length > 0 ? frameTimeSamples.reduce((a, b) => a + b, 0) / frameTimeSamples.length : 0;
    const mem = getMemoryInfo();
    const ns = lastNetworkStats;

    let report = '=== DRACOR DEV TOOLS ===\n\n';
    report += `[RENDERER]\n`;
    report += `  FPS:          ${fps.toFixed(0)}\n`;
    report += `  Frame time:   ${fmtMs(ft)}\n`;
    report += `  Draw calls:   ${dc}\n`;
    report += `  Meshes:       ${active} active / ${total} total\n`;
    report += `  Materials:    ${scene.materials.length}\n`;
    report += `  Textures:     ${scene.textures.length}\n`;
    report += `  Lights:       ${scene.lights.length}\n`;
    report += `  Particles:    ${scene.particleSystems.length}\n`;
    report += `  Quality:      ${qualityTier}\n\n`;

    report += `[MEMORY]\n`;
    if (mem) {
      report += `  JS Heap:      ${fmtBytes(mem.usedJSHeapSize)} / ${fmtBytes(mem.totalJSHeapSize)}\n`;
      report += `  Heap limit:   ${fmtBytes(mem.jsHeapSizeLimit)}\n`;
      report += `  Peak used:    ${peakMemoryMB.toFixed(1)} MB\n`;
    } else {
      report += `  (Chrome-only API — not available)\n`;
    }
    report += '\n';

    report += `[NETWORK]\n`;
    report += `  Status:       ${lastConnectionState}\n`;
    report += `  Ping:         ${ns.lastPingMs > 0 ? ns.lastPingMs + 'ms' : '—'}\n`;
    report += `  Send rate:    ${ns.sendRate}/s\n`;
    report += `  Recv rate:    ${ns.receiveRate}/s\n`;
    report += `  Total sent:   ${ns.messagesSent}\n`;
    report += `  Total recv:   ${ns.messagesReceived}\n`;
    report += `  Uptime:       ${ns.connectionUptime}s\n`;
    report += `  Reconnects:   ${ns.reconnectCount}\n`;
    report += `  Room:         ${lastRoomName || '—'}\n`;
    report += `  Players:      ${lastPlayerCount}\n\n`;

    if (warningFlags.length > 0) {
      report += `[WARNINGS]\n`;
      for (const w of warningFlags) report += `  ⚠ ${w}\n`;
    } else {
      report += `[WARNINGS]\n  None\n`;
    }

    return report;
  }

  function refresh(): void {
    const fps = engine.getFps();
    const dc = (engine as unknown as { _drawCalls?: { current: number } })._drawCalls?.current ?? 0;
    const ft = engine.getDeltaTime();
    frameTimeSamples.push(ft);
    if (frameTimeSamples.length > 60) frameTimeSamples.shift();
    const avgFt = frameTimeSamples.reduce((a, b) => a + b, 0) / frameTimeSamples.length;

    const mem = getMemoryInfo();
    const usedMB = mem ? mem.usedJSHeapSize / 1048576 : 0;
    if (usedMB > peakMemoryMB) peakMemoryMB = usedMB;

    warningFlags = [];
    if (fps < 25) warningFlags.push(`Low FPS: ${fps.toFixed(0)}`);
    if (dc > 3000) warningFlags.push(`High draw calls: ${dc}`);
    if (mem && usedMB > 500) warningFlags.push(`High memory: ${usedMB.toFixed(0)}MB`);
    if (lastNetworkStats.lastPingMs > 200) warningFlags.push(`High ping: ${lastNetworkStats.lastPingMs}ms`);
    if (lastNetworkStats.reconnectCount > 3) warningFlags.push(`Frequent reconnects: ${lastNetworkStats.reconnectCount}`);

    const connColor = colorForConnection(lastConnectionState);
    const fpsColor = colorForFps(fps);
    const warnCount = warningFlags.length;

    compactBar.innerHTML = `<span style="color:${fpsColor}">${fps.toFixed(0)}</span> FPS`
      + ` <span style="color:#555">|</span> <span style="color:${connColor}">${lastConnectionState === 'connected' ? '●' : lastConnectionState === 'connecting' ? '◐' : '○'}</span>`
      + (mem ? ` <span style="color:#555">|</span> ${usedMB.toFixed(0)}MB` : '')
      + (warnCount > 0 ? ` <span style="color:#cc4444">| ⚠${warnCount}</span>` : '')
      + ` <span style="color:#444">[F3]</span>`;

    if (mode !== 'full') return;

    const active = scene.getActiveMeshes().length;
    const total = scene.meshes.length;
    const ns = lastNetworkStats;

    let html = '';

    html += `<div style="display:flex;justify-content:space-between;margin-bottom:6px;">`;
    html += `<span style="color:#f0a050;font-size:10px;font-weight:bold;">DRACOR DEV</span>`;
    html += `<span class="pop-out" id="dev-popout">⧉ pop out</span>`;
    html += `</div>`;

    html += `<div class="section"><div class="section-title">Renderer</div>`;
    html += row('FPS', `<span style="color:${fpsColor}">${fps.toFixed(0)}</span>`);
    html += row('Frame time', fmtMs(avgFt));
    html += row('Draw calls', String(dc), dc > 2000 ? 'mid' : dc > 3000 ? 'warn' : '');
    html += row('Triangles', `${Math.round((scene as unknown as { totalActiveIndicesPerfCounter: { current: number } }).totalActiveIndicesPerfCounter?.current / 3 || 0).toLocaleString()}`);
    html += row('Meshes', `${active} / ${total}`);
    html += row('Materials', String(scene.materials.length));
    html += row('Textures', String(scene.textures.length));
    html += row('Lights', String(scene.lights.length));
    html += row('Particles', String(scene.particleSystems.length));
    html += row('Quality', `<span style="color:#f0a050">${qualityTier}</span>`);
    html += `</div>`;

    html += `<div class="section"><div class="section-title">Memory</div>`;
    if (mem) {
      const pct = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
      const barColor = pct > 70 ? '#cc4444' : pct > 50 ? '#cccc44' : '#44cc44';
      html += row('JS Heap', `${fmtBytes(mem.usedJSHeapSize)} / ${fmtBytes(mem.totalJSHeapSize)}`);
      html += `<div class="bar-bg"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div></div>`;
      html += row('Heap limit', fmtBytes(mem.jsHeapSizeLimit));
      html += row('Peak used', `${peakMemoryMB.toFixed(1)} MB`);
    } else {
      html += `<div class="row"><span class="label" style="font-style:italic">Chrome-only API</span></div>`;
    }
    html += `</div>`;

    html += `<div class="section"><div class="section-title">Network</div>`;
    html += row('Status', `<span style="color:${connColor}">${lastConnectionState}</span>`);
    html += row('Ping', ns.lastPingMs > 0 ? `${ns.lastPingMs}ms` : '—', ns.lastPingMs > 150 ? 'warn' : ns.lastPingMs > 80 ? 'mid' : '');
    html += row('Send rate', `${ns.sendRate}/s`);
    html += row('Recv rate', `${ns.receiveRate}/s`);
    html += row('Total sent', String(ns.messagesSent));
    html += row('Total recv', String(ns.messagesReceived));
    html += row('Uptime', `${ns.connectionUptime}s`);
    html += row('Reconnects', String(ns.reconnectCount), ns.reconnectCount > 0 ? 'mid' : '');
    html += row('Room', lastRoomName || '—');
    html += row('Players', String(lastPlayerCount));
    html += `</div>`;

    if (warningFlags.length > 0) {
      html += `<div class="section"><div class="section-title" style="color:#cc4444">Warnings</div>`;
      for (const w of warningFlags) {
        html += `<div class="row"><span class="warn">⚠ ${w}</span></div>`;
      }
      html += `</div>`;
    }

    fullPanel.innerHTML = html;

    const popoutBtn = fullPanel.querySelector('#dev-popout');
    if (popoutBtn) {
      popoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPopout();
      });
    }
  }

  function row(label: string, value: string, cls?: string): string {
    const valClass = cls ? cls : 'val';
    return `<div class="row"><span class="label">${label}</span><span class="${valClass}">${value}</span></div>`;
  }

  refreshInterval = setInterval(refresh, 500);
  applyMode();

  return {
    update(stats) {
      lastConnectionState = stats.connectionState;
      lastNetworkStats = stats.networkStats;
      lastPlayerCount = stats.playerCount;
      lastRoomName = stats.roomName;
    },
    setQualityTier(tier: string) {
      qualityTier = tier;
    },
    dispose() {
      if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
      window.removeEventListener('keydown', handleKey);
      style.remove();
      container.remove();
    },
  };
}
