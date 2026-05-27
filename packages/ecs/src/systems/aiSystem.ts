import { query } from 'bitecs';
import type { DracorWorld } from '../world';
import { AI_STATE_IDLE, AI_STATE_CHASE } from '../components-ai';

export function aiSystem(world: DracorWorld): void {
  const { Position, InputState, AIAgent, IsNPC, IsPlayer } = world.components;

  const players: number[] = [];
  for (const eid of query(world, [Position, IsPlayer])) {
    players.push(eid);
  }

  for (const eid of query(world, [Position, InputState, AIAgent, IsNPC])) {
    const npcX = Position.x[eid];
    const npcZ = Position.z[eid];
    const aggroRange = AIAgent.aggroRange[eid];

    let closestPlayer = -1;
    let closestDist = Infinity;

    for (const pid of players) {
      const dx = Position.x[pid] - npcX;
      const dz = Position.z[pid] - npcZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = pid;
      }
    }

    if (closestPlayer >= 0 && closestDist <= aggroRange) {
      AIAgent.state[eid] = AI_STATE_CHASE;
      AIAgent.targetEntity[eid] = closestPlayer;

      const dx = Position.x[closestPlayer] - npcX;
      const dz = Position.z[closestPlayer] - npcZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1.5) {
        InputState.moveX[eid] = 0;
        InputState.moveZ[eid] = 1;
        InputState.yaw[eid] = Math.atan2(dx, dz);
        InputState.sprint[eid] = closestDist > aggroRange * 0.5 ? 1 : 0;
      } else {
        InputState.moveX[eid] = 0;
        InputState.moveZ[eid] = 0;
      }
    } else {
      AIAgent.state[eid] = AI_STATE_IDLE;
      InputState.moveX[eid] = 0;
      InputState.moveZ[eid] = 0;
    }
  }
}
