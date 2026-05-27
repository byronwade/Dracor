import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { movementSystem } from '../systems/movementSystem';

describe('movementSystem', () => {
  it('moves entity forward based on input and yaw', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);
    InputState.moveZ[eid] = 1;
    InputState.yaw[eid] = 0;
    world.time.delta = 1 / 20;
    movementSystem(world, () => 0);
    expect(Position.z[eid]).toBeGreaterThan(0);
  });

  it('does not move entity with zero input', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);
    Position.x[eid] = 5;
    Position.z[eid] = 5;
    InputState.moveX[eid] = 0;
    InputState.moveZ[eid] = 0;
    InputState.yaw[eid] = 0;
    InputState.sprint[eid] = 0;
    InputState.jump[eid] = 0;
    world.time.delta = 1 / 20;
    movementSystem(world, () => 0);
    expect(Position.x[eid]).toBe(5);
    expect(Position.z[eid]).toBe(5);
  });

  it('clamps position to world bounds', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);
    Position.x[eid] = 499;
    InputState.moveX[eid] = 1;
    InputState.yaw[eid] = 0;
    InputState.sprint[eid] = 1;
    world.time.delta = 5;
    movementSystem(world, () => 0);
    expect(Position.x[eid]).toBeLessThanOrEqual(500);
  });

  it('snaps y to terrain height', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, IsPlayer);
    Position.x[eid] = 10;
    Position.z[eid] = 10;
    InputState.moveZ[eid] = 1;
    world.time.delta = 1 / 20;
    movementSystem(world, () => 5);
    expect(Position.y[eid]).toBe(5);
  });
});
