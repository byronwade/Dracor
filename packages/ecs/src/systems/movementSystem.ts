import { query } from 'bitecs';
import type { DracorWorld } from '../world';

const MAX_MOVE_SPEED = 6.0;
const MAX_SPRINT_SPEED = 10.8;
const MAX_COORDINATE = 500;
const MIN_COORDINATE = -500;
const MAX_Y = 100;
const MIN_Y = -10;

export type HeightSampler = (x: number, z: number) => number;

export function movementSystem(world: DracorWorld, getTerrainHeight: HeightSampler): void {
  const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;
  const dt = world.time.delta;

  for (const eid of query(world, [Position, Rotation, Velocity, InputState, IsPlayer])) {
    const moveX = InputState.moveX[eid];
    const moveZ = InputState.moveZ[eid];
    const yaw = InputState.yaw[eid];
    const sprint = InputState.sprint[eid] !== 0;

    const hasMoveInput = Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001;

    if (hasMoveInput) {
      const speed = sprint ? MAX_SPRINT_SPEED : MAX_MOVE_SPEED;
      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);
      const dirX = moveX * cosYaw + moveZ * sinYaw;
      const dirZ = -moveX * sinYaw + moveZ * cosYaw;
      const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const normX = mag > 1 ? dirX / mag : dirX;
      const normZ = mag > 1 ? dirZ / mag : dirZ;

      const newX = Position.x[eid] + normX * speed * dt;
      const newZ = Position.z[eid] + normZ * speed * dt;
      const terrainY = getTerrainHeight(newX, newZ);

      Position.x[eid] = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, newX));
      Position.y[eid] = Math.max(MIN_Y, Math.min(MAX_Y, terrainY));
      Position.z[eid] = Math.max(MIN_COORDINATE, Math.min(MAX_COORDINATE, newZ));
      Velocity.vx[eid] = normX * speed;
      Velocity.vy[eid] = 0;
      Velocity.vz[eid] = normZ * speed;
    } else {
      Velocity.vx[eid] = 0;
      Velocity.vy[eid] = 0;
      Velocity.vz[eid] = 0;
    }
    Rotation.yaw[eid] = yaw;
  }
}
