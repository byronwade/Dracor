import {
  renderTerrainLayer, renderContourLines, renderParchmentOverlay,
  renderWaterOverlay, renderRoad, renderTrails, renderTreeSymbols,
  renderRockScatter, renderGrassTufts, renderMarshSymbols,
  renderLandmarks, renderCamps, renderEdgeFog,
  renderOrnateFrame, renderCompass, renderPlayer, renderRemotePlayers,
} from './mapRenderer';

export interface Minimap {
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number }>) => void;
  onClick: (handler: () => void) => void;
  dispose: () => void;
}

const SIZE = 180;
const ZONE_NAME = 'Ironvale Outskirts';

export function createMinimap(): Minimap {
  const container = document.createElement('div');
  container.id = 'minimap-container';
  Object.assign(container.style, {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    pointerEvents: 'auto',
    cursor: 'pointer',
    zIndex: '10',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
  } satisfies Partial<CSSStyleDeclaration>);

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'relative',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    borderRadius: '6px',
    overflow: 'hidden',
  } satisfies Partial<CSSStyleDeclaration>);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  Object.assign(canvas.style, {
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    display: 'block',
  } satisfies Partial<CSSStyleDeclaration>);

  const label = document.createElement('div');
  Object.assign(label.style, {
    color: 'rgba(200, 180, 150, 0.6)',
    fontSize: '9px',
    fontFamily: 'serif',
    fontStyle: 'italic',
    marginTop: '4px',
    textAlign: 'center',
    userSelect: 'none',
    letterSpacing: '1px',
  } satisfies Partial<CSSStyleDeclaration>);
  label.textContent = ZONE_NAME;

  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
  container.appendChild(label);
  document.body.appendChild(container);

  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = SIZE;
  staticCanvas.height = SIZE;
  const sCtx = staticCanvas.getContext('2d')!;

  renderTerrainLayer(sCtx, SIZE);
  renderContourLines(sCtx, SIZE);
  renderParchmentOverlay(sCtx, SIZE);
  renderWaterOverlay(sCtx, SIZE, false);
  renderMarshSymbols(sCtx, SIZE);
  renderGrassTufts(sCtx, SIZE);
  renderRockScatter(sCtx, SIZE);
  renderTreeSymbols(sCtx, SIZE);
  renderRoad(sCtx, SIZE, false);
  renderTrails(sCtx, SIZE, false);
  renderLandmarks(sCtx, SIZE, false, 0);
  renderCamps(sCtx, SIZE, false);
  renderEdgeFog(sCtx, SIZE);
  renderCompass(sCtx, SIZE);
  renderOrnateFrame(sCtx, SIZE);

  const ctx = canvas.getContext('2d')!;
  let lastX = 0;
  let lastZ = 0;
  let lastYaw = 0;
  let remotes: Array<{ x: number; z: number }> = [];
  let pulse = 0;

  function redraw(): void {
    pulse += 0.016;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(staticCanvas, 0, 0);
    renderRemotePlayers(ctx, SIZE, remotes, false);
    renderPlayer(ctx, SIZE, lastX, lastZ, lastYaw, pulse);
  }

  redraw();

  let clickHandler: (() => void) | null = null;
  container.addEventListener('click', () => { if (clickHandler) clickHandler(); });

  return {
    updatePlayerPosition(x: number, z: number, yaw: number): void {
      lastX = x;
      lastZ = z;
      lastYaw = yaw;
      redraw();
    },
    updateRemotePlayers(players: Array<{ x: number; z: number }>): void {
      remotes = players;
    },
    onClick(handler: () => void): void {
      clickHandler = handler;
    },
    dispose(): void {
      container.remove();
    },
  };
}
