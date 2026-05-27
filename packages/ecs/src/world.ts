import { createWorld } from 'bitecs';
import {
  Position, Rotation, Velocity, Health, CharacterInfo,
  NetworkId, InputState, IsMoving, IsPlayer, IsRemote,
  type DracorComponents,
} from './components';

export interface DracorWorld {
  components: DracorComponents;
  time: { delta: number; tick: number };
}

export function createDracorWorld(): DracorWorld {
  return createWorld({
    components: {
      Position,
      Rotation,
      Velocity,
      Health,
      CharacterInfo,
      NetworkId,
      InputState,
      IsMoving,
      IsPlayer,
      IsRemote,
    },
    time: {
      delta: 0,
      tick: 0,
    },
  });
}
