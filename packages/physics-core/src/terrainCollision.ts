import type { Vec3 } from './types';

export type HeightSampler = (x: number, z: number) => number;

/**
 * Create a height sampler that always returns a constant height (flat ground).
 */
export function createFlatHeightSampler(height: number): HeightSampler {
  return (_x: number, _z: number) => height;
}

/**
 * Create a procedural height sampler using deterministic value noise.
 * Produces smooth, rolling terrain suitable for gameplay.
 *
 * @param seed - Integer seed for deterministic generation
 * @param amplitude - Maximum height variation (peak to valley is 2x amplitude)
 * @param frequency - How tightly packed the hills are (higher = more hills)
 */
export function createProceduralHeightSampler(
  seed: number,
  amplitude: number,
  frequency: number
): HeightSampler {
  return (x: number, z: number) => {
    const sx = x * frequency;
    const sz = z * frequency;
    return valueNoise2D(sx, sz, seed) * amplitude;
  };
}

/**
 * Sample the terrain normal at a point using finite differences.
 *
 * @param sampler - The height sampler function
 * @param x - World X coordinate
 * @param z - World Z coordinate
 * @param epsilon - Small offset for finite difference calculation
 * @returns Normalized surface normal vector
 */
export function sampleTerrainNormal(
  sampler: HeightSampler,
  x: number,
  z: number,
  epsilon: number = 0.1
): Vec3 {
  const hCenter = sampler(x, z);
  const hRight = sampler(x + epsilon, z);
  const hForward = sampler(x, z + epsilon);

  // Partial derivatives
  const dhdx = (hRight - hCenter) / epsilon;
  const dhdz = (hForward - hCenter) / epsilon;

  // Normal from cross product of tangent vectors:
  // tangentX = (1, dhdx, 0), tangentZ = (0, dhdz, 1)
  // normal = tangentX x tangentZ = (dhdx, 1, dhdz) then normalized
  // Note: using the convention that up = +Y, so the cross product gives:
  // normal = (-dhdx, 1, -dhdz)
  const nx = -dhdx;
  const ny = 1;
  const nz = -dhdz;

  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

  return {
    x: nx / length,
    y: ny / length,
    z: nz / length,
  };
}

/**
 * Get the slope angle in degrees from a surface normal.
 * A flat surface returns 0, a vertical wall returns 90.
 */
export function getSlopeAngle(normal: Vec3): number {
  // The angle between the normal and the up vector (0, 1, 0)
  // is acos(dot(normal, up)) = acos(normal.y) since normal is unit length
  const clampedY = Math.max(-1, Math.min(1, normal.y));
  return Math.acos(clampedY) * (180 / Math.PI);
}

// ─── Internal: Deterministic 2D Value Noise ───────────────────────────

/**
 * Hash function for deterministic pseudorandom values from integer coordinates.
 * Based on a simple integer hashing scheme.
 */
function hash2D(ix: number, iz: number, seed: number): number {
  // Combine coordinates and seed using bit manipulation
  let h = seed & 0xffffffff;
  h ^= (ix * 374761393) & 0xffffffff;
  h = ((h << 17) | (h >>> 15)) & 0xffffffff;
  h ^= (iz * 668265263) & 0xffffffff;
  h = ((h << 13) | (h >>> 19)) & 0xffffffff;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  // Map to [0, 1)
  return ((h & 0x7fffffff) / 0x7fffffff);
}

/**
 * Smooth interpolation (Hermite / smoothstep).
 */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * 2D value noise. Returns values in approximately [-1, 1].
 * Uses bilinear interpolation of hashed lattice values with smoothstep.
 */
function valueNoise2D(x: number, z: number, seed: number): number {
  // Integer lattice coordinates
  const ix = Math.floor(x);
  const iz = Math.floor(z);

  // Fractional part
  const fx = x - ix;
  const fz = z - iz;

  // Smoothstep the fractions for smooth interpolation
  const sx = smoothstep(fx);
  const sz = smoothstep(fz);

  // Hash values at four corners, mapped to [-1, 1]
  const v00 = hash2D(ix, iz, seed) * 2 - 1;
  const v10 = hash2D(ix + 1, iz, seed) * 2 - 1;
  const v01 = hash2D(ix, iz + 1, seed) * 2 - 1;
  const v11 = hash2D(ix + 1, iz + 1, seed) * 2 - 1;

  // Bilinear interpolation
  const top = v00 + (v10 - v00) * sx;
  const bottom = v01 + (v11 - v01) * sx;
  return top + (bottom - top) * sz;
}
