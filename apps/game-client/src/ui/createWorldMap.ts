export interface WorldMap {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number; name?: string }>) => void;
  dispose: () => void;
}

const CANVAS_SIZE = 800;
const WORLD_MIN = -250;
const WORLD_MAX = 250;
const WORLD_RANGE = WORLD_MAX - WORLD_MIN;
const TERRAIN_SAMPLE_STEP = 2;

const ROAD_POINTS = [
  { x: -220, z: -200 },
  { x: -160, z: -140 },
  { x: -100, z: -80 },
  { x: -40, z: -20 },
  { x: 10, z: 30 },
  { x: 60, z: 90 },
  { x: 120, z: 140 },
  { x: 170, z: 180 },
  { x: 220, z: 220 },
];

const LANDMARKS: Array<{ x: number; z: number; type: string; name: string }> = [
  { x: 30, z: 50, type: 'shrine', name: 'Dracor Memory Shrine' },
  { x: -40, z: -20, type: 'gate', name: 'Ruined Frontier Gate' },
  { x: 100, z: 120, type: 'bridge', name: 'Ashwood Crossing' },
];

const WATER_BODIES: Array<{ x: number; z: number; w: number; d: number }> = [
  { x: 90, z: 110, w: 5, d: 80 },
];

const BIOME_REGIONS: Array<{
  name: string; cx: number; cz: number; radius: number;
  color: [number, number, number];
}> = [
  { name: 'Dark Pine Frontier', cx: 0, cz: 0, radius: 220, color: [0.18, 0.14, 0.1] },
  { name: 'Wolfpine Deep', cx: -160, cz: -140, radius: 100, color: [0.12, 0.1, 0.07] },
  { name: 'Cliff Outcrops', cx: -180, cz: -120, radius: 60, color: [0.22, 0.18, 0.15] },
];

function sampleHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  h += Math.sin(x * 0.07 + 3.1) * Math.cos(z * 0.06 + 2.1) * 0.08;
  h += Math.sin(x * 0.15 + 5.0) * Math.sin(z * 0.12 + 4.0) * 0.03;
  const dist = Math.sqrt(x * x + z * z);
  const flatten = Math.min(1.0, dist / 60.0);
  return h * 8.0 * flatten;
}

function worldToCanvas(v: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * CANVAS_SIZE;
}

function getBiomeTint(wx: number, wz: number): [number, number, number] | null {
  for (const b of BIOME_REGIONS) {
    const dx = wx - b.cx;
    const dz = wz - b.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < b.radius * 0.6) return b.color;
    if (dist < b.radius) {
      const t = (dist - b.radius * 0.6) / (b.radius * 0.4);
      const base = BIOME_REGIONS[0].color;
      return [
        base[0] + (b.color[0] - base[0]) * (1 - t),
        base[1] + (b.color[1] - base[1]) * (1 - t),
        base[2] + (b.color[2] - base[2]) * (1 - t),
      ];
    }
  }
  return null;
}

function renderTerrain(ctx: CanvasRenderingContext2D): void {
  const cols = Math.ceil(CANVAS_SIZE / TERRAIN_SAMPLE_STEP);
  const rows = cols;
  const samples: number[] = [];
  let hMin = Infinity;
  let hMax = -Infinity;

  for (let row = 0; row < rows; row++) {
    const wz = WORLD_MIN + (row / rows) * WORLD_RANGE;
    for (let col = 0; col < cols; col++) {
      const wx = WORLD_MIN + (col / cols) * WORLD_RANGE;
      const h = sampleHeight(wx, wz);
      samples.push(h);
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }

  const hRange = hMax - hMin || 1;
  let idx = 0;

  for (let row = 0; row < rows; row++) {
    const py = row * TERRAIN_SAMPLE_STEP;
    const wz = WORLD_MIN + (row / rows) * WORLD_RANGE;
    for (let col = 0; col < cols; col++) {
      const px = col * TERRAIN_SAMPLE_STEP;
      const wx = WORLD_MIN + (col / cols) * WORLD_RANGE;
      const t = (samples[idx] - hMin) / hRange;

      const tint = getBiomeTint(wx, wz);
      let r: number, g: number, b: number;

      if (tint) {
        const base = 40 + t * 80;
        r = Math.floor(base * (tint[0] / 0.18));
        g = Math.floor(base * (tint[1] / 0.14));
        b = Math.floor(base * (tint[2] / 0.1));
      } else {
        r = Math.floor(30 + t * 60);
        g = Math.floor(20 + t * 45);
        b = Math.floor(10 + t * 20);
      }

      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, TERRAIN_SAMPLE_STEP, TERRAIN_SAMPLE_STEP);
      idx++;
    }
  }
}

function renderWater(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(40, 80, 140, 0.6)';
  for (const w of WATER_BODIES) {
    const cx = worldToCanvas(w.x);
    const cz = worldToCanvas(w.z);
    const cw = (w.w / WORLD_RANGE) * CANVAS_SIZE;
    const cd = (w.d / WORLD_RANGE) * CANVAS_SIZE;
    ctx.fillRect(cx - cw / 2, cz - cd / 2, cw, cd);
  }
}

function renderRoad(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(180, 170, 150, 0.5)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  for (let i = 0; i < ROAD_POINTS.length; i++) {
    const cx = worldToCanvas(ROAD_POINTS[i].x);
    const cy = worldToCanvas(ROAD_POINTS[i].z);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(180, 170, 150, 0.5)';
  ctx.textAlign = 'center';
  const mid = ROAD_POINTS[Math.floor(ROAD_POINTS.length / 2)];
  ctx.fillText('Old Cobblestone Road', worldToCanvas(mid.x), worldToCanvas(mid.z) - 8);
}

function renderLandmarks(ctx: CanvasRenderingContext2D): void {
  for (const lm of LANDMARKS) {
    const cx = worldToCanvas(lm.x);
    const cy = worldToCanvas(lm.z);

    if (lm.type === 'shrine') {
      const s = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fillStyle = '#e87f24';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 180, 60, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, s + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232, 127, 36, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (lm.type === 'bridge') {
      ctx.fillStyle = 'rgba(140, 120, 100, 0.8)';
      ctx.fillRect(cx - 5, cy - 3, 10, 6);
      ctx.strokeStyle = 'rgba(180, 160, 140, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 5, cy - 3, 10, 6);
    } else {
      const s = 6;
      ctx.fillStyle = 'rgba(160, 160, 160, 0.7)';
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
    }

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(lm.name, cx, cy - 14);
  }
}

function renderGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const step = CANVAS_SIZE / 5;
  for (let i = 1; i < 5; i++) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, CANVAS_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(CANVAS_SIZE, pos);
    ctx.stroke();
  }

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const coord = WORLD_MIN + i * (WORLD_RANGE / 5);
    const px = i * step;
    ctx.fillText(`${coord}`, px, CANVAS_SIZE - 4);
    ctx.fillText(`${coord}`, 20, px + 3);
  }
}

function renderBiomeLabels(ctx: CanvasRenderingContext2D): void {
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

  for (const b of BIOME_REGIONS) {
    const cx = worldToCanvas(b.cx);
    const cz = worldToCanvas(b.cz);
    ctx.fillText(b.name, cx, cz);
  }
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, z: number, yaw: number,
  pulse: number
): void {
  const cx = worldToCanvas(x);
  const cy = worldToCanvas(z);

  const coneLen = 20;
  const coneSpread = 0.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.sin(yaw - coneSpread) * coneLen,
    cy - Math.cos(yaw - coneSpread) * coneLen
  );
  ctx.lineTo(
    cx + Math.sin(yaw + coneSpread) * coneLen,
    cy - Math.cos(yaw + coneSpread) * coneLen
  );
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 160, 40, 0.15)';
  ctx.fill();

  const pulseRadius = 6 + Math.sin(pulse * 3) * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 140, 0, 0.3)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff8c00';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.fillText('You', cx, cy + 18);
}

function renderRemotePlayers(
  ctx: CanvasRenderingContext2D,
  players: Array<{ x: number; z: number; name?: string }>
): void {
  for (const p of players) {
    const cx = worldToCanvas(p.x);
    const cy = worldToCanvas(p.z);

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4da6ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (p.name) {
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(77, 166, 255, 0.8)';
      ctx.fillText(p.name, cx, cy + 12);
    }
  }
}

function renderCompass(ctx: CanvasRenderingContext2D): void {
  const cx = CANVAS_SIZE - 30;
  const cy = 30;
  const r = 18;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 200, 200, 0.9)';
  ctx.fillText('N', cx, cy - 7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '9px monospace';
  ctx.fillText('S', cx, cy + 8);
  ctx.textBaseline = 'alphabetic';
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
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    backdropFilter: 'blur(4px)',
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement('div');
  Object.assign(header.style, {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
    fontSize: '14px',
    marginBottom: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  header.textContent = 'Ironvale Outskirts — World Map';

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  Object.assign(canvas.style, {
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '90vw',
    maxHeight: '80vh',
    objectFit: 'contain',
  } satisfies Partial<CSSStyleDeclaration>);

  const hint = document.createElement('div');
  Object.assign(hint.style, {
    color: 'rgba(255, 255, 255, 0.35)',
    fontFamily: 'monospace',
    fontSize: '11px',
    marginTop: '10px',
    userSelect: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  hint.textContent = 'Click anywhere or press ESC / M to close';

  overlay.appendChild(header);
  overlay.appendChild(canvas);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext('2d')!;

  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = CANVAS_SIZE;
  terrainCanvas.height = CANVAS_SIZE;
  const terrainCtx = terrainCanvas.getContext('2d')!;
  renderTerrain(terrainCtx);
  renderWater(terrainCtx);
  renderGrid(terrainCtx);
  renderBiomeLabels(terrainCtx);
  renderRoad(terrainCtx);
  renderLandmarks(terrainCtx);
  renderCompass(terrainCtx);

  function redraw(): void {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(terrainCanvas, 0, 0);
    renderRemotePlayers(ctx, remotePlayers);
    renderPlayer(ctx, playerX, playerZ, playerYaw, pulseTime);
  }

  function animationLoop(): void {
    if (!visible) return;
    pulseTime += 0.016;
    redraw();
    animFrame = requestAnimationFrame(animationLoop);
  }

  function open(): void {
    if (visible) return;
    visible = true;
    overlay.style.display = 'flex';
    redraw();
    animFrame = requestAnimationFrame(animationLoop);
  }

  function close(): void {
    if (!visible) return;
    visible = false;
    overlay.style.display = 'none';
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === canvas) return;
    close();
  });

  canvas.addEventListener('click', close);

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
      if (visible) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }
  }

  window.addEventListener('keydown', onKeyDown, true);

  return {
    open,
    close,
    toggle(): void { if (visible) close(); else open(); },
    isOpen(): boolean { return visible; },

    updatePlayerPosition(x: number, z: number, yaw: number): void {
      playerX = x;
      playerZ = z;
      playerYaw = yaw;
    },

    updateRemotePlayers(players: Array<{ x: number; z: number; name?: string }>): void {
      remotePlayers = players;
    },

    dispose(): void {
      close();
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
    },
  };
}
