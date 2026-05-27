const MAX_ENTITIES = 10_000;

/** Spatial audio source attached to an entity. */
export const AudioSource = {
  /** Numeric sound ID — resolve via SOUND_ID_MAP in the game client. */
  soundId: new Uint16Array(MAX_ENTITIES),
  /** Volume multiplier (0-1). */
  volume: new Float32Array(MAX_ENTITIES),
  /** Audible radius in world units. */
  radius: new Float32Array(MAX_ENTITIES),
  /** 1 = looping, 0 = one-shot. */
  loop: new Uint8Array(MAX_ENTITIES),
  /** 1 = currently playing, 0 = stopped. */
  playing: new Uint8Array(MAX_ENTITIES),
};

/** Tag component marking the entity that acts as the audio listener (typically the local player). */
export const AudioListener = {};
