// Types
export type {
  Vec3,
  CharacterMotorState,
  MovementInput,
  CollisionLayer,
  TriggerVolume,
} from './types';

// Physics config
export type { PhysicsConfig } from './physicsConfig';
export { DEFAULT_PHYSICS_CONFIG } from './physicsConfig';

// Character motor
export { CharacterMotor } from './CharacterMotor';

// Collision layers
export {
  COLLISION_LAYERS,
  layerCanCollideWith,
  createCollisionMask,
} from './colliders';
export type { CollisionLayerName } from './colliders';

// Terrain collision
export type { HeightSampler } from './terrainCollision';
export {
  createFlatHeightSampler,
  createProceduralHeightSampler,
  sampleTerrainNormal,
  getSlopeAngle,
} from './terrainCollision';

// Physics world
export { PhysicsWorld } from './PhysicsWorld';
