export interface WorldMap {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number; name?: string }>) => void;
  dispose: () => void;
}

const MAP = 600;
const WORLD_MIN = -250;
const WORLD_RANGE = 500;

function w2c(v: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * MAP;
}

function simpleHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  return h;
}

export function createWorldMap(): WorldMap {
  let visible = false;
  let animFrame = 0;
  let playerX = 0, playerZ = 0, playerYaw = 0;
  let remotePlayers: Array<{ x: number; z: number; name?: string }> = [];

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '1000',
    background: 'rgba(8,6,4,0.92)', display: 'none',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement('div');
  Object.assign(header.style, {
    color: 'rgba(200,180,150,0.7)', fontFamily: 'serif',
    fontStyle: 'italic', fontSize: '16px', marginBottom: '14px',
    letterSpacing: '3px', userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  header.textContent = 'Ironvale Outskirts';

  const canvas = document.createElement('canvas');
  canvas.width = MAP;
  canvas.height = MAP;
  Object.assign(canvas.style, {
    display: 'block', maxWidth: 'min(85vw, 85vh)', maxHeight: 'min(85vw, 85vh)',
    width: `${MAP}px`, height: `${MAP}px`, borderRadius: '4px',
    border: '1px solid rgba(160,130,80,0.2)',
  } satisfies Partial<CSSStyleDeclaration>);

  const hint = document.createElement('div');
  Object.assign(hint.style, {
    color: 'rgba(160,140,110,0.35)', fontFamily: 'serif',
    fontStyle: 'italic', fontSize: '11px', marginTop: '12px', userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  hint.textContent = 'click or press ESC to close';

  overlay.appendChild(header);
  overlay.appendChild(canvas);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext('2d')!;

  // Pre-render terrain at coarse resolution
  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = MAP;
  staticCanvas.height = MAP;
  const sCtx = staticCanvas.getContext('2d')!;

  const step = 4;
  for (let r = 0; r < MAP; r += step) {
    const wz = WORLD_MIN + (r / MAP) * WORLD_RANGE;
    for (let c = 0; c < MAP; c += step) {
      const wx = WORLD_MIN + (c / MAP) * WORLD_RANGE;
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
  sCtx.strokeStyle = 'rgba(170,155,130,0.4)';
  sCtx.lineWidth = 3;
  sCtx.setLineDash([6, 5]);
  sCtx.beginPath();
  const road = [[-220,-200],[-160,-140],[-100,-80],[-40,-20],[10,30],[60,90],[120,140],[170,180],[220,220]];
  road.forEach(([x, z], i) => {
    const cx = w2c(x), cy = w2c(z);
    if (i === 0) sCtx.moveTo(cx, cy); else sCtx.lineTo(cx, cy);
  });
  sCtx.stroke();
  sCtx.setLineDash([]);

  // Landmarks
  const landmarks = [
    {x:30,z:50,type:'shrine',name:'Dracor Memory Shrine'},
    {x:-40,z:-20,type:'gate',name:'Ruined Frontier Gate'},
    {x:100,z:120,type:'bridge',name:'Ashwood Crossing'},
  ];
  for (const lm of landmarks) {
    const cx = w2c(lm.x), cy = w2c(lm.z);
    if (lm.type === 'shrine') {
      sCtx.fillStyle = '#d47020';
      sCtx.beginPath();
      sCtx.moveTo(cx, cy - 7); sCtx.lineTo(cx + 5, cy);
      sCtx.lineTo(cx, cy + 7); sCtx.lineTo(cx - 5, cy);
      sCtx.closePath(); sCtx.fill();
    } else {
      sCtx.fillStyle = 'rgba(160,160,160,0.6)';
      sCtx.fillRect(cx - 3, cy - 3, 6, 6);
    }
    sCtx.font = 'bold 10px serif';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = 'rgba(210,195,165,0.6)';
    sCtx.fillText(lm.name, cx, cy - 12);
  }

  // North + border
  sCtx.font = 'bold 10px serif';
  sCtx.textAlign = 'center';
  sCtx.fillStyle = 'rgba(200,180,150,0.5)';
  sCtx.fillText('N', MAP / 2, 14);
  sCtx.strokeStyle = 'rgba(120,100,65,0.2)';
  sCtx.lineWidth = 1;
  sCtx.strokeRect(3, 3, MAP - 6, MAP - 6);

  function redraw(): void {
    ctx.clearRect(0, 0, MAP, MAP);
    ctx.drawImage(staticCanvas, 0, 0);

    for (const p of remotePlayers) {
      const cx = w2c(p.x), cy = w2c(p.z);
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60,130,200,0.65)'; ctx.fill();
      if (p.name) {
        ctx.font = '9px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(100,170,240,0.6)';
        ctx.fillText(p.name, cx, cy + 12);
      }
    }

    const cx = w2c(playerX), cy = w2c(playerZ);
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c00'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb347'; ctx.fillText('You', cx, cy + 18);
  }

  function loop(): void {
    if (!visible) return;
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
      e.preventDefault(); e.stopPropagation(); close();
    }
  }
  window.addEventListener('keydown', onKey, true);

  return {
    open, close,
    toggle(): void { if (visible) close(); else open(); },
    isOpen(): boolean { return visible; },
    updatePlayerPosition(x: number, z: number, yaw: number): void {
      playerX = x; playerZ = z; playerYaw = yaw;
    },
    updateRemotePlayers(p: Array<{ x: number; z: number; name?: string }>): void {
      remotePlayers = p;
    },
    dispose(): void { close(); window.removeEventListener('keydown', onKey, true); overlay.remove(); },
  };
}
