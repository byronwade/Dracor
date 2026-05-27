import { createWorld } from 'bitecs';
import {
  Position, Rotation, Velocity, Health, CharacterInfo,
  NetworkId, InputState, IsMoving, IsPlayer, IsRemote,
  type DracorComponents,
} from './components';
import { AIAgent, IsNPC } from './components-ai';
import { AudioSource, AudioListener } from './components-audio';
import { MaterialOverride } from './components-material';
import { Renderable, LODGroup } from './components-render';

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
      AIAgent,
      IsNPC,
      AudioSource,
      AudioListener,
      MaterialOverride,
      Renderable,
      LODGroup,
    },
    time: {
      delta: 0,
      tick: 0,
    },
  });
}
