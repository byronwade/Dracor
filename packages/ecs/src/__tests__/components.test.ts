import { describe, it, expect } from 'vitest';
import { createDracorWorld } from '../world';
import { addEntity, addComponent, query } from 'bitecs';

describe('ECS components', () => {
  it('creates a world with all component stores', () => {
    const world = createDracorWorld();
    expect(world.components.Position).toBeDefined();
    expect(world.components.Position.x).toBeInstanceOf(Float32Array);
    expect(world.components.Velocity).toBeDefined();
    expect(world.components.Rotation).toBeDefined();
    expect(world.components.Health).toBeDefined();
    expect(world.components.InputState).toBeDefined();
    expect(world.components.NetworkId).toBeDefined();
    expect(world.components.CharacterInfo).toBeDefined();
  });

  it('can add entities with Position and query them', () => {
    const world = createDracorWorld();
    const { Position } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    Position.x[eid] = 10;
    Position.y[eid] = 5;
    Position.z[eid] = 20;

    const entities = query(world, [Position]);
    expect([...entities]).toContain(eid);
    expect(Position.x[eid]).toBe(10);
    expect(Position.y[eid]).toBe(5);
    expect(Position.z[eid]).toBe(20);
  });

  it('can add multiple components to one entity', () => {
    const world = createDracorWorld();
    const { Position, Velocity, Health } = world.components;

    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, Health);

    Health.current[eid] = 100;
    Health.max[eid] = 100;

    const entities = query(world, [Position, Velocity, Health]);
    expect([...entities]).toContain(eid);
    expect(Health.current[eid]).toBe(100);
  });
});
