import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';

export interface PlacementConfig {
  count: number;
  density: number;
  minScale: number;
  maxScale: number;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
  area: { centerX: number; centerZ: number; radius: number };
}

export interface ExclusionData {
  roadSegments: Array<{ ax: number; az: number; bx: number; bz: number; width: number }>;
  waterBodies: Array<{ x: number; z: number; radiusX: number; radiusZ: number }>;
  landmarks: Array<{ x: number; z: number; radius: number }>;
  spawns: Array<{ x: number; z: number; radius: number }>;
}

function distanceToSegment(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);

  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projZ = az + t * dz;
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

function computeSlopeAndNormal(
  x: number, z: number,
  getHeightAt: (x: number, z: number) => number
): { slopeDeg: number; normalX: number; normalY: number; normalZ: number } {
  const step = 1.0;
  const hC = getHeightAt(x, z);
  const hR = getHeightAt(x + step, z);
  const hF = getHeightAt(x, z + step);

  const edgeAx = step;
  const edgeAy = hR - hC;
  const edgeAz = 0;
  const edgeBx = 0;
  const edgeBy = hF - hC;
  const edgeBz = step;

  let nx = edgeAy * edgeBz - edgeAz * edgeBy;
  let ny = edgeAz * edgeBx - edgeAx * edgeBz;
  let nz = edgeAx * edgeBy - edgeAy * edgeBx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 0) { nx /= len; ny /= len; nz /= len; }
  else { nx = 0; ny = 1; nz = 0; }

  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }

  const slopeDeg = Math.acos(Math.min(1, Math.abs(ny))) * (180 / Math.PI);

  return { slopeDeg, normalX: nx, normalY: ny, normalZ: nz };
}

function isExcluded(
  x: number, z: number,
  config: PlacementConfig,
  exclusions: ExclusionData
): boolean {
  for (const seg of exclusions.roadSegments) {
    const dist = distanceToSegment(x, z, seg.ax, seg.az, seg.bx, seg.bz);
    if (dist < config.exclusionRadii.road + seg.width * 0.5) return true;
  }

  for (const w of exclusions.waterBodies) {
    const dx = (x - w.x) / w.radiusX;
    const dz = (z - w.z) / w.radiusZ;
    if (dx * dx + dz * dz < 1 + config.exclusionRadii.water * 0.1) return true;
  }

  for (const lm of exclusions.landmarks) {
    const dist = Math.sqrt((x - lm.x) ** 2 + (z - lm.z) ** 2);
    if (dist < lm.radius + config.exclusionRadii.landmark) return true;
  }

  for (const sp of exclusions.spawns) {
    const dist = Math.sqrt((x - sp.x) ** 2 + (z - sp.z) ** 2);
    if (dist < sp.radius + config.exclusionRadii.spawn) return true;
  }

  return false;
}

export function generatePlacements(
  config: PlacementConfig,
  exclusions: ExclusionData,
  getHeightAt: (x: number, z: number) => number,
  qualityDensity: number
): Float32Array {
  const targetCount = Math.max(1, Math.floor(config.count * qualityDensity));
  const matrices: number[] = [];

  const tmpPos = new Vector3();
  const tmpRot = new Quaternion();
  const tmpScale = new Vector3();
  const tmpMat = new Matrix();
  const tmpArr = new Array(16);

  const area = config.area;
  const cellSize = config.density > 0 ? 1 / Math.sqrt(config.density) : 20;
  const gridMinX = area.centerX - area.radius;
  const gridMaxX = area.centerX + area.radius;
  const gridMinZ = area.centerZ - area.radius;
  const gridMaxZ = area.centerZ + area.radius;

  const candidates: Array<{ x: number; z: number }> = [];

  for (let gx = gridMinX; gx < gridMaxX; gx += cellSize) {
    for (let gz = gridMinZ; gz < gridMaxZ; gz += cellSize) {
      const x = gx + Math.random() * cellSize;
      const z = gz + Math.random() * cellSize;

      const dx = x - area.centerX;
      const dz = z - area.centerZ;
      if (dx * dx + dz * dz > area.radius * area.radius) continue;

      candidates.push({ x, z });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let placed = 0;
  for (const cand of candidates) {
    if (placed >= targetCount) break;

    if (isExcluded(cand.x, cand.z, config, exclusions)) continue;

    const { slopeDeg, normalX, normalY, normalZ } = computeSlopeAndNormal(
      cand.x, cand.z, getHeightAt
    );

    if (slopeDeg > config.maxSlope) continue;

    const y = getHeightAt(cand.x, cand.z);
    const scale = config.minScale + Math.random() * (config.maxScale - config.minScale);
    const rotY = Math.random() * Math.PI * 2;

    tmpPos.set(cand.x, y, cand.z);

    if (config.alignToSlope && normalY < 0.99) {
      const up = Vector3.Up();
      const normal = new Vector3(normalX, normalY, normalZ);
      const axis = Vector3.Cross(up, normal);
      const angle = Math.acos(Math.min(1, Vector3.Dot(up, normal)));
      Quaternion.RotationAxisToRef(axis.normalize(), angle, tmpRot);
      const yawQuat = Quaternion.RotationAxis(Vector3.Up(), rotY);
      tmpRot.multiplyInPlace(yawQuat);
    } else {
      Quaternion.FromEulerAnglesToRef(0, rotY, 0, tmpRot);
    }

    tmpScale.set(scale, scale, scale);
    Matrix.ComposeToRef(tmpScale, tmpRot, tmpPos, tmpMat);
    tmpMat.copyToArray(tmpArr, 0);
    for (let j = 0; j < 16; j++) matrices.push(tmpArr[j]);

    placed++;
  }

  return new Float32Array(matrices);
}
