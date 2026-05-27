import { query } from 'bitecs';
import type { DracorWorld } from '../world';

export interface QueuedInput {
  sessionHash: number;
  moveX: number;
  moveZ: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
}

export function hashSessionId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function createInputSystem() {
  return function inputSystem(world: DracorWorld, inputQueue: QueuedInput[]): void {
    const { InputState, NetworkId, IsPlayer } = world.components;
    const sessionToEntity = new Map<number, number>();
    for (const eid of query(world, [InputState, NetworkId, IsPlayer])) {
      sessionToEntity.set(NetworkId.sessionHash[eid], eid);
    }
    for (const input of inputQueue) {
      const eid = sessionToEntity.get(input.sessionHash);
      if (eid === undefined) continue;
      InputState.moveX[eid] = input.moveX;
      InputState.moveZ[eid] = input.moveZ;
      InputState.yaw[eid] = input.yaw;
      InputState.sprint[eid] = input.sprint ? 1 : 0;
      InputState.jump[eid] = input.jump ? 1 : 0;
    }
  };
}
