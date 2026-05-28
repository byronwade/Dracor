/**
 * Water Systems — Phase 3
 *
 * Pre-computes river flow, lake flags, and distance-to-water on a coarse
 * 128×128 grid (one sample per chunk).  Query functions then interpolate
 * from the grid in O(1) time.
 *
 * Coordinate conventions
 * ──────────────────────
 *  World coords: [-4096, +4096] in X and Z.
 *  Grid coords:  [0, 127] (GRID_SIZE = 128).
 *  Conversion:   gridX = floor((worldX + HALF_WORLD) / CHUNK_SIZE)
 */

import { GRID_SIZE, CHUNK_SIZE, HALF_WORLD, SEA_LEVEL } from './config';
import { type WorldSeed } from './seed';
import { isLand } from './continental';

// ─── Public interface ────────────────────────────────────────────────────────

export type WaterTypeName = 'ocean' | 'river' | 'lake' | 'none';

export interface WaterSystem {
  /** True if the world coordinate is covered by ocean, river, or lake. */
  isWater(worldX: number, worldZ: number): boolean;

  /** Returns 'ocean', 'river', 'lake', or 'none'. */
  getWaterType(worldX: number, worldZ: number): WaterTypeName;

  /**
   * Approximate distance (world units) from (worldX, worldZ) to the nearest
   * water cell.  Returns 0 if the point itself is water.
   */
  getDistanceToWater(worldX: number, worldZ: number): number;

  /**
   * 0 = no river here, 1 = major river.
   * Values between 0 and 1 represent stream to river widths.
   */
  getRiverStrength(worldX: number, worldZ: number): number;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const N = GRID_SIZE;          // 128
const CELL_COUNT = N * N;     // 16 384

/** How many rivers to simulate. */
const RIVER_COUNT = 55;

/**
 * Minimum normalised flow (0–1 range after normalisation) above which a cell
 * is considered a river for query purposes.
 */
const RIVER_FLOW_THRESHOLD = 0.05;

/** Maximum BFS cells flooded for a single lake depression. */
const MAX_LAKE_CELLS = 150;

/** Elevation delta above the pit floor within which cells are flooded as lake. */
const LAKE_FILL_DELTA = 6.0;   // world units (metres)

// 8-neighbour offsets [dx, dz]
const NEIGHBOURS_8: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gridIdx(gx: number, gz: number): number {
  return gz * N + gx;
}

function worldToGrid(worldCoord: number): number {
  return Math.floor((worldCoord + HALF_WORLD) / CHUNK_SIZE);
}

function gridToWorldCenter(g: number): number {
  return -HALF_WORLD + g * CHUNK_SIZE + CHUNK_SIZE * 0.5;
}

function clampGrid(v: number): number {
  return Math.max(0, Math.min(N - 1, v));
}

/** Smooth bilinear interpolation over a Float32Array grid. */
function bilinearSample(grid: Float32Array, worldX: number, worldZ: number): number {
  // Compute the sub-cell fractional position
  const fx = (worldX + HALF_WORLD) / CHUNK_SIZE - 0.5;
  const fz = (worldZ + HALF_WORLD) / CHUNK_SIZE - 0.5;

  const x0 = clampGrid(Math.floor(fx));
  const z0 = clampGrid(Math.floor(fz));
  const x1 = clampGrid(x0 + 1);
  const z1 = clampGrid(z0 + 1);

  const tx = Math.max(0, Math.min(1, fx - x0));
  const tz = Math.max(0, Math.min(1, fz - z0));

  const v00 = grid[gridIdx(x0, z0)];
  const v10 = grid[gridIdx(x1, z0)];
  const v01 = grid[gridIdx(x0, z1)];
  const v11 = grid[gridIdx(x1, z1)];

  return (v00 * (1 - tx) + v10 * tx) * (1 - tz) +
         (v01 * (1 - tx) + v11 * tx) * tz;
}

// ─── createWaterSystem ───────────────────────────────────────────────────────

export function createWaterSystem(
  worldSeed: WorldSeed,
  getElevation: (wx: number, wz: number) => number,
  getContinental: (wx: number, wz: number) => number,
  getMoisture: (wx: number, wz: number) => number,
): WaterSystem {
  // ── 1. Pre-sample elevation and continental on the coarse grid ────────────
  const elevGrid = new Float32Array(CELL_COUNT);
  const contGrid = new Float32Array(CELL_COUNT);

  for (let gz = 0; gz < N; gz++) {
    const wz = gridToWorldCenter(gz);
    for (let gx = 0; gx < N; gx++) {
      const wx = gridToWorldCenter(gx);
      const idx = gridIdx(gx, gz);
      elevGrid[idx] = getElevation(wx, wz);
      contGrid[idx] = getContinental(wx, wz);
    }
  }

  // ── 2. Pit-fill pass (standard hydrology pre-process) ────────────────────
  //
  // On a coarse grid, isolated local minima (pits) would swallow every river.
  // We raise pit cells just above their lowest neighbour so that descent
  // continues toward the ocean in most cases.  True depressions (enclosed
  // basins on land) are then discovered during river tracing.
  //
  const pitFilled = new Float32Array(elevGrid);   // working copy

  for (let pass = 0; pass < 3; pass++) {
    for (let gz = 0; gz < N; gz++) {
      for (let gx = 0; gx < N; gx++) {
        const idx = gridIdx(gx, gz);
        const cont = contGrid[idx];

        // Only process land cells — ocean pits are fine
        if (!isLand(cont)) continue;

        const elev = pitFilled[idx];
        let minNeighbour = Infinity;

        for (const [dx, dz] of NEIGHBOURS_8) {
          const nx = gx + dx;
          const nz = gz + dz;
          if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;
          const nElev = pitFilled[gridIdx(nx, nz)];
          if (nElev < minNeighbour) minNeighbour = nElev;
        }

        if (minNeighbour !== Infinity && elev <= minNeighbour) {
          // This is a local minimum → lift it slightly so descent can proceed
          pitFilled[idx] = minNeighbour + 0.01;
        }
      }
    }
  }

  // ── 3. Find river source candidates ──────────────────────────────────────
  //
  // A valid source is a land cell with elevation above the 60th percentile.
  // We bias toward cells with higher moisture (wetter highlands feed rivers).
  // Sources are picked deterministically via the seeded RNG.

  const rng = worldSeed.createRNG('river');

  // Collect all land cells and sort by elevation descending
  const landCells: Array<{ gx: number; gz: number; score: number }> = [];

  for (let gz = 0; gz < N; gz++) {
    const wz = gridToWorldCenter(gz);
    for (let gx = 0; gx < N; gx++) {
      const idx = gridIdx(gx, gz);
      if (!isLand(contGrid[idx])) continue;

      const wx = gridToWorldCenter(gx);
      const elev = elevGrid[idx];
      const moist = getMoisture(wx, wz);

      // Score: high elevation + high moisture + small seeded jitter
      const jitter = rng.next() * 5;
      const score = elev * 0.8 + moist * 20 + jitter;
      landCells.push({ gx, gz, score });
    }
  }

  // Sort descending by score; pick top RIVER_COUNT candidates
  landCells.sort((a, b) => b.score - a.score);

  // Sub-sample to spread sources across the map rather than clustering at the
  // single highest mountain.  Take one candidate per 6×6 block of grid cells.
  const sourceBlockSize = 6;
  const sourceBlocks = new Set<number>();
  const sources: Array<{ gx: number; gz: number }> = [];

  for (const cell of landCells) {
    if (sources.length >= RIVER_COUNT) break;

    const blockKey = Math.floor(cell.gx / sourceBlockSize) * 1000 +
                     Math.floor(cell.gz / sourceBlockSize);
    if (sourceBlocks.has(blockKey)) continue;

    sourceBlocks.add(blockKey);
    sources.push({ gx: cell.gx, gz: cell.gz });
  }

  // ── 4. Trace rivers and accumulate flow ───────────────────────────────────
  const flowGrid = new Float32Array(CELL_COUNT);   // accumulated flow
  const lakeGrid = new Uint8Array(CELL_COUNT);     // 1 = lake cell

  // Each river contributes 1 unit of flow per cell it passes through.
  // When two rivers merge the flow adds up, making main channels visible.

  const pitSeeds: Array<{ gx: number; gz: number; floorElev: number }> = [];

  for (const src of sources) {
    traceRiver(src.gx, src.gz, pitFilled, elevGrid, contGrid, flowGrid, pitSeeds);
  }

  // ── 5. Detect lakes at pit locations ─────────────────────────────────────
  for (const pit of pitSeeds) {
    floodLake(pit.gx, pit.gz, pit.floorElev, elevGrid, contGrid, lakeGrid);
  }

  // ── 6. Normalise flow to [0, 1] ───────────────────────────────────────────
  let maxFlow = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (flowGrid[i] > maxFlow) maxFlow = flowGrid[i];
  }
  const flowNorm = new Float32Array(CELL_COUNT);
  if (maxFlow > 0) {
    const inv = 1 / maxFlow;
    for (let i = 0; i < CELL_COUNT; i++) {
      flowNorm[i] = flowGrid[i] * inv;
    }
  }

  // ── 7. Build distance-to-water grid via multi-source BFS ─────────────────
  const distGrid = buildDistanceGrid(contGrid, flowNorm, lakeGrid);

  // ──────────────────────────────────────────────────────────────────────────
  // Query functions
  // ──────────────────────────────────────────────────────────────────────────

  function isOcean(worldX: number, worldZ: number): boolean {
    return !isLand(getContinental(worldX, worldZ));
  }

  function isWater(worldX: number, worldZ: number): boolean {
    if (isOcean(worldX, worldZ)) return true;

    const gx = clampGrid(worldToGrid(worldX));
    const gz = clampGrid(worldToGrid(worldZ));

    if (lakeGrid[gridIdx(gx, gz)] === 1) return true;

    const strength = bilinearSample(flowNorm, worldX, worldZ);
    return strength >= RIVER_FLOW_THRESHOLD;
  }

  function getWaterType(worldX: number, worldZ: number): WaterTypeName {
    if (isOcean(worldX, worldZ)) return 'ocean';

    const gx = clampGrid(worldToGrid(worldX));
    const gz = clampGrid(worldToGrid(worldZ));

    if (lakeGrid[gridIdx(gx, gz)] === 1) return 'lake';

    const strength = bilinearSample(flowNorm, worldX, worldZ);
    if (strength >= RIVER_FLOW_THRESHOLD) return 'river';

    return 'none';
  }

  function getDistanceToWater(worldX: number, worldZ: number): number {
    if (isWater(worldX, worldZ)) return 0;
    return bilinearSample(distGrid, worldX, worldZ);
  }

  function getRiverStrength(worldX: number, worldZ: number): number {
    if (isOcean(worldX, worldZ)) return 0;
    return Math.max(0, Math.min(1, bilinearSample(flowNorm, worldX, worldZ)));
  }

  return { isWater, getWaterType, getDistanceToWater, getRiverStrength };
}

// ─── River tracing ───────────────────────────────────────────────────────────

/**
 * Steepest-descent river trace starting from (startGx, startGz).
 * Accumulates 1.0 flow per cell.
 * Terminates when reaching ocean, grid boundary, or a pit (no lower neighbour).
 * Pit coordinates are appended to `pitSeeds`.
 */
function traceRiver(
  startGx: number,
  startGz: number,
  pitFilled: Float32Array,
  elevGrid: Float32Array,
  contGrid: Float32Array,
  flowGrid: Float32Array,
  pitSeeds: Array<{ gx: number; gz: number; floorElev: number }>,
): void {
  // Each trace step: find the lowest 8-neighbour and move there.
  // We cap the trace at CELL_COUNT steps to prevent infinite loops (should
  // never happen on a properly pit-filled grid but belt-and-suspenders).

  const visited = new Set<number>();
  let gx = startGx;
  let gz = startGz;

  for (let step = 0; step < CELL_COUNT; step++) {
    const idx = gridIdx(gx, gz);

    // Reached ocean → done
    if (!isLand(contGrid[idx])) return;

    // Cycle guard
    if (visited.has(idx)) return;
    visited.add(idx);

    // Accumulate flow
    flowGrid[idx] += 1.0;

    // Find steepest-descent neighbour
    let bestElev = pitFilled[idx];
    let bestGx = -1;
    let bestGz = -1;

    for (const [dx, dz] of NEIGHBOURS_8) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;

      const nElev = pitFilled[gridIdx(nx, nz)];
      if (nElev < bestElev) {
        bestElev = nElev;
        bestGx = nx;
        bestGz = nz;
      }
    }

    if (bestGx === -1) {
      // No lower neighbour — this is a true depression (pit).
      // Use the original (unfilled) elevation grid as the pit floor.
      pitSeeds.push({ gx, gz, floorElev: elevGrid[idx] });
      return;
    }

    gx = bestGx;
    gz = bestGz;
  }
}

// ─── Lake flood-fill ─────────────────────────────────────────────────────────

/**
 * Flood-fill lake starting from (pitGx, pitGz).
 * Marks cells as lake if they are on land and within LAKE_FILL_DELTA metres
 * above the pit floor elevation.
 * Capped at MAX_LAKE_CELLS to prevent runaway fills on flat terrain.
 */
function floodLake(
  pitGx: number,
  pitGz: number,
  floorElev: number,
  elevGrid: Float32Array,
  contGrid: Float32Array,
  lakeGrid: Uint8Array,
): void {
  const queue: Array<[number, number]> = [[pitGx, pitGz]];
  const seen = new Set<number>();
  const waterLevel = floorElev + LAKE_FILL_DELTA;

  let count = 0;

  while (queue.length > 0 && count < MAX_LAKE_CELLS) {
    const [gx, gz] = queue.shift()!;
    const idx = gridIdx(gx, gz);

    if (seen.has(idx)) continue;
    seen.add(idx);

    const elev = elevGrid[idx];
    const cont = contGrid[idx];

    // Only flood land cells that are below the water level
    if (!isLand(cont)) continue;
    if (elev > waterLevel) continue;

    lakeGrid[idx] = 1;
    count++;

    // BFS neighbours
    for (const [dx, dz] of NEIGHBOURS_8) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;
      const nIdx = gridIdx(nx, nz);
      if (!seen.has(nIdx)) {
        queue.push([nx, nz]);
      }
    }
  }
}

// ─── Distance-to-water BFS ───────────────────────────────────────────────────

/**
 * Multi-source BFS from every water cell (ocean boundary, river cell, lake
 * cell).  Returns a Float32Array with approximate world-unit distances.
 *
 * Uses a Chamfer 3-4 approximation (cardinal hops cost 3, diagonal cost 4)
 * then scales to world units.  This avoids sqrt per cell while giving a
 * reasonable Euclidean approximation.
 */
function buildDistanceGrid(
  contGrid: Float32Array,
  flowNorm: Float32Array,
  lakeGrid: Uint8Array,
): Float32Array {
  const UNVISITED = 0x7fffffff;
  const dist = new Int32Array(CELL_COUNT).fill(UNVISITED);

  // Chamfer costs (integer arithmetic, scale by 1/3 × CHUNK_SIZE at the end)
  const CARD = 3;
  const DIAG = 4;

  const queue: Array<number> = [];   // flat index

  // Seed queue with all water cells at distance 0
  for (let gz = 0; gz < N; gz++) {
    for (let gx = 0; gx < N; gx++) {
      const idx = gridIdx(gx, gz);

      const isOceanCell = !isLand(contGrid[idx]);
      const isRiverCell = flowNorm[idx] >= RIVER_FLOW_THRESHOLD;
      const isLakeCell  = lakeGrid[idx] === 1;

      if (isOceanCell || isRiverCell || isLakeCell) {
        dist[idx] = 0;
        queue.push(idx);
      }
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const gx = idx % N;
    const gz = (idx - gx) / N;
    const curDist = dist[idx];

    for (const [dx, dz] of NEIGHBOURS_8) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nx >= N || nz < 0 || nz >= N) continue;

      const cost = (dx !== 0 && dz !== 0) ? DIAG : CARD;
      const nIdx = gridIdx(nx, nz);
      const newDist = curDist + cost;

      if (newDist < dist[nIdx]) {
        dist[nIdx] = newDist;
        queue.push(nIdx);
      }
    }
  }

  // Convert Chamfer distances to world units: each Chamfer unit = CHUNK_SIZE/3
  const scale = CHUNK_SIZE / 3;
  const result = new Float32Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) {
    result[i] = dist[i] === UNVISITED ? HALF_WORLD * 2 : dist[i] * scale;
  }
  return result;
}
