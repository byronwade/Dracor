export type SoundCategory = 'ambient' | 'music' | 'sfx' | 'ui';

export interface SoundDef {
  src: string[];
  category: SoundCategory;
  loop?: boolean;
  volume?: number;
  spatial?: boolean;
}

export const SOUNDS: Record<string, SoundDef> = {
  'ambient-wind': { src: ['/audio/ambient/wind.webm', '/audio/ambient/wind.mp3'], category: 'ambient', loop: true, volume: 0.3, spatial: true },
  'ambient-birds': { src: ['/audio/ambient/birds.webm', '/audio/ambient/birds.mp3'], category: 'ambient', loop: true, volume: 0.2, spatial: true },
  'sfx-footstep': { src: ['/audio/sfx/footstep.webm', '/audio/sfx/footstep.mp3'], category: 'sfx', volume: 0.5, spatial: true },
  'sfx-sword': { src: ['/audio/sfx/sword.webm', '/audio/sfx/sword.mp3'], category: 'sfx', volume: 0.6, spatial: true },
  'ui-click': { src: ['/audio/ui/click.webm', '/audio/ui/click.mp3'], category: 'ui', volume: 0.4 },
  'music-ironvale': { src: ['/audio/music/ironvale.webm', '/audio/music/ironvale.mp3'], category: 'music', loop: true, volume: 0.3 },
};

/**
 * Numeric ID to sound key mapping for ECS AudioSource.soundId (Uint16Array).
 * When adding new sounds, assign the next sequential ID here.
 */
export const SOUND_ID_MAP: string[] = [
  'ambient-wind',    // 0
  'ambient-birds',   // 1
  'sfx-footstep',    // 2
  'sfx-sword',       // 3
  'ui-click',        // 4
  'music-ironvale',  // 5
];

/** Resolve a numeric sound ID to its string key. */
export function resolveSoundId(id: number): string | undefined {
  return SOUND_ID_MAP[id];
}
