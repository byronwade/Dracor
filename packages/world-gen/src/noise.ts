import { hashCombine } from './seed';

export type NoiseFn2D = (x: number, z: number) => number;

function hash2D(ix: number, iz: number, seed: number): number {
  let h = seed & 0xffffffff;
  h ^= Math.imul(ix, 0x165667B1);
  h = ((h << 17) | (h >>> 15));
  h ^= Math.imul(iz, 0x27D4EB2D);
  h = ((h << 13) | (h >>> 19));
  h = Math.imul(h, 0x4C1906A5);
  h ^= h >>> 16;
  return ((h & 0x7fffffff) / 0x7fffffff);
}

function smoothstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createNoise2D(seed: number): NoiseFn2D {
  return (x: number, z: number): number => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smoothstep(x - ix);
    const fz = smoothstep(z - iz);

    const v00 = hash2D(ix, iz, seed) * 2 - 1;
    const v10 = hash2D(ix + 1, iz, seed) * 2 - 1;
    const v01 = hash2D(ix, iz + 1, seed) * 2 - 1;
    const v11 = hash2D(ix + 1, iz + 1, seed) * 2 - 1;

    return lerp(
      lerp(v00, v10, fx),
      lerp(v01, v11, fx),
      fz
    );
  };
}

export function createFractalNoise2D(
  seed: number,
  octaves: number,
  lacunarity: number = 2.0,
  persistence: number = 0.5
): NoiseFn2D {
  const layers: Array<{ noise: NoiseFn2D; amplitude: number; frequency: number }> = [];

  let amp = 1.0;
  let freq = 1.0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    const layerSeed = hashCombine(seed, i * 31337 + 65537);
    layers.push({
      noise: createNoise2D(layerSeed),
      amplitude: amp,
      frequency: freq,
    });
    totalAmp += amp;
    amp *= persistence;
    freq *= lacunarity;
  }

  const normFactor = 1 / totalAmp;

  return (x: number, z: number): number => {
    let value = 0;
    for (const layer of layers) {
      value += layer.noise(x * layer.frequency, z * layer.frequency) * layer.amplitude;
    }
    return value * normFactor;
  };
}

export function createRidgeNoise2D(
  seed: number,
  octaves: number,
  lacunarity: number = 2.0,
  persistence: number = 0.5
): NoiseFn2D {
  const base = createFractalNoise2D(seed, octaves, lacunarity, persistence);

  return (x: number, z: number): number => {
    const v = base(x, z);
    return 1.0 - Math.abs(v) * 2;
  };
}

export function createWarpedNoise2D(
  seed: number,
  octaves: number,
  warpStrength: number = 0.3
): NoiseFn2D {
  const base = createFractalNoise2D(seed, octaves);
  const warpX = createFractalNoise2D(hashCombine(seed, 99991), 3);
  const warpZ = createFractalNoise2D(hashCombine(seed, 77773), 3);

  return (x: number, z: number): number => {
    const wx = x + warpX(x, z) * warpStrength;
    const wz = z + warpZ(x, z) * warpStrength;
    return base(wx, wz);
  };
}
