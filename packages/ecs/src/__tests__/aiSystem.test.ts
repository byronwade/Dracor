import { describe, it, expect } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { createDracorWorld } from '../world';
import { aiSystem } from '../systems/aiSystem';
import { AI_STATE_IDLE, AI_STATE_CHASE } from '../components-ai';

describe('aiSystem', () => {
  it('switches NPC to chase when player is within aggro range', () => {
    const world = createDracorWorld();
    const c = world.components;
    const npc = addEntity(world);
    addComponent(world, npc, c.Position);
    addComponent(world, npc, c.Rotation);
    addComponent(world, npc, c.Velocity);
    addComponent(world, npc, c.InputState);
    addComponent(world, npc, c.AIAgent);
    addComponent(world, npc, c.IsNPC);
    c.Position.x[npc] = 0;
    c.Position.z[npc] = 0;
    c.AIAgent.state[npc] = AI_STATE_IDLE;
    c.AIAgent.aggroRange[npc] = 10;

    const player = addEntity(world);
    addComponent(world, player, c.Position);
    addComponent(world, player, c.IsPlayer);
    c.Position.x[player] = 5;
    c.Position.z[player] = 0;

    world.time.delta = 1 / 20;
    aiSystem(world);
    expect(c.AIAgent.state[npc]).toBe(AI_STATE_CHASE);
  });

  it('stays idle when no player is in range', () => {
    const world = createDracorWorld();
    const c = world.components;
    const npc = addEntity(world);
    addComponent(world, npc, c.Position);
    addComponent(world, npc, c.Rotation);
    addComponent(world, npc, c.Velocity);
    addComponent(world, npc, c.InputState);
    addComponent(world, npc, c.AIAgent);
    addComponent(world, npc, c.IsNPC);
    c.Position.x[npc] = 0;
    c.Position.z[npc] = 0;
    c.AIAgent.state[npc] = AI_STATE_IDLE;
    c.AIAgent.aggroRange[npc] = 10;

    const player = addEntity(world);
    addComponent(world, player, c.Position);
    addComponent(world, player, c.IsPlayer);
    c.Position.x[player] = 100;
    c.Position.z[player] = 100;

    world.time.delta = 1 / 20;
    aiSystem(world);
    expect(c.AIAgent.state[npc]).toBe(AI_STATE_IDLE);
  });
});
