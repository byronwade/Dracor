import { query } from 'bitecs';
import type { DracorWorld } from '../world';

export interface SyncTarget {
  x: number;
  y: number;
  z: number;
  yaw: number;
  isMoving: boolean;
}

export function syncSystem(world: DracorWorld, targets: Map<number, SyncTarget>): void {
  const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;
  for (const eid of query(world, [Position, Rotation, Velocity, NetworkId, IsPlayer])) {
    const hash = NetworkId.sessionHash[eid];
    const target = targets.get(hash);
    if (!target) continue;
    target.x = Position.x[eid];
    target.y = Position.y[eid];
    target.z = Position.z[eid];
    target.yaw = Rotation.yaw[eid];
    const vx = Velocity.vx[eid];
    const vz = Velocity.vz[eid];
    target.isMoving = Math.abs(vx) > 0.01 || Math.abs(vz) > 0.01;
  }
}
