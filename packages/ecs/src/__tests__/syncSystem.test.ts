import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { syncSystem, type SyncTarget } from '../systems/syncSystem';

describe('syncSystem', () => {
  it('writes ECS Position/Rotation to sync targets', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);
    NetworkId.sessionHash[eid] = 42;
    Position.x[eid] = 10;
    Position.y[eid] = 5;
    Position.z[eid] = 20;
    Rotation.yaw[eid] = 1.5;
    Velocity.vx[eid] = 3;
    const targets = new Map<number, SyncTarget>();
    targets.set(42, { x: 0, y: 0, z: 0, yaw: 0, isMoving: false });
    syncSystem(world, targets);
    const t = targets.get(42)!;
    expect(t.x).toBe(10);
    expect(t.y).toBe(5);
    expect(t.z).toBe(20);
    expect(t.yaw).toBe(1.5);
    expect(t.isMoving).toBe(true);
  });

  it('sets isMoving false when velocity is zero', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, NetworkId, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);
    NetworkId.sessionHash[eid] = 42;
    Velocity.vx[eid] = 0;
    Velocity.vy[eid] = 0;
    Velocity.vz[eid] = 0;
    const targets = new Map<number, SyncTarget>();
    targets.set(42, { x: 0, y: 0, z: 0, yaw: 0, isMoving: true });
    syncSystem(world, targets);
    expect(targets.get(42)!.isMoving).toBe(false);
  });
});
