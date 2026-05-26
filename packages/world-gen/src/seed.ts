const LAYER_KEYS = [
  'continental',
  'elevation',
  'mountain',
  'detail',
  'moisture',
  'temperature',
  'biome',
  'foliage',
  'resource',
  'structure',
  'river',
  'region',
] as const;

export type LayerName = (typeof LAYER_KEYS)[number];

export class WorldSeed {
  readonly raw: number;
  private readonly layerSeeds: Map<LayerName, number>;

  constructor(seed: string | number) {
    this.raw = typeof seed === 'string' ? hashString(seed) : seed | 0;
    this.layerSeeds = new Map();

    for (let i = 0; i < LAYER_KEYS.length; i++) {
      this.layerSeeds.set(LAYER_KEYS[i], hashCombine(this.raw, i * 7919 + 104729));
    }
  }

  getLayerSeed(layer: LayerName): number {
    return this.layerSeeds.get(layer)!;
  }

  createRNG(layer: LayerName): SeededRNG {
    return new SeededRNG(this.getLayerSeed(layer));
  }
}

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 1;
  }

  next(): number {
    this.state = splitmix32(this.state);
    return (this.state >>> 0) / 0x100000000;
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  fork(extraSeed: number): SeededRNG {
    return new SeededRNG(hashCombine(this.state, extraSeed));
  }
}

function splitmix32(state: number): number {
  state = (state + 0x9e3779b9) | 0;
  let z = state;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return z ^ (z >>> 16);
}

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function hashCombine(a: number, b: number): number {
  let h = a | 0;
  h ^= (b * 0x5bd1e995) | 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  h ^= h >>> 15;
  return h | 0;
}
