import {
  renderTerrainLayer, renderContourLines, renderParchmentOverlay,
  renderWaterOverlay, renderRoad, renderTrails, renderTreeSymbols,
  renderRockScatter, renderGrassTufts, renderMarshSymbols,
  renderLandmarks, renderCamps, renderBiomeLabels,
  renderEdgeFog, renderOrnateFrame, renderCompass,
  renderPlayer, renderRemotePlayers,
  WORLD_MIN, WORLD_RANGE,
} from './mapRenderer';

export interface WorldMap {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number; name?: string }>) => void;
  dispose: () => void;
}

const MAP_SIZE = 800;

function renderGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(160, 130, 80, 0.06)';
  ctx.lineWidth = 0.5;
  const step = MAP_SIZE / 10;
  for (let i = 1; i < 10; i++) {
    const p = i * step;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, MAP_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(MAP_SIZE, p); ctx.stroke();
  }

  ctx.font = 'italic 9px serif';
  ctx.fillStyle = 'rgba(160, 130, 80, 0.2)';
  const labelStep = MAP_SIZE / 5;
  for (let i = 0; i <= 5; i++) {
    const coord = WORLD_MIN + i * (WORLD_RANGE / 5);
    const px = i * labelStep;
    ctx.textAlign = 'center';
    ctx.fillText(`${coord}`, px, MAP_SIZE - 6);
    ctx.textAlign = 'left';
    ctx.fillText(`${coord}`, 6, px + 3);
  }
}

export function createWorldMap(): WorldMap {
  let visible = false;
  let animFrame = 0;
  let pulseTime = 0;
  let playerX = 0;
  let playerZ = 0;
  let playerYaw = 0;
  let remotePlayers: Array<{ x: number; z: number; name?: string }> = [];

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '1000',
    background: 'rgba(8, 6, 4, 0.92)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    backdropFilter: 'blur(8px)',
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement('div');
  Object.assign(header.style, {
    color: 'rgba(200, 180, 150, 0.7)',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: '16px',
    marginBottom: '14px',
    letterSpacing: '3px',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  header.textContent = 'Ironvale Outskirts';

  const mapFrame = document.createElement('div');
  Object.assign(mapFrame.style, {
    position: 'relative',
    padding: '8px',
    background: 'linear-gradient(135deg, rgba(60,50,35,0.4), rgba(30,25,18,0.6))',
    borderRadius: '4px',
    border: '1px solid rgba(160, 130, 80, 0.2)',
    boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
  } satisfies Partial<CSSStyleDeclaration>);

  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE;
  canvas.height = MAP_SIZE;
  Object.assign(canvas.style, {
    display: 'block',
    maxWidth: 'min(85vw, 85vh)',
    maxHeight: 'min(85vw, 85vh)',
    width: `${MAP_SIZE}px`,
    height: `${MAP_SIZE}px`,
    borderRadius: '2px',
  } satisfies Partial<CSSStyleDeclaration>);

  const hint = document.createElement('div');
  Object.assign(hint.style, {
    color: 'rgba(160, 140, 110, 0.35)',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: '11px',
    marginTop: '12px',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  hint.textContent = 'click or press ESC to close';

  mapFrame.appendChild(canvas);
  overlay.appendChild(header);
  overlay.appendChild(mapFrame);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext('2d')!;

  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = MAP_SIZE;
  staticCanvas.height = MAP_SIZE;
  const sCtx = staticCanvas.getContext('2d')!;

  renderTerrainLayer(sCtx, MAP_SIZE);
  renderContourLines(sCtx, MAP_SIZE);
  renderParchmentOverlay(sCtx, MAP_SIZE);
  renderWaterOverlay(sCtx, MAP_SIZE, true);
  renderMarshSymbols(sCtx, MAP_SIZE);
  renderGrassTufts(sCtx, MAP_SIZE);
  renderRockScatter(sCtx, MAP_SIZE);
  renderGrid(sCtx);
  renderTreeSymbols(sCtx, MAP_SIZE);
  renderBiomeLabels(sCtx, MAP_SIZE);
  renderRoad(sCtx, MAP_SIZE, true);
  renderTrails(sCtx, MAP_SIZE, true);
  renderCamps(sCtx, MAP_SIZE, true);
  renderEdgeFog(sCtx, MAP_SIZE);
  renderOrnateFrame(sCtx, MAP_SIZE);
  renderCompass(sCtx, MAP_SIZE);

  function redraw(): void {
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.drawImage(staticCanvas, 0, 0);
    renderLandmarks(ctx, MAP_SIZE, true, pulseTime);
    renderRemotePlayers(ctx, MAP_SIZE, remotePlayers, true);
    renderPlayer(ctx, MAP_SIZE, playerX, playerZ, playerYaw, pulseTime);
  }

  function loop(): void {
    if (!visible) return;
    pulseTime += 0.016;
    redraw();
    animFrame = requestAnimationFrame(loop);
  }

  function open(): void {
    if (visible) return;
    visible = true;
    overlay.style.display = 'flex';
    redraw();
    animFrame = requestAnimationFrame(loop);
  }

  function close(): void {
    if (!visible) return;
    visible = false;
    overlay.style.display = 'none';
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  overlay.addEventListener('click', close);

  function onKey(e: KeyboardEvent): void {
    if ((e.key === 'Escape' || e.key === 'm' || e.key === 'M') && visible) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }
  window.addEventListener('keydown', onKey, true);

  return {
    open,
    close,
    toggle(): void { if (visible) close(); else open(); },
    isOpen(): boolean { return visible; },
    updatePlayerPosition(x: number, z: number, yaw: number): void {
      playerX = x; playerZ = z; playerYaw = yaw;
    },
    updateRemotePlayers(p: Array<{ x: number; z: number; name?: string }>): void {
      remotePlayers = p;
    },
    dispose(): void {
      close();
      window.removeEventListener('keydown', onKey, true);
      overlay.remove();
    },
  };
}
