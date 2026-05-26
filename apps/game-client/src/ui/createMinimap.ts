/* ------------------------------------------------------------------ *
 *  createMinimap.ts — pure DOM/Canvas minimap overlay for the game    *
 *  No Babylon.js dependency. Uses Canvas2D only.                      *
 * ------------------------------------------------------------------ */

export interface Minimap {
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateRemotePlayers: (players: Array<{ x: number; z: number }>) => void;
  dispose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────

const CANVAS_SIZE = 180;
const WORLD_MIN = -250;
const WORLD_MAX = 250;
const WORLD_RANGE = WORLD_MAX - WORLD_MIN; // 500
const TERRAIN_SAMPLE_STEP = 3; // sample every 3 px for perf
const ZONE_NAME = "Ironvale Outskirts";

const ROAD_POINTS = [
  { x: -180, z: 180 },
  { x: -120, z: 130 },
  { x: -60, z: 80 },
  { x: -20, z: 30 },
  { x: 0, z: 0 },
  { x: 25, z: -40 },
  { x: 60, z: -90 },
  { x: 110, z: -140 },
  { x: 170, z: -180 },
];

const LANDMARKS: Array<{ x: number; z: number; type: string }> = [
  { x: 30, z: -60, type: "shrine" },
  { x: -100, z: 90, type: "gate" },
  { x: 50, z: -120, type: "bridge" },
];

// ── Height sampling (matches terrain generator) ────────────────────

function sampleHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  h += Math.sin(x * 0.07 + 3.1) * Math.cos(z * 0.06 + 2.1) * 0.08;
  h += Math.sin(x * 0.15 + 5.0) * Math.sin(z * 0.12 + 4.0) * 0.03;
  const dist = Math.sqrt(x * x + z * z);
  const flatten = Math.min(1.0, dist / 60.0);
  return h * 8.0 * flatten;
}

// ── Coordinate helpers ─────────────────────────────────────────────

/** Map a world-space coordinate to canvas pixel. */
function worldToCanvas(v: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * CANVAS_SIZE;
}

// ── Terrain pre-render ─────────────────────────────────────────────

function renderTerrainToCanvas(ctx: CanvasRenderingContext2D): void {
  // First pass: find height range for normalisation
  let hMin = Infinity;
  let hMax = -Infinity;
  const samples: number[] = [];
  const cols = Math.ceil(CANVAS_SIZE / TERRAIN_SAMPLE_STEP);
  const rows = cols;

  for (let row = 0; row < rows; row++) {
    const pz = row * TERRAIN_SAMPLE_STEP;
    const wz = WORLD_MIN + (pz / CANVAS_SIZE) * WORLD_RANGE;
    for (let col = 0; col < cols; col++) {
      const px = col * TERRAIN_SAMPLE_STEP;
      const wx = WORLD_MIN + (px / CANVAS_SIZE) * WORLD_RANGE;
      const h = sampleHeight(wx, wz);
      samples.push(h);
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }

  const hRange = hMax - hMin || 1;

  // Second pass: draw coloured rectangles
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    const py = row * TERRAIN_SAMPLE_STEP;
    for (let col = 0; col < cols; col++) {
      const px = col * TERRAIN_SAMPLE_STEP;
      const t = (samples[idx] - hMin) / hRange; // 0 = lowest, 1 = highest

      // Dark brown gradient: low = darker, high = lighter
      const r = Math.floor(30 + t * 60); // 30..90
      const g = Math.floor(20 + t * 45); // 20..65
      const b = Math.floor(10 + t * 20); // 10..30

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, TERRAIN_SAMPLE_STEP, TERRAIN_SAMPLE_STEP);
      idx++;
    }
  }
}

// ── Drawing helpers ────────────────────────────────────────────────

function drawRoad(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(160,160,160,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < ROAD_POINTS.length; i++) {
    const cx = worldToCanvas(ROAD_POINTS[i].x);
    const cy = worldToCanvas(ROAD_POINTS[i].z);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
}

function drawLandmarks(ctx: CanvasRenderingContext2D): void {
  for (const lm of LANDMARKS) {
    const cx = worldToCanvas(lm.x);
    const cy = worldToCanvas(lm.z);

    if (lm.type === "shrine") {
      // Orange diamond
      const s = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.fillStyle = "#e87f24";
      ctx.fill();
    } else {
      // Gray square for gate / bridge
      const s = 3;
      ctx.fillStyle = "rgba(180,180,180,0.8)";
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  yaw: number,
): void {
  const cx = worldToCanvas(x);
  const cy = worldToCanvas(z);
  const radius = 5;

  // Direction line (10px long from centre)
  const lineLen = 10;
  const dx = Math.sin(yaw) * lineLen;
  const dy = -Math.cos(yaw) * lineLen; // canvas Y is down, world Z forward
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + dx, cy + dy);
  ctx.strokeStyle = "#ffb347";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Orange dot
  ctx.beginPath();
  ctx.arc(cx, cy, radius / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ff8c00";
  ctx.fill();
}

function drawRemotePlayers(
  ctx: CanvasRenderingContext2D,
  players: Array<{ x: number; z: number }>,
): void {
  ctx.fillStyle = "#4da6ff";
  for (const p of players) {
    const cx = worldToCanvas(p.x);
    const cy = worldToCanvas(p.z);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNorthIndicator(ctx: CanvasRenderingContext2D): void {
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("N", CANVAS_SIZE / 2, 11);
}

// ── Public API ─────────────────────────────────────────────────────

export function createMinimap(): Minimap {
  // ── Container ──────────────────────────────────────────────────
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "absolute",
    bottom: "16px",
    right: "16px",
    pointerEvents: "none",
    zIndex: "10",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } satisfies Partial<CSSStyleDeclaration>);

  // ── Visible canvas ────────────────────────────────────────────
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

  // ── Zone name label ───────────────────────────────────────────
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

  // ── Offscreen terrain layer (rendered once) ───────────────────
  const terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = CANVAS_SIZE;
  terrainCanvas.height = CANVAS_SIZE;
  const terrainCtx = terrainCanvas.getContext("2d")!;
  renderTerrainToCanvas(terrainCtx);

  // Also bake the static road + landmarks into the terrain layer
  drawRoad(terrainCtx);
  drawLandmarks(terrainCtx);
  drawNorthIndicator(terrainCtx);

  // ── Main drawing context ──────────────────────────────────────
  const ctx = canvas.getContext("2d")!;

  // State
  let lastPlayerX = 0;
  let lastPlayerZ = 0;
  let lastYaw = 0;
  let remotes: Array<{ x: number; z: number }> = [];

  function redraw(): void {
    // Clear and stamp the pre-rendered static layer
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(terrainCanvas, 0, 0);

    // Dynamic: remote players, then local player on top
    drawRemotePlayers(ctx, remotes);
    drawPlayer(ctx, lastPlayerX, lastPlayerZ, lastYaw);
  }

  // Initial draw (no player yet, but terrain is visible immediately)
  redraw();

  // ── Public interface ──────────────────────────────────────────
  return {
    updatePlayerPosition(x: number, z: number, yaw: number): void {
      lastPlayerX = x;
      lastPlayerZ = z;
      lastYaw = yaw;
      redraw();
    },

    updateRemotePlayers(players: Array<{ x: number; z: number }>): void {
      remotes = players;
      // No standalone redraw — next updatePlayerPosition will pick it up.
      // If you need immediate display, call redraw() here too.
    },

    dispose(): void {
      container.remove();
    },
  };
}
