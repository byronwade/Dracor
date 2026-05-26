export interface PhysicsConfig {
  gravity: number;
  maxWalkSpeed: number;
  maxSprintSpeed: number;
  acceleration: number;
  deceleration: number;
  airControl: number;
  jumpForce: number;
  jumpDuration: number;
  slopeLimit: number;
  stepHeight: number;
  groundSnapDistance: number;
  terminalVelocity: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: -20,
  maxWalkSpeed: 6.0,
  maxSprintSpeed: 10.8,
  acceleration: 40,
  deceleration: 30,
  airControl: 0.3,
  jumpForce: 10,
  jumpDuration: 0.3,
  slopeLimit: 45,
  stepHeight: 0.5,
  groundSnapDistance: 0.2,
  terminalVelocity: -50,
};
