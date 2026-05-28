const GRID = 150;
const WORLD_MIN = -250;
const WORLD_RANGE = 500;
const CELL_SIZE = WORLD_RANGE / GRID;
const RAIN_PER_CELL = 1.0;
const RIVER_THRESHOLD = 12;
const LAKE_MIN_CELLS = 3;

function sampleHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  h += Math.sin(x * 0.07 + 3.1) * Math.cos(z * 0.06 + 2.1) * 0.08;
  h += Math.sin(x * 0.15 + 5.0) * Math.sin(z * 0.12 + 4.0) * 0.03;
  const dist = Math.sqrt(x * x + z * z);
  const flatten = Math.min(1.0, dist / 60.0);
  return h * 8.0 * flatten;
}

function idx(r: number, c: number): number { return r * GRID + c; }
function cellToWorld(r: number, c: number): { x: number; z: number } {
  return { x: WORLD_MIN + (c + 0.5) * CELL_SIZE, z: WORLD_MIN + (r + 0.5) * CELL_SIZE };
}

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export interface RiverPath {
  points: Array<{ x: number; z: number }>;
  widthStart: number;
  widthEnd: number;
  flow: number;
  name?: string;
}

export interface LakeBody {
  cx: number; cz: number;
  rx: number; rz: number;
  rotation: number;
  depth: number;
  cells: number;
  name?: string;
}

export interface HydrologyResult {
  rivers: RiverPath[];
  lakes: LakeBody[];
  moisture: Float32Array;
  flow: Float32Array;
}

const RIVER_NAMES = ['Ironflow', 'Ashrun Creek', 'Wolfpine Brook', 'Ember Creek', 'Thornwater', 'Mistgully'];
const LAKE_NAMES = ['Ashenmere', 'Stillwater Hollow', 'Gloompool', 'Deepmirror Tarn'];

export function simulateHydrology(): HydrologyResult {
  const height = new Float32Array(GRID * GRID);
  const flow = new Float32Array(GRID * GRID);
  const moisture = new Float32Array(GRID * GRID);
  const downhill = new Int32Array(GRID * GRID);
  const isLake = new Uint8Array(GRID * GRID);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const w = cellToWorld(r, c);
      height[idx(r, c)] = sampleHeight(w.x, w.z);
    }
  }

  const sorted: number[] = [];
  for (let i = 0; i < GRID * GRID; i++) sorted.push(i);
  sorted.sort((a, b) => height[b] - height[a]);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      let lowestH = height[idx(r, c)];
      let lowestIdx = -1;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) {
          lowestIdx = -2;
          lowestH = -Infinity;
          break;
        }
        const ni = idx(nr, nc);
        if (height[ni] < lowestH) {
          lowestH = height[ni];
          lowestIdx = ni;
        }
      }
      downhill[idx(r, c)] = lowestIdx;
    }
  }

  for (let i = 0; i < GRID * GRID; i++) flow[i] = RAIN_PER_CELL;
  for (const i of sorted) {
    const dh = downhill[i];
    if (dh >= 0) {
      flow[dh] += flow[i];
    } else if (dh === -1) {
      isLake[i] = 1;
    }
  }

  fillDepressions(height, downhill, flow, isLake);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const i = idx(r, c);
      let m = 0;
      const searchR = 8;
      for (let dr = -searchR; dr <= searchR; dr++) {
        for (let dc = -searchR; dc <= searchR; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
          const ni = idx(nr, nc);
          const dist = Math.sqrt(dr * dr + dc * dc);
          if (dist > searchR) continue;
          const weight = 1 - dist / searchR;
          if (flow[ni] > RIVER_THRESHOLD) m += weight * 0.15;
          if (isLake[ni]) m += weight * 0.2;
        }
      }
      moisture[i] = Math.min(1, m);
    }
  }

  const rivers = extractRivers(height, flow, downhill);
  const lakes = extractLakes(height, isLake);

  return { rivers, lakes, moisture, flow };
}

function fillDepressions(
  height: Float32Array, downhill: Int32Array,
  flow: Float32Array, isLake: Uint8Array
): void {
  for (let i = 0; i < GRID * GRID; i++) {
    if (downhill[i] !== -1) continue;
    const r = Math.floor(i / GRID), c = i % GRID;
    if (r === 0 || r === GRID - 1 || c === 0 || c === GRID - 1) continue;

    let bestNeighborIdx = -1;
    let bestNeighborH = Infinity;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
      const ni = idx(nr, nc);
      if (height[ni] < bestNeighborH && height[ni] >= height[i]) {
        bestNeighborH = height[ni];
        bestNeighborIdx = ni;
      }
    }

    if (bestNeighborIdx >= 0) {
      downhill[i] = bestNeighborIdx;
      if (flow[i] > RIVER_THRESHOLD * 0.5) {
        isLake[i] = 1;
        flow[bestNeighborIdx] += flow[i];
      }
    }
  }
}

function extractRivers(
  height: Float32Array, flow: Float32Array, downhill: Int32Array
): RiverPath[] {
  const visited = new Uint8Array(GRID * GRID);
  const rivers: RiverPath[] = [];
  let nameIdx = 0;

  const sources: Array<{ idx: number; flow: number }> = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (flow[i] >= RIVER_THRESHOLD) sources.push({ idx: i, flow: flow[i] });
  }
  sources.sort((a, b) => b.flow - a.flow);

  for (const src of sources) {
    let ci = src.idx;
    if (visited[ci]) continue;

    let startI = ci;
    let current = ci;
    while (true) {
      const r = Math.floor(current / GRID), c = current % GRID;
      let bestUpstream = -1;
      let bestFlow = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const ni = idx(nr, nc);
        if (downhill[ni] === current && flow[ni] > bestFlow && flow[ni] >= RIVER_THRESHOLD * 0.5) {
          bestFlow = flow[ni];
          bestUpstream = ni;
        }
      }
      if (bestUpstream >= 0 && !visited[bestUpstream]) {
        current = bestUpstream;
        startI = bestUpstream;
      } else break;
    }

    const points: Array<{ x: number; z: number }> = [];
    let traceI = startI;
    let steps = 0;
    const maxSteps = GRID * 2;
    let maxFlow = 0;

    while (traceI >= 0 && !visited[traceI] && steps < maxSteps) {
      visited[traceI] = 1;
      const r = Math.floor(traceI / GRID), c = traceI % GRID;
      const w = cellToWorld(r, c);
      points.push(w);
      if (flow[traceI] > maxFlow) maxFlow = flow[traceI];
      const next = downhill[traceI];
      if (next < 0 || next === traceI) break;
      traceI = next;
      steps++;
    }

    if (points.length >= 4 && maxFlow >= RIVER_THRESHOLD) {
      const startFlow = flow[startI];
      const endFlow = maxFlow;
      rivers.push({
        points,
        widthStart: Math.max(1, Math.sqrt(startFlow) * 0.4),
        widthEnd: Math.max(1.5, Math.sqrt(endFlow) * 0.5),
        flow: maxFlow,
        name: maxFlow > RIVER_THRESHOLD * 4 && nameIdx < RIVER_NAMES.length
          ? RIVER_NAMES[nameIdx++] : undefined,
      });
    }
  }

  return rivers;
}

function extractLakes(height: Float32Array, isLake: Uint8Array): LakeBody[] {
  const visited = new Uint8Array(GRID * GRID);
  const lakes: LakeBody[] = [];
  let nameIdx = 0;

  for (let i = 0; i < GRID * GRID; i++) {
    if (!isLake[i] || visited[i]) continue;

    const cells: number[] = [];
    const queue = [i];
    visited[i] = 1;

    while (queue.length > 0) {
      const ci = queue.pop()!;
      cells.push(ci);
      const r = Math.floor(ci / GRID), c = ci % GRID;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const ni = idx(nr, nc);
        if (!visited[ni] && isLake[ni]) {
          visited[ni] = 1;
          queue.push(ni);
        }
      }
    }

    if (cells.length < LAKE_MIN_CELLS) continue;

    let sumX = 0, sumZ = 0;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const ci of cells) {
      const r = Math.floor(ci / GRID), c = ci % GRID;
      const w = cellToWorld(r, c);
      sumX += w.x; sumZ += w.z;
      if (w.x < minX) minX = w.x;
      if (w.x > maxX) maxX = w.x;
      if (w.z < minZ) minZ = w.z;
      if (w.z > maxZ) maxZ = w.z;
    }

    const cx = sumX / cells.length;
    const cz = sumZ / cells.length;
    const rx = Math.max(5, (maxX - minX) / 2 + CELL_SIZE);
    const rz = Math.max(4, (maxZ - minZ) / 2 + CELL_SIZE);

    lakes.push({
      cx, cz, rx, rz,
      rotation: Math.atan2(maxZ - minZ, maxX - minX) * 0.2,
      depth: 0.5 + cells.length * 0.05,
      cells: cells.length,
      name: cells.length >= 5 && nameIdx < LAKE_NAMES.length
        ? LAKE_NAMES[nameIdx++] : undefined,
    });
  }

  lakes.sort((a, b) => b.cells - a.cells);
  return lakes;
}

let cachedResult: HydrologyResult | null = null;

export function getHydrology(): HydrologyResult {
  if (!cachedResult) cachedResult = simulateHydrology();
  return cachedResult;
}

export function getMoistureAt(wx: number, wz: number): number {
  const hydro = getHydrology();
  const c = Math.floor(((wx - WORLD_MIN) / WORLD_RANGE) * GRID);
  const r = Math.floor(((wz - WORLD_MIN) / WORLD_RANGE) * GRID);
  if (r < 0 || r >= GRID || c < 0 || c >= GRID) return 0;
  return hydro.moisture[r * GRID + c];
}

export function getFlowAt(wx: number, wz: number): number {
  const hydro = getHydrology();
  const c = Math.floor(((wx - WORLD_MIN) / WORLD_RANGE) * GRID);
  const r = Math.floor(((wz - WORLD_MIN) / WORLD_RANGE) * GRID);
  if (r < 0 || r >= GRID || c < 0 || c >= GRID) return 0;
  return hydro.flow[r * GRID + c];
}
