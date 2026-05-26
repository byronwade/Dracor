import type { CharacterMotorState, MovementInput, Vec3 } from './types';
import { DEFAULT_PHYSICS_CONFIG, type PhysicsConfig } from './physicsConfig';

export class CharacterMotor {
  public state: CharacterMotorState;
  private config: PhysicsConfig;

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      yaw: 0,
      jumping: false,
      jumpTimeRemaining: 0,
    };
  }

  step(
    input: MovementInput,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const { config, state } = this;
    const dt = input.dt;

    // 1. Update yaw from input
    state.yaw = input.yaw;

    // 2. Calculate desired velocity from input (moveX, moveZ relative to yaw)
    // moveZ = forward/back, moveX = strafe left/right
    const sinYaw = Math.sin(state.yaw);
    const cosYaw = Math.cos(state.yaw);

    // World-space desired direction from local input
    const desiredDirX = input.moveX * cosYaw + input.moveZ * sinYaw;
    const desiredDirZ = -input.moveX * sinYaw + input.moveZ * cosYaw;

    // Normalize desired direction if magnitude > 1
    const dirMag = Math.sqrt(desiredDirX * desiredDirX + desiredDirZ * desiredDirZ);
    let normalizedDirX = desiredDirX;
    let normalizedDirZ = desiredDirZ;
    if (dirMag > 1.0) {
      normalizedDirX /= dirMag;
      normalizedDirZ /= dirMag;
    }

    // Determine max speed
    const maxSpeed = input.sprint ? config.maxSprintSpeed : config.maxWalkSpeed;
    const hasInput = Math.abs(input.moveX) > 0.001 || Math.abs(input.moveZ) > 0.001;

    // 3. Apply acceleration or deceleration
    const accelFactor = state.grounded ? 1.0 : config.airControl;

    if (hasInput) {
      // Desired horizontal velocity
      const targetVelX = normalizedDirX * maxSpeed;
      const targetVelZ = normalizedDirZ * maxSpeed;

      // Accelerate toward desired velocity
      const accel = config.acceleration * accelFactor * dt;
      state.velocity.x = moveToward(state.velocity.x, targetVelX, accel);
      state.velocity.z = moveToward(state.velocity.z, targetVelZ, accel);
    } else {
      // Decelerate toward zero when no input
      const decel = config.deceleration * accelFactor * dt;
      state.velocity.x = moveToward(state.velocity.x, 0, decel);
      state.velocity.z = moveToward(state.velocity.z, 0, decel);
    }

    // 4. Clamp horizontal speed to max
    const horizontalSpeed = Math.sqrt(
      state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z
    );
    if (horizontalSpeed > maxSpeed) {
      const scale = maxSpeed / horizontalSpeed;
      state.velocity.x *= scale;
      state.velocity.z *= scale;
    }

    // 5. Handle jumping
    if (state.grounded && input.jump && !state.jumping) {
      // Initiate jump
      state.velocity.y = config.jumpForce;
      state.jumping = true;
      state.jumpTimeRemaining = config.jumpDuration;
      state.grounded = false;
    }

    // 6. Apply gravity if not grounded
    if (!state.grounded) {
      state.velocity.y += config.gravity * dt;

      // Clamp to terminal velocity
      if (state.velocity.y < config.terminalVelocity) {
        state.velocity.y = config.terminalVelocity;
      }

      // Decrement jump time
      if (state.jumping) {
        state.jumpTimeRemaining -= dt;
        if (state.jumpTimeRemaining <= 0) {
          state.jumping = false;
          state.jumpTimeRemaining = 0;
        }
      }
    }

    // 7. Apply velocity to position
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    state.position.z += state.velocity.z * dt;

    // 8. Sample terrain height at new position
    const terrainHeight = getTerrainHeight(state.position.x, state.position.z);

    // 9. Ground collision: if position.y <= terrainHeight, snap to ground
    if (state.position.y <= terrainHeight) {
      state.position.y = terrainHeight;
      state.grounded = true;
      state.jumping = false;
      state.jumpTimeRemaining = 0;

      // Zero out vertical velocity when landing
      if (state.velocity.y < 0) {
        state.velocity.y = 0;
      }
    } else if (state.position.y > terrainHeight + config.groundSnapDistance) {
      // 10. If well above terrain, we are airborne
      state.grounded = false;
    } else if (state.grounded && state.velocity.y <= 0) {
      // Within snap distance and grounded with no upward velocity — snap down
      state.position.y = terrainHeight;
    }
  }

  teleport(x: number, y: number, z: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.position.z = z;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    this.state.velocity.z = 0;
    this.state.grounded = false;
    this.state.jumping = false;
    this.state.jumpTimeRemaining = 0;
  }

  reset(): void {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      yaw: 0,
      jumping: false,
      jumpTimeRemaining: 0,
    };
  }
}

/**
 * Move a value toward a target by at most `maxDelta`.
 * Works like Unity's Mathf.MoveTowards — guarantees no overshoot.
 */
function moveToward(current: number, target: number, maxDelta: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) {
    return target;
  }
  return current + Math.sign(diff) * maxDelta;
}
