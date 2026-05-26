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

export interface StreamingStats {
  loadedCells: number;
  totalCells: number;
  loadingCells: number;
  vramUsage: { textureMB: number; meshMB: number; totalMB: number };
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
    streamingStats?: StreamingStats;
  }) => void;
  setQualityTier: (tier: string) => void;
  dispose: () => void;
}

/* ---- DOM builder helpers ---- */

interface ValueRef {
  el: HTMLSpanElement;
  set(text: string): void;
  setHtml(html: string): void;
}

function createRow(parent: HTMLElement): { label: HTMLSpanElement; value: ValueRef } {
  const row = document.createElement('div');
  row.className = 'row';
  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  const valueEl = document.createElement('span');
  valueEl.className = 'val';
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  parent.appendChild(row);
  return {
    label: labelEl,
    value: {
      el: valueEl,
      set(text: string) { valueEl.textContent = text; },
      setHtml(html: string) { valueEl.innerHTML = html; },
    },
  };
}

function createSection(parent: HTMLElement, title: string): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'section';
  const titleEl = document.createElement('div');
  titleEl.className = 'section-title';
  titleEl.textContent = title;
  section.appendChild(titleEl);
  parent.appendChild(section);
  return section;
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
  let lastNetworkStats: NetworkStats = {
    messagesSent: 0, messagesReceived: 0, sendRate: 0,
    receiveRate: 0, reconnectCount: 0, lastPingMs: 0, connectionUptime: 0,
  };
  let lastPlayerCount = 0;
  let lastRoomName = '';
  let lastStreamingStats: StreamingStats | undefined;

  const frameTimeSamples: number[] = [];
  let peakMemoryMB = 0;
  let warningFlags: string[] = [];

  /* ---- Build container ---- */
  const container = document.createElement('div');
  container.id = 'dev-panel';
  document.body.appendChild(container);

  /* ---- Compact bar: stable DOM, update textContent on spans ---- */
  const compactBar = document.createElement('div');
  compactBar.id = 'dev-compact';
  container.appendChild(compactBar);

  const compactFps = document.createElement('span');
  const compactSep1 = document.createElement('span');
  compactSep1.style.color = '#555';
  compactSep1.textContent = ' | ';
  const compactConn = document.createElement('span');
  const compactMemSpan = document.createElement('span');
  const compactWarnSpan = document.createElement('span');
  const compactF3Hint = document.createElement('span');
  compactF3Hint.style.color = '#444';
  compactF3Hint.textContent = ' [F3]';

  compactBar.appendChild(compactFps);
  compactBar.appendChild(compactSep1);
  compactBar.appendChild(compactConn);
  compactBar.appendChild(compactMemSpan);
  compactBar.appendChild(compactWarnSpan);
  compactBar.appendChild(compactF3Hint);

  /* ---- Full panel: create DOM once, hold refs to value spans ---- */
  const fullPanel = document.createElement('div');
  fullPanel.id = 'dev-full';
  container.appendChild(fullPanel);

  /* Header */
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;';
  const headerTitle = document.createElement('span');
  headerTitle.style.cssText = 'color:#f0a050;font-size:10px;font-weight:bold;';
  headerTitle.textContent = 'DRACOR DEV';
  const popOutBtn = document.createElement('span');
  popOutBtn.className = 'pop-out';
  popOutBtn.textContent = '⧉ pop out';
  headerDiv.appendChild(headerTitle);
  headerDiv.appendChild(popOutBtn);
  fullPanel.appendChild(headerDiv);

  popOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPopout();
  });

  /* Renderer section */
  const rendererSec = createSection(fullPanel, 'Renderer');
  const rFps       = createRow(rendererSec); rFps.label.textContent = 'FPS';
  const rFt        = createRow(rendererSec); rFt.label.textContent = 'Frame time';
  const rDc        = createRow(rendererSec); rDc.label.textContent = 'Draw calls';
  const rTri       = createRow(rendererSec); rTri.label.textContent = 'Triangles';
  const rMeshes    = createRow(rendererSec); rMeshes.label.textContent = 'Meshes';
  const rMaterials = createRow(rendererSec); rMaterials.label.textContent = 'Materials';
  const rTextures  = createRow(rendererSec); rTextures.label.textContent = 'Textures';
  const rLights    = createRow(rendererSec); rLights.label.textContent = 'Lights';
  const rParticles = createRow(rendererSec); rParticles.label.textContent = 'Particles';
  const rQuality   = createRow(rendererSec); rQuality.label.textContent = 'Quality';

  /* Memory section */
  const memorySec  = createSection(fullPanel, 'Memory');
  const mHeap      = createRow(memorySec); mHeap.label.textContent = 'JS Heap';
  const mBarBg     = document.createElement('div'); mBarBg.className = 'bar-bg';
  const mBarFill   = document.createElement('div'); mBarFill.className = 'bar-fill';
  mBarBg.appendChild(mBarFill);
  memorySec.appendChild(mBarBg);
  const mLimit     = createRow(memorySec); mLimit.label.textContent = 'Heap limit';
  const mPeak      = createRow(memorySec); mPeak.label.textContent = 'Peak used';
  const mNoApi     = document.createElement('div'); mNoApi.className = 'row';
  const mNoApiSpan = document.createElement('span');
  mNoApiSpan.className = 'label';
  mNoApiSpan.style.fontStyle = 'italic';
  mNoApiSpan.textContent = 'Chrome-only API';
  mNoApi.appendChild(mNoApiSpan);
  memorySec.appendChild(mNoApi);

  /* Streaming section */
  const streamingSec = createSection(fullPanel, 'Streaming');
  const sCells      = createRow(streamingSec); sCells.label.textContent = 'Cells';
  const sLoading    = createRow(streamingSec); sLoading.label.textContent = 'Loading';
  const sVramTex    = createRow(streamingSec); sVramTex.label.textContent = 'VRAM tex';
  const sVramMesh   = createRow(streamingSec); sVramMesh.label.textContent = 'VRAM mesh';
  const sVramTotal  = createRow(streamingSec); sVramTotal.label.textContent = 'VRAM total';

  /* Network section */
  const networkSec  = createSection(fullPanel, 'Network');
  const nStatus     = createRow(networkSec); nStatus.label.textContent = 'Status';
  const nPing       = createRow(networkSec); nPing.label.textContent = 'Ping';
  const nSendRate   = createRow(networkSec); nSendRate.label.textContent = 'Send rate';
  const nRecvRate   = createRow(networkSec); nRecvRate.label.textContent = 'Recv rate';
  const nTotalSent  = createRow(networkSec); nTotalSent.label.textContent = 'Total sent';
  const nTotalRecv  = createRow(networkSec); nTotalRecv.label.textContent = 'Total recv';
  const nUptime     = createRow(networkSec); nUptime.label.textContent = 'Uptime';
  const nReconn     = createRow(networkSec); nReconn.label.textContent = 'Reconnects';
  const nRoom       = createRow(networkSec); nRoom.label.textContent = 'Room';
  const nPlayers    = createRow(networkSec); nPlayers.label.textContent = 'Players';

  /* Warnings section */
  const warningsSec = createSection(fullPanel, 'Warnings');
  warningsSec.style.display = 'none';
  const warningsTitleEl = warningsSec.querySelector('.section-title') as HTMLElement;
  warningsTitleEl.style.color = '#cc4444';
  const warningsContent = document.createElement('div');
  warningsSec.appendChild(warningsContent);

  /* ---- Stylesheet ---- */
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

  /* ---- Mode management ---- */
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

  /* ---- Pop-out window ---- */
  function buildTextReport(): string {
    const fps = engine.getFps();
    const dc = (engine as unknown as { _drawCalls?: { current: number } })._drawCalls?.current ?? 0;
    const active = scene.getActiveMeshes().length;
    const total = scene.meshes.length;
    const ft = frameTimeSamples.length > 0
      ? frameTimeSamples.reduce((a, b) => a + b, 0) / frameTimeSamples.length : 0;
    const mem = getMemoryInfo();
    const ns = lastNetworkStats;

    let report = '=== DRACOR DEV TOOLS ===\n\n';
    report += '[RENDERER]\n';
    report += `  FPS:          ${fps.toFixed(0)}\n`;
    report += `  Frame time:   ${fmtMs(ft)}\n`;
    report += `  Draw calls:   ${dc}\n`;
    report += `  Meshes:       ${active} active / ${total} total\n`;
    report += `  Materials:    ${scene.materials.length}\n`;
    report += `  Textures:     ${scene.textures.length}\n`;
    report += `  Lights:       ${scene.lights.length}\n`;
    report += `  Particles:    ${scene.particleSystems.length}\n`;
    report += `  Quality:      ${qualityTier}\n\n`;

    report += '[MEMORY]\n';
    if (mem) {
      report += `  JS Heap:      ${fmtBytes(mem.usedJSHeapSize)} / ${fmtBytes(mem.totalJSHeapSize)}\n`;
      report += `  Heap limit:   ${fmtBytes(mem.jsHeapSizeLimit)}\n`;
      report += `  Peak used:    ${peakMemoryMB.toFixed(1)} MB\n`;
    } else {
      report += '  (Chrome-only API -- not available)\n';
    }
    report += '\n';

    if (lastStreamingStats) {
      const ss = lastStreamingStats;
      report += '[STREAMING]\n';
      report += `  Cells:        ${ss.loadedCells} / ${ss.totalCells}\n`;
      report += `  Loading:      ${ss.loadingCells}\n`;
      report += `  VRAM tex:     ${ss.vramUsage.textureMB.toFixed(1)} MB\n`;
      report += `  VRAM mesh:    ${ss.vramUsage.meshMB.toFixed(1)} MB\n`;
      report += `  VRAM total:   ${ss.vramUsage.totalMB.toFixed(1)} MB\n\n`;
    }

    report += '[NETWORK]\n';
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
      report += '[WARNINGS]\n';
      for (const w of warningFlags) report += `  ! ${w}\n`;
    } else {
      report += '[WARNINGS]\n  None\n';
    }

    return report;
  }

  function openPopout(): void {
    const w = window.open('', 'dracor-devtools', 'width=400,height=700,menubar=no,toolbar=no');
    if (!w) return;
    w.document.title = 'Dracor Dev Tools';
    w.document.body.style.cssText =
      'background:#111;color:#aaa;font-family:Courier New,monospace;font-size:12px;padding:16px;margin:0;';
    const pre = w.document.createElement('pre');
    pre.id = 'devdata';
    pre.style.cssText = 'white-space:pre-wrap;line-height:1.8;';
    w.document.body.appendChild(pre);

    const popInterval = setInterval(() => {
      if (w.closed) { clearInterval(popInterval); return; }
      pre.textContent = buildTextReport();
    }, 500);
  }

  /* ---- Refresh: update textContent on pre-built DOM ---- */
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

    /* Update compact bar via textContent on individual spans */
    compactFps.textContent = `${fps.toFixed(0)} FPS`;
    compactFps.style.color = fpsColor;

    const connSymbol = lastConnectionState === 'connected' ? '●'
      : lastConnectionState === 'connecting' ? '◐' : '○';
    compactConn.textContent = connSymbol + ' ';
    compactConn.style.color = connColor;

    if (mem) {
      compactMemSpan.textContent = ` | ${usedMB.toFixed(0)}MB`;
      compactMemSpan.style.color = '#888';
    } else {
      compactMemSpan.textContent = '';
    }

    if (warnCount > 0) {
      compactWarnSpan.textContent = ` | !${warnCount}`;
      compactWarnSpan.style.color = '#cc4444';
    } else {
      compactWarnSpan.textContent = '';
    }

    if (mode !== 'full') return;

    /* Update full panel value refs via textContent */
    const active = scene.getActiveMeshes().length;
    const total = scene.meshes.length;
    const ns = lastNetworkStats;
    const triCount = Math.round(
      ((scene as unknown as { totalActiveIndicesPerfCounter?: { current: number } })
        .totalActiveIndicesPerfCounter?.current ?? 0) / 3
    );

    /* Renderer */
    rFps.value.setHtml(`<span style="color:${fpsColor}">${fps.toFixed(0)}</span>`);
    rFt.value.set(fmtMs(avgFt));
    rDc.value.set(String(dc));
    rDc.value.el.className = dc > 3000 ? 'warn' : dc > 2000 ? 'mid' : 'val';
    rTri.value.set(triCount.toLocaleString());
    rMeshes.value.set(`${active} / ${total}`);
    rMaterials.value.set(String(scene.materials.length));
    rTextures.value.set(String(scene.textures.length));
    rLights.value.set(String(scene.lights.length));
    rParticles.value.set(String(scene.particleSystems.length));
    rQuality.value.setHtml(`<span style="color:#f0a050">${qualityTier}</span>`);

    /* Memory */
    if (mem) {
      const pct = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
      const barColor = pct > 70 ? '#cc4444' : pct > 50 ? '#cccc44' : '#44cc44';
      mHeap.value.set(`${fmtBytes(mem.usedJSHeapSize)} / ${fmtBytes(mem.totalJSHeapSize)}`);
      mBarBg.style.display = '';
      mBarFill.style.width = `${pct.toFixed(1)}%`;
      mBarFill.style.background = barColor;
      mLimit.label.parentElement!.style.display = '';
      mLimit.value.set(fmtBytes(mem.jsHeapSizeLimit));
      mPeak.label.parentElement!.style.display = '';
      mPeak.value.set(`${peakMemoryMB.toFixed(1)} MB`);
      mNoApi.style.display = 'none';
    } else {
      mHeap.label.parentElement!.style.display = 'none';
      mBarBg.style.display = 'none';
      mLimit.label.parentElement!.style.display = 'none';
      mPeak.label.parentElement!.style.display = 'none';
      mNoApi.style.display = '';
    }

    /* Streaming */
    if (lastStreamingStats) {
      streamingSec.style.display = '';
      const ss = lastStreamingStats;
      sCells.value.set(`${ss.loadedCells} / ${ss.totalCells}`);
      sLoading.value.set(String(ss.loadingCells));
      sVramTex.value.set(`${ss.vramUsage.textureMB.toFixed(1)} MB`);
      sVramMesh.value.set(`${ss.vramUsage.meshMB.toFixed(1)} MB`);
      sVramTotal.value.set(`${ss.vramUsage.totalMB.toFixed(1)} MB`);
    } else {
      streamingSec.style.display = 'none';
    }

    /* Network */
    nStatus.value.setHtml(`<span style="color:${connColor}">${lastConnectionState}</span>`);
    nPing.value.set(ns.lastPingMs > 0 ? `${ns.lastPingMs}ms` : '—');
    nPing.value.el.className = ns.lastPingMs > 150 ? 'warn' : ns.lastPingMs > 80 ? 'mid' : 'val';
    nSendRate.value.set(`${ns.sendRate}/s`);
    nRecvRate.value.set(`${ns.receiveRate}/s`);
    nTotalSent.value.set(String(ns.messagesSent));
    nTotalRecv.value.set(String(ns.messagesReceived));
    nUptime.value.set(`${ns.connectionUptime}s`);
    nReconn.value.set(String(ns.reconnectCount));
    nReconn.value.el.className = ns.reconnectCount > 0 ? 'mid' : 'val';
    nRoom.value.set(lastRoomName || '—');
    nPlayers.value.set(String(lastPlayerCount));

    /* Warnings */
    if (warningFlags.length > 0) {
      warningsSec.style.display = '';
      warningsContent.textContent = '';
      for (const w of warningFlags) {
        const wRow = document.createElement('div');
        wRow.className = 'row';
        const wSpan = document.createElement('span');
        wSpan.className = 'warn';
        wSpan.textContent = `! ${w}`;
        wRow.appendChild(wSpan);
        warningsContent.appendChild(wRow);
      }
    } else {
      warningsSec.style.display = 'none';
    }
  }

  refreshInterval = setInterval(refresh, 500);
  applyMode();

  return {
    update(stats) {
      lastConnectionState = stats.connectionState;
      lastNetworkStats = stats.networkStats;
      lastPlayerCount = stats.playerCount;
      lastRoomName = stats.roomName;
      lastStreamingStats = stats.streamingStats;
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
