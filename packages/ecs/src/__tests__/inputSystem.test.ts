import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { createInputSystem, hashSessionId, type QueuedInput } from '../systems/inputSystem';

describe('inputSystem', () => {
  it('writes queued input to entity InputState component', () => {
    const world = createDracorWorld();
    const { Position, Rotation, Velocity, InputState, NetworkId, IsPlayer } = world.components;
    const eid = addEntity(world);
    addComponent(world, eid, Position);
    addComponent(world, eid, Rotation);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, InputState);
    addComponent(world, eid, NetworkId);
    addComponent(world, eid, IsPlayer);
    const hash = hashSessionId('abc123');
    NetworkId.sessionHash[eid] = hash;
    const queue: QueuedInput[] = [
      { sessionHash: hash, moveX: 0.5, moveZ: -1, yaw: 1.2, sprint: true, jump: false },
    ];
    const inputSystem = createInputSystem();
    inputSystem(world, queue);
    expect(InputState.moveX[eid]).toBeCloseTo(0.5);
    expect(InputState.moveZ[eid]).toBeCloseTo(-1);
    expect(InputState.yaw[eid]).toBeCloseTo(1.2);
    expect(InputState.sprint[eid]).toBe(1);
    expect(InputState.jump[eid]).toBe(0);
  });

  it('ignores input for non-existent session', () => {
    const world = createDracorWorld();
    const queue: QueuedInput[] = [
      { sessionHash: 99999, moveX: 1, moveZ: 1, yaw: 0, sprint: false, jump: false },
    ];
    const inputSystem = createInputSystem();
    inputSystem(world, queue);
  });
});
