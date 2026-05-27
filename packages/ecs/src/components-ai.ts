const MAX_ENTITIES = 10_000;

export const AI_STATE_IDLE = 0;
export const AI_STATE_PATROL = 1;
export const AI_STATE_CHASE = 2;
export const AI_STATE_FLEE = 3;

export const AIAgent = {
  state: new Uint8Array(MAX_ENTITIES),
  targetEntity: new Uint32Array(MAX_ENTITIES),
  navGoalX: new Float32Array(MAX_ENTITIES),
  navGoalZ: new Float32Array(MAX_ENTITIES),
  pathRecalcTimer: new Float32Array(MAX_ENTITIES),
  aggroRange: new Float32Array(MAX_ENTITIES),
};

export const IsNPC = {};
