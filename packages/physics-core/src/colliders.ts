export const COLLISION_LAYERS = {
  NONE: 0,
  TERRAIN: 1 << 0,
  PLAYER: 1 << 1,
  NPC: 1 << 2,
  ENEMY: 1 << 3,
  PROJECTILE: 1 << 4,
  TRIGGER: 1 << 5,
  INTERACTABLE: 1 << 6,
  STATIC: 1 << 7,
} as const;

export type CollisionLayerName = keyof typeof COLLISION_LAYERS;

/**
 * Check if two layers can collide by testing their bitmask overlap.
 * Returns true if the two layer values share any set bits.
 */
export function layerCanCollideWith(layerA: number, layerB: number): boolean {
  return (layerA & layerB) !== 0;
}

/**
 * Combine multiple named collision layers into a single bitmask.
 */
export function createCollisionMask(...layers: CollisionLayerName[]): number {
  let mask = 0;
  for (const layer of layers) {
    mask |= COLLISION_LAYERS[layer];
  }
  return mask;
}
