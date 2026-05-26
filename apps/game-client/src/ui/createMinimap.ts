export interface Minimap {
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number }>) => void;
  onClick: (handler: () => void) => void;
  dispose: () => void;
}

const CANVAS_SIZE = 180;
const WORLD_MIN = -250;
const WORLD_MAX = 250;
const WORLD_RANGE = WORLD_MAX - WORLD_MIN;
const SAMPLE_STEP = 2;
const ZONE_NAME = "Ironvale Outskirts";

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
  { x: 30, z: 50, type: "shrine", name: "Shrine" },
  { x: -40, z: -20, type: "gate", name: "Gate" },
  { x: 100, z: 120, type: "bridge", name: "Bridge" },
];

const WATER: Array<{ x: number; z: number; w: number; d: number }> = [
  { x: 90, z: 110, w: 5, d: 80 },
];

const BIOME_REGIONS: Array<{
  cx: number; cz: number; radius: number;
  color: [number, number, number];
}> = [
  { cx: 0, cz: 0, radius: 220, color: [0.18, 0.14, 0.1] },
  { cx: -160, cz: -140, radius: 100, color: [0.12, 0.10, 0.07] },
  { cx: -180, cz: -120, radius: 60, color: [0.22, 0.18, 0.15] },
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

function w2c(v: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * CANVAS_SIZE;
}

function getBiomeTint(wx: number, wz: number): [number, number, number] {
  const base: [number, number, number] = [0.18, 0.14, 0.1];
  for (let i = 1; i < BIOME_REGIONS.length; i++) {
    const b = BIOME_REGIONS[i];
    const dx = wx - b.cx;
    const dz = wz - b.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < b.radius * 0.6) return b.color;
    if (dist < b.radius) {
      const t = (dist - b.radius * 0.6) / (b.radius * 0.4);
      return [
        base[0] + (b.color[0] - base[0]) * (1 - t),
        base[1] + (b.color[1] - base[1]) * (1 - t),
        base[2] + (b.color[2] - base[2]) * (1 - t),
      ];
    }
  }
  return base;
}

function renderTerrain(ctx: CanvasRenderingContext2D): void {
  const cols = Math.ceil(CANVAS_SIZE / SAMPLE_STEP);
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
    const py = row * SAMPLE_STEP;
    const wz = WORLD_MIN + (row / rows) * WORLD_RANGE;
    for (let col = 0; col < cols; col++) {
      const px = col * SAMPLE_STEP;
      const wx = WORLD_MIN + (col / cols) * WORLD_RANGE;
      const t = (samples[idx] - hMin) / hRange;
      const tint = getBiomeTint(wx, wz);

      const base = 40 + t * 80;
      const r = Math.min(255, Math.max(0, Math.floor(base * (tint[0] / 0.18))));
      const g = Math.min(255, Math.max(0, Math.floor(base * (tint[1] / 0.14))));
      const b = Math.min(255, Math.max(0, Math.floor(base * (tint[2] / 0.1))));

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, SAMPLE_STEP, SAMPLE_STEP);
      idx++;
    }
  }
}

function renderWater(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(40, 80, 140, 0.5)";
  for (const w of WATER) {
    const cx = w2c(w.x);
    const cz = w2c(w.z);
    const cw = (w.w / WORLD_RANGE) * CANVAS_SIZE;
    const cd = (w.d / WORLD_RANGE) * CANVAS_SIZE;
    ctx.fillRect(cx - cw / 2, cz - cd / 2, Math.max(1, cw), cd);
  }
}

function renderRoad(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(170, 160, 140, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i < ROAD_POINTS.length; i++) {
    const cx = w2c(ROAD_POINTS[i].x);
    const cy = w2c(ROAD_POINTS[i].z);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderLandmarks(ctx: CanvasRenderingContext2D): void {
  for (const lm of LANDMARKS) {
    const cx = w2c(lm.x);
    const cy = w2c(lm.z);

    if (lm.type === "shrine") {
      const s = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fillStyle = "#e87f24";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, s + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 127, 36, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (lm.type === "bridge") {
      ctx.fillStyle = "rgba(140, 120, 100, 0.8)";
      ctx.fillRect(cx - 3, cy - 2, 6, 4);
    } else {
      const s = 3;
      ctx.fillStyle = "rgba(180, 180, 180, 0.7)";
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }

    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(lm.name, cx, cy - 7);
  }
}

function renderGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
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
}

function renderNorth(ctx: CanvasRenderingContext2D): void {
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 200, 200, 0.7)";
  ctx.fillText("N", CANVAS_SIZE / 2, 10);
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, z: number, yaw: number
): void {
  const cx = w2c(x);
  const cy = w2c(z);

  const coneLen = 10;
  const spread = 0.35;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(yaw - spread) * coneLen, cy - Math.cos(yaw - spread) * coneLen);
  ctx.lineTo(cx + Math.sin(yaw + spread) * coneLen, cy - Math.cos(yaw + spread) * coneLen);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 160, 40, 0.15)";
  ctx.fill();

  const lineLen = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(yaw) * lineLen, cy - Math.cos(yaw) * lineLen);
  ctx.strokeStyle = "#ffb347";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ff8c00";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function renderRemotePlayers(
  ctx: CanvasRenderingContext2D,
  players: Array<{ x: number; z: number }>
): void {
  ctx.fillStyle = "#4da6ff";
  for (const p of players) {
    const cx = w2c(p.x);
    const cy = w2c(p.z);
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createMinimap(): Minimap {
  const container = document.createElement("div");
  container.id = "minimap-container";
  Object.assign(container.style, {
    position: "absolute",
    bottom: "16px",
    right: "16px",
    pointerEvents: "auto",
    cursor: "pointer",
    zIndex: "10",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } satisfies Partial<CSSStyleDeclaration>);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  Object.assign(canvas.style, {
    width: `${CANVAS_SIZE}px`,
    height: `${CANVAS_SIZE}px`,
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.7)",
  } satisfies Partial<CSSStyleDeclaration>);

  const label = document.createElement("div");
  Object.assign(label.style, {
    color: "rgba(255,255,255,0.55)",
    fontSize: "10px",
    fontFamily: "monospace",
    marginTop: "4px",
    textAlign: "center",
    userSelect: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  label.textContent = ZONE_NAME;

  container.appendChild(canvas);
  container.appendChild(label);
  document.body.appendChild(container);

  const terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = CANVAS_SIZE;
  terrainCanvas.height = CANVAS_SIZE;
  const terrainCtx = terrainCanvas.getContext("2d")!;
  renderTerrain(terrainCtx);
  renderWater(terrainCtx);
  renderGrid(terrainCtx);
  renderRoad(terrainCtx);
  renderLandmarks(terrainCtx);
  renderNorth(terrainCtx);

  const ctx = canvas.getContext("2d")!;

  let lastX = 0;
  let lastZ = 0;
  let lastYaw = 0;
  let remotes: Array<{ x: number; z: number }> = [];

  function redraw(): void {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(terrainCanvas, 0, 0);
    renderRemotePlayers(ctx, remotes);
    renderPlayer(ctx, lastX, lastZ, lastYaw);
  }

  redraw();

  let clickHandler: (() => void) | null = null;
  container.addEventListener("click", () => { if (clickHandler) clickHandler(); });

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
