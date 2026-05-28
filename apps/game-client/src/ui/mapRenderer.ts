import { createNoise2D } from 'simplex-noise';
import { getHydrology, getMoistureAt, type RiverPath, type LakeBody } from './mapHydrology';

const WORLD_MIN = -250;
const WORLD_MAX = 250;
const WORLD_RANGE = WORLD_MAX - WORLD_MIN;

const _n1 = createNoise2D(() => 0.42);
const _n2 = createNoise2D(() => 0.73);
const _n3 = createNoise2D(() => 0.19);

const ROAD_POINTS = [
  { x: -220, z: -200 }, { x: -160, z: -140 }, { x: -100, z: -80 },
  { x: -40, z: -20 }, { x: 10, z: 30 }, { x: 60, z: 90 },
  { x: 120, z: 140 }, { x: 170, z: 180 }, { x: 220, z: 220 },
];

const LANDMARKS: Array<{ x: number; z: number; type: string; name: string }> = [
  { x: 30, z: 50, type: 'shrine', name: 'Dracor Memory Shrine' },
  { x: -40, z: -20, type: 'gate', name: 'Ruined Frontier Gate' },
  { x: 100, z: 120, type: 'bridge', name: 'Ashwood Crossing' },
];

function getWaterData(): { rivers: RiverPath[]; lakes: LakeBody[] } {
  const h = getHydrology();
  return { rivers: h.rivers, lakes: h.lakes };
}

const BIOME_REGIONS: Array<{
  name: string; cx: number; cz: number; radius: number;
}> = [
  { name: 'Dark Pine Frontier', cx: 0, cz: 0, radius: 220 },
  { name: 'Wolfpine Deep', cx: -160, cz: -140, radius: 100 },
  { name: 'Cliff Outcrops', cx: -180, cz: -120, radius: 60 },
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

function noise2d(x: number, z: number): number {
  return _n1(x, z) * 0.5 + 0.5;
}

function fbmNoise(x: number, z: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 5; i++) {
    v += (_n2(x * freq, z * freq) * 0.5 + 0.5) * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v / 0.96875;
}

function ridgedNoise(x: number, z: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(_n3(x * freq, z * freq));
    v += n * n * amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return v / 0.9375;
}

function seededRng(seed: number): () => number {
  let s = Math.abs(seed) | 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function w2c(v: number, size: number): number {
  return ((v - WORLD_MIN) / WORLD_RANGE) * size;
}

function distToPolyline(wx: number, wz: number, pts: Array<{ x: number; z: number }>): number {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, az = pts[i].z;
    const bx = pts[i + 1].x, bz = pts[i + 1].z;
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((wx - ax) * dx + (wz - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, pz = az + t * dz;
    const d = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
    if (d < minD) minD = d;
  }
  return minD;
}

function getWaterProximity(wx: number, wz: number): number {
  const { rivers, lakes } = getWaterData();
  let closest = Infinity;
  for (const b of lakes) {
    const cos = Math.cos(-b.rotation), sin = Math.sin(-b.rotation);
    const lx = (wx - b.cx) * cos - (wz - b.cz) * sin;
    const lz = (wx - b.cx) * sin + (wz - b.cz) * cos;
    const d = Math.sqrt((lx / b.rx) ** 2 + (lz / b.rz) ** 2);
    const dist = (d - 1) * Math.min(b.rx, b.rz);
    if (dist < closest) closest = dist;
  }
  for (const river of rivers) {
    const d = distToPolyline(wx, wz, river.points);
    const avgW = (river.widthStart + river.widthEnd) / 2;
    const dist = d - avgW;
    if (dist < closest) closest = dist;
  }
  return closest;
}

function isInWater(wx: number, wz: number): boolean {
  const { rivers, lakes } = getWaterData();
  for (const b of lakes) {
    const cos = Math.cos(-b.rotation), sin = Math.sin(-b.rotation);
    const lx = (wx - b.cx) * cos - (wz - b.cz) * sin;
    const lz = (wx - b.cx) * sin + (wz - b.cz) * cos;
    if ((lx / b.rx) ** 2 + (lz / b.rz) ** 2 <= 1) return true;
  }
  for (const river of rivers) {
    for (let i = 0; i < river.points.length - 1; i++) {
      const a = river.points[i], b = river.points[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      let t = lenSq > 0 ? ((wx - a.x) * dx + (wz - a.z) * dz) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx, pz = a.z + t * dz;
      const d = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
      const w = river.widthStart + (river.widthEnd - river.widthStart) * (i / (river.points.length - 1));
      if (d <= w * 0.5) return true;
    }
  }
  return false;
}

function distToRoad(wx: number, wz: number): number {
  let minDist = Infinity;
  for (let i = 0; i < ROAD_POINTS.length - 1; i++) {
    const ax = ROAD_POINTS[i].x, az = ROAD_POINTS[i].z;
    const bx = ROAD_POINTS[i + 1].x, bz = ROAD_POINTS[i + 1].z;
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((wx - ax) * dx + (wz - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, pz = az + t * dz;
    const d = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function getForestDensity(wx: number, wz: number): number {
  const distFromCenter = Math.sqrt(wx * wx + wz * wz);
  let baseDensity = Math.max(0, 1 - distFromCenter / 260);

  const n = fbmNoise(wx, wz);
  baseDensity *= 0.3 + n * 0.7;

  const wolfpineDx = wx + 160, wolfpineDz = wz + 140;
  const wolfpineDist = Math.sqrt(wolfpineDx * wolfpineDx + wolfpineDz * wolfpineDz);
  if (wolfpineDist < 100) {
    const boost = (1 - wolfpineDist / 100) * 0.4;
    baseDensity = Math.min(1, baseDensity + boost);
  }

  const roadDist = distToRoad(wx, wz);
  if (roadDist < 15) baseDensity *= roadDist / 15;

  const waterDist = getWaterProximity(wx, wz);
  if (waterDist < 8) baseDensity *= Math.max(0, waterDist / 8);

  if (distFromCenter < 30) baseDensity *= distFromCenter / 30;

  for (const lm of LANDMARKS) {
    const ld = Math.sqrt((wx - lm.x) ** 2 + (wz - lm.z) ** 2);
    if (ld < 20) baseDensity *= ld / 20;
  }

  return Math.max(0, Math.min(1, baseDensity));
}

function getRockiness(wx: number, wz: number, height: number, heightNorm: number): number {
  const cliffDx = wx + 180, cliffDz = wz + 120;
  const cliffDist = Math.sqrt(cliffDx * cliffDx + cliffDz * cliffDz);
  let rock = 0;
  if (cliffDist < 70) {
    const cliffNoise = ridgedNoise(wx * 0.03, wz * 0.03);
    rock = (1 - cliffDist / 70) * (0.5 + cliffNoise * 0.5);
  }

  const slope = Math.abs(
    sampleHeight(wx + 2, wz) - sampleHeight(wx - 2, wz)
  ) + Math.abs(
    sampleHeight(wx, wz + 2) - sampleHeight(wx, wz - 2)
  );
  if (slope > 1.2) {
    const slopeRock = Math.min(1, (slope - 1.2) / 2.5);
    rock = Math.max(rock, slopeRock * (0.6 + ridgedNoise(wx * 0.05, wz * 0.05) * 0.4));
  }

  if (heightNorm > 0.7) {
    const peakRock = (heightNorm - 0.7) * 2.5;
    rock = Math.max(rock, peakRock * (0.5 + noise2d(wx * 0.04, wz * 0.04) * 0.5));
  }

  return Math.min(1, rock);
}

function getHillshade(wx: number, wz: number): number {
  const d = 3;
  const hL = sampleHeight(wx - d, wz);
  const hR = sampleHeight(wx + d, wz);
  const hU = sampleHeight(wx, wz - d);
  const hD = sampleHeight(wx, wz + d);
  const nx = (hL - hR) / (2 * d);
  const nz = (hU - hD) / (2 * d);
  const lightX = -0.6, lightZ = -0.4;
  const lightLen = Math.sqrt(lightX * lightX + lightZ * lightZ + 1);
  const nLen = Math.sqrt(nx * nx + nz * nz + 1);
  const dot = (nx * lightX + nz * lightZ + 1) / (lightLen * nLen);
  return Math.max(0.3, Math.min(1.2, dot * 1.1 + 0.3));
}

export function renderTerrainLayer(ctx: CanvasRenderingContext2D, size: number): void {
  const step = 2;
  const cols = Math.ceil(size / step);
  const rows = cols;

  const heights: number[] = [];
  let hMin = Infinity, hMax = -Infinity;

  for (let r = 0; r < rows; r++) {
    const wz = WORLD_MIN + (r / rows) * WORLD_RANGE;
    for (let c = 0; c < cols; c++) {
      const wx = WORLD_MIN + (c / cols) * WORLD_RANGE;
      const h = sampleHeight(wx, wz);
      heights.push(h);
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }
  const hRange = hMax - hMin || 1;

  const imgData = ctx.createImageData(size, size);
  const px = imgData.data;

  for (let r = 0; r < rows; r++) {
    const wz = WORLD_MIN + (r / rows) * WORLD_RANGE;
    for (let c = 0; c < cols; c++) {
      const wx = WORLD_MIN + (c / cols) * WORLD_RANGE;
      const h = heights[r * cols + c];
      const hn = (h - hMin) / hRange;
      const shade = getHillshade(wx, wz);

      const inWater = isInWater(wx, wz);
      const waterProx = getWaterProximity(wx, wz);
      const forest = inWater ? 0 : getForestDensity(wx, wz);
      const rock = inWater ? 0 : getRockiness(wx, wz, h, hn);
      const roadDist = distToRoad(wx, wz);

      let red: number, grn: number, blu: number;

      if (inWater) {
        const waterDepth = fbmNoise(wx * 0.02, wz * 0.02);
        const waterRipple = noise2d(wx * 0.08, wz * 0.08);
        const depthMul = 0.75 + waterDepth * 0.5;
        red = 15 * depthMul + waterRipple * 8;
        grn = 35 * depthMul + waterRipple * 12 + hn * 8;
        blu = 55 * depthMul + waterRipple * 15 + hn * 10;

        const caustics = ridgedNoise(wx * 0.06, wz * 0.06);
        if (caustics > 0.5) {
          const sp = (caustics - 0.5) * 2;
          red += sp * 8;
          grn += sp * 12;
          blu += sp * 18;
        }
      } else {
        const soilVar = fbmNoise(wx * 0.015, wz * 0.015);
        const groundR = 50 + hn * 40 + soilVar * 20;
        const groundG = 42 + hn * 30 + soilVar * 12;
        const groundB = 26 + hn * 18 + soilVar * 6;

        const canopyVar = fbmNoise(wx * 0.025, wz * 0.025);
        const underVar = noise2d(wx * 0.06, wz * 0.06);
        const forestR = 18 + hn * 18 + canopyVar * 20;
        const forestG = 32 + hn * 32 + canopyVar * 25 + underVar * 10;
        const forestB = 14 + hn * 10 + canopyVar * 5;

        const rockVar = ridgedNoise(wx * 0.04, wz * 0.04);
        const lichVar = fbmNoise(wx * 0.07 + 50, wz * 0.07);
        const rockR = 70 + hn * 35 + rockVar * 25;
        const rockG = 68 + hn * 30 + rockVar * 20 + lichVar * 8;
        const rockB = 60 + hn * 28 + rockVar * 15;

        red = groundR;
        grn = groundG;
        blu = groundB;

        if (forest > 0.05) {
          const f = Math.min(forest * 1.3, 1);
          red = red * (1 - f) + forestR * f;
          grn = grn * (1 - f) + forestG * f;
          blu = blu * (1 - f) + forestB * f;
        }

        if (rock > 0.05) {
          red = red * (1 - rock) + rockR * rock;
          grn = grn * (1 - rock) + rockG * rock;
          blu = blu * (1 - rock) + rockB * rock;
        }

        if (waterProx < 15 && waterProx > 0) {
          const marshT = 1 - waterProx / 15;
          const marsh = marshT * marshT * 0.5;
          red = red * (1 - marsh) + 30 * marsh;
          grn = grn * (1 - marsh) + 45 * marsh;
          blu = blu * (1 - marsh) + 35 * marsh;
        }

        const moist = getMoistureAt(wx, wz);
        if (moist > 0.05) {
          const m = Math.min(moist * 0.6, 0.35);
          red = red * (1 - m) + 25 * m;
          grn = grn * (1 - m) + (grn + 15) * m;
          blu = blu * (1 - m) + 30 * m;
        }

        if (roadDist < 12) {
          const roadT = 1 - roadDist / 12;
          const roadMix = roadT * roadT * 0.6;
          const roadR = 80 + hn * 30;
          const roadG = 72 + hn * 25;
          const roadB = 55 + hn * 18;
          red = red * (1 - roadMix) + roadR * roadMix;
          grn = grn * (1 - roadMix) + roadG * roadMix;
          blu = blu * (1 - roadMix) + roadB * roadMix;
        }

        red *= shade;
        grn *= shade;
        blu *= shade;
      }

      const micro = _n1(wx * 0.3, wz * 0.3) * 4;
      red += micro;
      grn += micro * 0.8;
      blu += micro * 0.5;

      for (let py = r * step; py < Math.min((r + 1) * step, size); py++) {
        for (let pixX = c * step; pixX < Math.min((c + 1) * step, size); pixX++) {
          const idx = (py * size + pixX) * 4;
          px[idx] = Math.min(255, Math.max(0, red));
          px[idx + 1] = Math.min(255, Math.max(0, grn));
          px[idx + 2] = Math.min(255, Math.max(0, blu));
          px[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export function renderContourLines(ctx: CanvasRenderingContext2D, size: number): void {
  const step = size >= 600 ? 4 : 3;
  const interval = 1.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 0.5;

  for (let r = 0; r < size - step; r += step) {
    const wz0 = WORLD_MIN + (r / size) * WORLD_RANGE;
    for (let c = 0; c < size - step; c += step) {
      const wx0 = WORLD_MIN + (c / size) * WORLD_RANGE;
      const h00 = sampleHeight(wx0, wz0);
      const h10 = sampleHeight(wx0 + (step / size) * WORLD_RANGE, wz0);
      const h01 = sampleHeight(wx0, wz0 + (step / size) * WORLD_RANGE);

      const level = Math.floor(h00 / interval);
      if (Math.floor(h10 / interval) !== level || Math.floor(h01 / interval) !== level) {
        ctx.beginPath();
        ctx.moveTo(c, r);
        ctx.lineTo(c + step * 0.7, r + step * 0.3);
        ctx.stroke();
      }
    }
  }
}

export function renderParchmentOverlay(ctx: CanvasRenderingContext2D, size: number): void {
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

export function renderWaterOverlay(ctx: CanvasRenderingContext2D, size: number, showLabels: boolean): void {
  const { rivers, lakes } = getWaterData();
  const scale = size >= 600 ? 1 : 0.5;

  for (const body of lakes) {
    const cx = w2c(body.cx, size);
    const cz = w2c(body.cz, size);
    const rx = (body.rx / WORLD_RANGE) * size;
    const rz = (body.rz / WORLD_RANGE) * size;

    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(body.rotation);

    ctx.strokeStyle = 'rgba(50, 90, 110, 0.15)';
    ctx.lineWidth = 0.5 * scale;
    const waveGap = Math.max(3, 5 * scale);
    for (let y = -rz + waveGap; y < rz; y += waveGap) {
      const rowW = rx * Math.sqrt(Math.max(0, 1 - (y / rz) ** 2));
      if (rowW < 2) continue;
      ctx.beginPath();
      ctx.moveTo(-rowW * 0.8, y);
      ctx.quadraticCurveTo(0, y - 1.5 * scale, rowW * 0.8, y);
      ctx.stroke();
    }

    ctx.restore();

    if (showLabels && body.name) {
      ctx.font = `italic ${Math.round(10 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80, 150, 180, 0.4)';
      ctx.fillText(body.name, cx, cz + rz + 12 * scale);
    }
  }

  for (const river of rivers) {
    if (!showLabels || !river.name) continue;
    const midIdx = Math.floor(river.points.length / 2);
    const mid = river.points[midIdx];
    const prev = river.points[Math.max(0, midIdx - 1)];
    const next = river.points[Math.min(river.points.length - 1, midIdx + 1)];
    const angle = Math.atan2(
      w2c(next.z, size) - w2c(prev.z, size),
      w2c(next.x, size) - w2c(prev.x, size)
    );
    const mx = w2c(mid.x, size);
    const mz = w2c(mid.z, size);
    ctx.save();
    ctx.translate(mx, mz - 6 * scale);
    ctx.rotate(angle);
    ctx.font = `italic ${Math.round(8 * scale)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(70, 140, 170, 0.35)';
    ctx.fillText(river.name, 0, 0);
    ctx.restore();
  }
}

export function renderRoad(ctx: CanvasRenderingContext2D, size: number, showLabel: boolean): void {
  const pts = ROAD_POINTS.map(p => ({ x: w2c(p.x, size), y: w2c(p.z, size) }));

  ctx.strokeStyle = 'rgba(100, 90, 70, 0.25)';
  ctx.lineWidth = size >= 600 ? 5 : 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
    else ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(150, 135, 110, 0.35)';
  ctx.lineWidth = size >= 600 ? 1.5 : 0.8;
  ctx.setLineDash(size >= 600 ? [5, 4] : [2, 2]);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
    else ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  if (showLabel) {
    const mid = pts[Math.floor(pts.length / 2)];
    const angle = Math.atan2(pts[5].y - pts[3].y, pts[5].x - pts[3].x);
    ctx.save();
    ctx.translate(mid.x, mid.y - (size >= 600 ? 10 : 5));
    ctx.rotate(angle);
    ctx.font = `italic ${size >= 600 ? 11 : 6}px serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(170, 155, 130, 0.4)';
    ctx.fillText('Old Cobblestone Road', 0, 0);
    ctx.restore();
  }
}

export function renderTreeSymbols(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = seededRng(777);
  const count = size >= 600 ? 500 : 120;
  const baseSize = size >= 600 ? 3.5 : 1.8;

  for (let i = 0; i < count * 3; i++) {
    const wx = WORLD_MIN + rng() * WORLD_RANGE;
    const wz = WORLD_MIN + rng() * WORLD_RANGE;
    const density = getForestDensity(wx, wz);
    if (density < 0.15 || rng() > density * 1.2) continue;
    if (count <= 120 && rng() > 0.5) continue;

    const cx = w2c(wx, size);
    const cz = w2c(wz, size);
    const s = baseSize * (0.5 + rng() * 0.8) * (0.7 + density * 0.6);

    const brightness = 0.6 + rng() * 0.4;
    const r = Math.floor(18 * brightness + density * 10);
    const g = Math.floor(35 * brightness + density * 20);
    const b = Math.floor(14 * brightness);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.35 + density * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(cx, cz - s * 2.2);
    ctx.lineTo(cx - s * 0.8, cz - s * 0.3);
    ctx.lineTo(cx - s * 0.4, cz - s * 0.5);
    ctx.lineTo(cx - s * 1, cz + s * 0.5);
    ctx.lineTo(cx + s * 1, cz + s * 0.5);
    ctx.lineTo(cx + s * 0.4, cz - s * 0.5);
    ctx.lineTo(cx + s * 0.8, cz - s * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(40, 30, 20, ${0.15 + density * 0.1})`;
    ctx.fillRect(cx - s * 0.1, cz + s * 0.5, s * 0.2, s * 0.6);
  }
}

export function renderLandmarks(
  ctx: CanvasRenderingContext2D, size: number,
  showLabels: boolean, pulseTime: number
): void {
  const scale = size >= 600 ? 1 : 0.5;

  for (const lm of LANDMARKS) {
    const cx = w2c(lm.x, size);
    const cy = w2c(lm.z, size);

    if (lm.type === 'shrine') {
      const glowR = (14 + Math.sin(pulseTime * 2.5) * 5) * scale;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, 'rgba(255, 130, 20, 0.3)');
      glow.addColorStop(0.5, 'rgba(255, 90, 10, 0.1)');
      glow.addColorStop(1, 'rgba(255, 70, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      const s = 7 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.6, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.6, cy);
      ctx.closePath();
      ctx.fillStyle = '#c0611a';
      ctx.fill();
      ctx.strokeStyle = '#e8a050';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.3, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (lm.type === 'bridge') {
      const bw = 10 * scale;
      const bh = 5 * scale;
      ctx.strokeStyle = 'rgba(120, 105, 80, 0.6)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy + bh * 0.2, bw * 0.45, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, cy + bh * 0.2);
      ctx.lineTo(cx + bw / 2, cy + bh * 0.2);
      ctx.stroke();
    } else {
      const s = 5 * scale;
      ctx.strokeStyle = 'rgba(130, 120, 110, 0.5)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy + s);
      ctx.lineTo(cx - s, cy - s * 0.3);
      ctx.lineTo(cx - s * 0.3, cy - s);
      ctx.lineTo(cx + s * 0.3, cy - s);
      ctx.lineTo(cx + s, cy - s * 0.3);
      ctx.lineTo(cx + s, cy + s);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(80, 75, 65, 0.15)';
      ctx.fill();
    }

    if (showLabels) {
      ctx.font = `bold ${Math.round(10 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(210, 195, 165, 0.65)';
      ctx.fillText(lm.name, cx, cy - 14 * scale);
    }
  }
}

export function renderBiomeLabels(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.textAlign = 'center';
  for (const b of BIOME_REGIONS) {
    const cx = w2c(b.cx, size);
    const cz = w2c(b.cz, size);
    ctx.font = `italic ${size >= 600 ? 13 : 7}px serif`;
    ctx.fillStyle = 'rgba(180, 165, 140, 0.1)';
    ctx.fillText(b.name, cx, cz);
  }
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D, size: number,
  x: number, z: number, yaw: number, pulseTime: number
): void {
  const cx = w2c(x, size);
  const cy = w2c(z, size);
  const scale = size >= 600 ? 1 : 0.55;

  const coneLen = 20 * scale;
  const spread = 0.35;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coneLen);
  grad.addColorStop(0, 'rgba(255, 160, 40, 0.18)');
  grad.addColorStop(1, 'rgba(255, 160, 40, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(yaw - spread) * coneLen, cy - Math.cos(yaw - spread) * coneLen);
  ctx.lineTo(cx + Math.sin(yaw + spread) * coneLen, cy - Math.cos(yaw + spread) * coneLen);
  ctx.closePath();
  ctx.fill();

  const pr = (5 + Math.sin(pulseTime * 3) * 2) * scale;
  const pulseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr + 3 * scale);
  pulseGrad.addColorStop(0, 'rgba(255, 140, 20, 0.35)');
  pulseGrad.addColorStop(1, 'rgba(255, 140, 20, 0)');
  ctx.fillStyle = pulseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pr + 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  const aLen = 7 * scale;
  const aW = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + Math.sin(yaw) * aLen, cy - Math.cos(yaw) * aLen);
  ctx.lineTo(cx + Math.sin(yaw + 2.5) * aW, cy - Math.cos(yaw + 2.5) * aW);
  ctx.lineTo(cx + Math.sin(yaw - 2.5) * aW, cy - Math.cos(yaw - 2.5) * aW);
  ctx.closePath();
  ctx.fillStyle = '#f09020';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 150, 0.7)';
  ctx.lineWidth = 0.7 * scale;
  ctx.stroke();
}

export function renderRemotePlayers(
  ctx: CanvasRenderingContext2D, size: number,
  players: Array<{ x: number; z: number; name?: string }>, showNames: boolean
): void {
  const scale = size >= 600 ? 1 : 0.5;
  for (const p of players) {
    const cx = w2c(p.x, size);
    const cy = w2c(p.z, size);

    ctx.beginPath();
    ctx.arc(cx, cy, 3.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60, 130, 200, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 170, 240, 0.4)';
    ctx.lineWidth = 0.8 * scale;
    ctx.stroke();

    if (showNames && p.name) {
      ctx.font = `${Math.round(9 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100, 170, 240, 0.6)';
      ctx.fillText(p.name, cx, cy + 10 * scale);
    }
  }
}

export function renderOrnateFrame(ctx: CanvasRenderingContext2D, size: number): void {
  const inset = size >= 600 ? 5 : 2;
  const cornerLen = size >= 600 ? 28 : 12;

  ctx.strokeStyle = 'rgba(120, 100, 65, 0.25)';
  ctx.lineWidth = size >= 600 ? 1 : 0.5;
  ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

  ctx.strokeStyle = 'rgba(150, 125, 80, 0.4)';
  ctx.lineWidth = size >= 600 ? 1.5 : 0.8;
  const corners = [
    [inset, inset], [size - inset, inset],
    [inset, size - inset], [size - inset, size - inset],
  ];
  const dirs = [
    [[1, 0], [0, 1]], [[-1, 0], [0, 1]],
    [[1, 0], [0, -1]], [[-1, 0], [0, -1]],
  ];

  for (let i = 0; i < 4; i++) {
    const [x, y] = corners[i];
    const [d1, d2] = dirs[i];
    ctx.beginPath();
    ctx.moveTo(x + d1[0] * cornerLen, y + d1[1] * cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + d2[0] * cornerLen, y + d2[1] * cornerLen);
    ctx.stroke();
  }
}

export function renderCompass(ctx: CanvasRenderingContext2D, size: number): void {
  const scale = size >= 600 ? 1 : 0.45;
  const cx = size - 22 * scale;
  const cy = 22 * scale;
  const r = 13 * scale;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 13, 10, 0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 100, 65, 0.35)';
  ctx.lineWidth = 0.8 * scale;
  ctx.stroke();

  const nLen = r * 0.65;
  ctx.beginPath();
  ctx.moveTo(cx, cy - nLen);
  ctx.lineTo(cx - 2.5 * scale, cy + 1 * scale);
  ctx.lineTo(cx + 2.5 * scale, cy + 1 * scale);
  ctx.closePath();
  ctx.fillStyle = 'rgba(180, 60, 40, 0.65)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy + nLen);
  ctx.lineTo(cx - 2 * scale, cy);
  ctx.lineTo(cx + 2 * scale, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150, 140, 120, 0.25)';
  ctx.fill();

  ctx.font = `bold ${Math.round(7 * scale)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180, 165, 140, 0.6)';
  ctx.fillText('N', cx, cy - nLen - 5 * scale);
  ctx.textBaseline = 'alphabetic';
}

const TRAILS: Array<{ points: Array<{ x: number; z: number }>; name?: string }> = [
  { points: [{ x: -40, z: -20 }, { x: -20, z: -40 }, { x: 10, z: -70 }, { x: 40, z: -90 }, { x: 80, z: -95 }, { x: 120, z: -80 }] },
  { points: [{ x: 30, z: 50 }, { x: 50, z: 70 }, { x: 75, z: 95 }, { x: 100, z: 120 }], name: 'Shrine Path' },
  { points: [{ x: -40, z: -20 }, { x: -70, z: -50 }, { x: -110, z: -80 }, { x: -150, z: -110 }] },
  { points: [{ x: 60, z: 90 }, { x: 80, z: 70 }, { x: 110, z: 50 }, { x: 140, z: 30 }, { x: 160, z: 0 }] },
];

const CAMPS: Array<{ x: number; z: number; name: string }> = [
  { x: -130, z: -100, name: 'Wolf Den' },
  { x: 160, z: -30, name: 'Fisherman Camp' },
  { x: -50, z: 180, name: 'Hermit Hollow' },
  { x: 180, z: 150, name: 'Ember Outpost' },
];

export function renderTrails(ctx: CanvasRenderingContext2D, size: number, showLabels: boolean): void {
  const scale = size >= 600 ? 1 : 0.5;

  for (const trail of TRAILS) {
    const pts = trail.points.map(p => ({ x: w2c(p.x, size), y: w2c(p.z, size) }));
    ctx.strokeStyle = 'rgba(130, 115, 90, 0.2)';
    ctx.lineWidth = (size >= 600 ? 1.5 : 0.7);
    ctx.setLineDash(size >= 600 ? [3, 4] : [1.5, 2]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';

    if (showLabels && trail.name) {
      const mid = pts[Math.floor(pts.length / 2)];
      ctx.font = `italic ${Math.round(8 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160, 145, 120, 0.3)';
      ctx.fillText(trail.name, mid.x, mid.y - 5 * scale);
    }
  }
}

export function renderCamps(ctx: CanvasRenderingContext2D, size: number, showLabels: boolean): void {
  const scale = size >= 600 ? 1 : 0.5;

  for (const camp of CAMPS) {
    const cx = w2c(camp.x, size);
    const cy = w2c(camp.z, size);
    const s = 4 * scale;

    ctx.strokeStyle = 'rgba(160, 130, 80, 0.4)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.4);
    ctx.lineTo(cx - s, cy + s * 0.4);
    ctx.lineTo(cx + s, cy + s * 0.4);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.4);
    ctx.lineTo(cx, cy - s * 0.2);
    ctx.strokeStyle = 'rgba(200, 100, 30, 0.35)';
    ctx.lineWidth = 0.8 * scale;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 120, 30, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.2, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (showLabels) {
      ctx.font = `${Math.round(8 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(190, 170, 140, 0.45)';
      ctx.fillText(camp.name, cx, cy + s + 10 * scale);
    }
  }
}

export function renderRockScatter(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = seededRng(999);
  const count = size >= 600 ? 80 : 25;
  const scale = size >= 600 ? 1 : 0.5;

  for (let i = 0; i < count * 4; i++) {
    const wx = WORLD_MIN + rng() * WORLD_RANGE;
    const wz = WORLD_MIN + rng() * WORLD_RANGE;
    const h = sampleHeight(wx, wz);
    const hn = Math.max(0, Math.min(1, (h + 4) / 8));
    const rock = getRockiness(wx, wz, h, hn);
    if (rock < 0.3 || rng() > rock * 0.8) continue;
    if (isInWater(wx, wz)) continue;

    const cx = w2c(wx, size);
    const cz = w2c(wz, size);
    const s = (2 + rng() * 3) * scale;

    ctx.fillStyle = `rgba(100, 95, 85, ${0.15 + rock * 0.2})`;
    ctx.beginPath();
    const sides = 4 + Math.floor(rng() * 3);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2 + rng() * 0.5;
      const r = s * (0.6 + rng() * 0.4);
      const px = cx + Math.cos(angle) * r;
      const py = cz + Math.sin(angle) * r;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export function renderGrassTufts(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = seededRng(555);
  const count = size >= 600 ? 200 : 50;
  const scale = size >= 600 ? 1 : 0.45;

  for (let i = 0; i < count * 3; i++) {
    const wx = WORLD_MIN + rng() * WORLD_RANGE;
    const wz = WORLD_MIN + rng() * WORLD_RANGE;
    const forest = getForestDensity(wx, wz);
    const rock = getRockiness(wx, wz, 0, 0);
    if (forest > 0.3 || rock > 0.2 || isInWater(wx, wz)) continue;
    if (rng() > 0.4) continue;

    const cx = w2c(wx, size);
    const cz = w2c(wz, size);
    const blades = 3 + Math.floor(rng() * 4);

    for (let j = 0; j < blades; j++) {
      const bx = cx + (rng() - 0.5) * 3 * scale;
      const by = cz + (rng() - 0.5) * 2 * scale;
      const bh = (2 + rng() * 3) * scale;
      const lean = (rng() - 0.5) * 1.5 * scale;
      ctx.strokeStyle = `rgba(50, 75, 35, ${0.15 + rng() * 0.15})`;
      ctx.lineWidth = 0.5 * scale;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + lean, by - bh * 0.6, bx + lean * 1.3, by - bh);
      ctx.stroke();
    }
  }
}

export function renderMarshSymbols(ctx: CanvasRenderingContext2D, size: number): void {
  const rng = seededRng(333);
  const count = size >= 600 ? 60 : 15;
  const scale = size >= 600 ? 1 : 0.45;

  for (let i = 0; i < count * 4; i++) {
    const wx = WORLD_MIN + rng() * WORLD_RANGE;
    const wz = WORLD_MIN + rng() * WORLD_RANGE;
    if (isInWater(wx, wz)) continue;
    const waterDist = getWaterProximity(wx, wz);
    if (waterDist < 0 || waterDist > 12 || rng() > 0.3) continue;

    const cx = w2c(wx, size);
    const cz = w2c(wz, size);

    ctx.strokeStyle = `rgba(35, 60, 45, ${0.15 + (1 - waterDist / 12) * 0.15})`;
    ctx.lineWidth = 0.5 * scale;
    const lines = 3;
    for (let j = 0; j < lines; j++) {
      const lx = cx + (j - 1) * 2 * scale;
      ctx.beginPath();
      ctx.moveTo(lx, cz + 1 * scale);
      ctx.lineTo(lx, cz - 3 * scale);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 2.5 * scale, cz + 1 * scale);
    ctx.lineTo(cx + 2.5 * scale, cz + 1 * scale);
    ctx.stroke();
  }
}

export function renderEdgeFog(ctx: CanvasRenderingContext2D, size: number): void {
  const fogWidth = size * 0.12;

  const sides: Array<{ x: number; y: number; w: number; h: number; dir: 'l' | 'r' | 't' | 'b' }> = [
    { x: 0, y: 0, w: fogWidth, h: size, dir: 'l' },
    { x: size - fogWidth, y: 0, w: fogWidth, h: size, dir: 'r' },
    { x: 0, y: 0, w: size, h: fogWidth, dir: 't' },
    { x: 0, y: size - fogWidth, w: size, h: fogWidth, dir: 'b' },
  ];

  for (const s of sides) {
    let grad: CanvasGradient;
    if (s.dir === 'l') grad = ctx.createLinearGradient(0, 0, fogWidth, 0);
    else if (s.dir === 'r') grad = ctx.createLinearGradient(size, 0, size - fogWidth, 0);
    else if (s.dir === 't') grad = ctx.createLinearGradient(0, 0, 0, fogWidth);
    else grad = ctx.createLinearGradient(0, size, 0, size - fogWidth);
    grad.addColorStop(0, 'rgba(10, 8, 6, 0.7)');
    grad.addColorStop(0.5, 'rgba(10, 8, 6, 0.3)');
    grad.addColorStop(1, 'rgba(10, 8, 6, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
}

export { WORLD_MIN, WORLD_MAX, WORLD_RANGE, LANDMARKS, BIOME_REGIONS };
