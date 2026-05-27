import { query } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';
import type { AudioManager } from '../../audio/AudioManager';
import { resolveSoundId } from '../../audio/soundRegistry';

const activeAudioKeys = new Map<number, string>();

export function audioSystem(
  world: DracorWorld,
  audioManager: AudioManager,
  listenerX: number,
  listenerY: number,
  listenerZ: number,
): void {
  const { Position, AudioSource } = world.components;

  for (const eid of query(world, [Position, AudioSource])) {
    const playing = AudioSource.playing[eid] !== 0;
    const radius = AudioSource.radius[eid];
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const ez = Position.z[eid];
    const dx = ex - listenerX;
    const dz = ez - listenerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const inRange = dist <= radius * 2;
    const key = activeAudioKeys.get(eid);

    if (playing && inRange) {
      if (!key) {
        const soundKey = resolveSoundId(AudioSource.soundId[eid]);
        if (!soundKey) continue;
        const newKey = audioManager.play(soundKey, `ecs-${eid}`);
        activeAudioKeys.set(eid, newKey);
      }
      const activeKey = activeAudioKeys.get(eid);
      if (activeKey) audioManager.setPosition(activeKey, ex, ey, ez);
    } else if (key) {
      audioManager.stop(key);
      activeAudioKeys.delete(eid);
    }
  }
}
