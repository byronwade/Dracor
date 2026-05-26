export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CharacterMotorState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  yaw: number;
  jumping: boolean;
  jumpTimeRemaining: number;
}

export interface MovementInput {
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1
  sprint: boolean;
  jump: boolean;
  yaw: number;
  dt: number;
}

export interface CollisionLayer {
  name: string;
  mask: number;
}

export interface TriggerVolume {
  id: string;
  type: 'sphere' | 'box';
  position: Vec3;
  radius?: number;
  halfExtents?: Vec3;
  layer: number;
}
