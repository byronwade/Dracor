export interface Minimap {
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number }>) => void;
  onClick: (handler: () => void) => void;
  dispose: () => void;
}

const SIZE = 160;
const WORLD_MIN = -250;
const WORLD_RANGE = 500;

function w2c(v: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * SIZE;
}

function simpleHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  return h;
}

export function createMinimap(): Minimap {
  const container = document.createElement('div');
  container.id = 'minimap-container';
  Object.assign(container.style, {
    position: 'absolute', bottom: '16px', right: '16px',
    pointerEvents: 'auto', cursor: 'pointer', zIndex: '10',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
  } satisfies Partial<CSSStyleDeclaration>);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  Object.assign(canvas.style, {
    width: `${SIZE}px`, height: `${SIZE}px`,
    borderRadius: '6px', display: 'block',
  } satisfies Partial<CSSStyleDeclaration>);

  const label = document.createElement('div');
  Object.assign(label.style, {
    color: 'rgba(200,180,150,0.6)', fontSize: '9px',
    fontFamily: 'serif', fontStyle: 'italic',
    marginTop: '4px', textAlign: 'center', userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  label.textContent = 'Ironvale Outskirts';

  container.appendChild(canvas);
  container.appendChild(label);
  document.body.appendChild(container);

  // Pre-render terrain with COARSE grid (fast)
  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = SIZE;
  staticCanvas.height = SIZE;
  const sCtx = staticCanvas.getContext('2d')!;

  const step = 4;
  for (let r = 0; r < SIZE; r += step) {
    const wz = WORLD_MIN + (r / SIZE) * WORLD_RANGE;
    for (let c = 0; c < SIZE; c += step) {
      const wx = WORLD_MIN + (c / SIZE) * WORLD_RANGE;
      const h = simpleHeight(wx, wz);
      const t = (h + 0.5) / 1.0;
      const red = Math.floor(35 + t * 45);
      const grn = Math.floor(30 + t * 35);
      const blu = Math.floor(18 + t * 20);
      sCtx.fillStyle = `rgb(${red},${grn},${blu})`;
      sCtx.fillRect(c, r, step, step);
    }
  }

  // Road
  sCtx.strokeStyle = 'rgba(160,145,120,0.3)';
  sCtx.lineWidth = 1.5;
  sCtx.setLineDash([3, 3]);
  sCtx.beginPath();
  const road = [[-220,-200],[-160,-140],[-100,-80],[-40,-20],[10,30],[60,90],[120,140],[170,180],[220,220]];
  road.forEach(([x, z], i) => {
    const cx = w2c(x), cy = w2c(z);
    if (i === 0) sCtx.moveTo(cx, cy); else sCtx.lineTo(cx, cy);
  });
  sCtx.stroke();
  sCtx.setLineDash([]);

  // Landmarks
  const landmarks = [{x:30,z:50,type:'shrine'},{x:-40,z:-20,type:'gate'},{x:100,z:120,type:'bridge'}];
  for (const lm of landmarks) {
    const cx = w2c(lm.x), cy = w2c(lm.z);
    if (lm.type === 'shrine') {
      sCtx.fillStyle = '#d47020';
      sCtx.beginPath();
      sCtx.moveTo(cx, cy - 4); sCtx.lineTo(cx + 3, cy);
      sCtx.lineTo(cx, cy + 4); sCtx.lineTo(cx - 3, cy);
      sCtx.closePath(); sCtx.fill();
    } else {
      sCtx.fillStyle = 'rgba(160,160,160,0.6)';
      sCtx.fillRect(cx - 2, cy - 2, 4, 4);
    }
  }

  // North
  sCtx.font = 'bold 8px serif';
  sCtx.textAlign = 'center';
  sCtx.fillStyle = 'rgba(200,180,150,0.5)';
  sCtx.fillText('N', SIZE / 2, 10);

  // Border
  sCtx.strokeStyle = 'rgba(120,100,65,0.2)';
  sCtx.lineWidth = 1;
  sCtx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

  const ctx = canvas.getContext('2d')!;
  let lastX = 0, lastZ = 0, lastYaw = 0;
  let remotes: Array<{ x: number; z: number }> = [];

  function redraw(): void {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(staticCanvas, 0, 0);

    // Remote players
    ctx.fillStyle = '#4da6ff';
    for (const p of remotes) {
      ctx.beginPath();
      ctx.arc(w2c(p.x), w2c(p.z), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    const cx = w2c(lastX), cy = w2c(lastZ);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(lastYaw) * 8, cy - Math.cos(lastYaw) * 8);
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c00'; ctx.fill();
  }

  redraw();

  let clickHandler: (() => void) | null = null;
  container.addEventListener('click', () => { if (clickHandler) clickHandler(); });

  return {
    updatePlayerPosition(x: number, z: number, yaw: number): void {
      lastX = x; lastZ = z; lastYaw = yaw; redraw();
    },
    updateRemotePlayers(players: Array<{ x: number; z: number }>): void {
      remotes = players;
    },
    onClick(handler: () => void): void { clickHandler = handler; },
    dispose(): void { container.remove(); },
  };
}
