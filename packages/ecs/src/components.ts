const MAX_ENTITIES = 10_000;

export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
};

export const Rotation = {
  yaw: new Float32Array(MAX_ENTITIES),
};

export const Velocity = {
  vx: new Float32Array(MAX_ENTITIES),
  vy: new Float32Array(MAX_ENTITIES),
  vz: new Float32Array(MAX_ENTITIES),
};

export const Health = {
  current: new Int16Array(MAX_ENTITIES),
  max: new Int16Array(MAX_ENTITIES),
};

export const CharacterInfo = {
  race: new Uint8Array(MAX_ENTITIES),
  weapon: new Uint8Array(MAX_ENTITIES),
  level: new Uint16Array(MAX_ENTITIES),
};

export const NetworkId = {
  sessionHash: new Uint32Array(MAX_ENTITIES),
};

export const InputState = {
  moveX: new Float32Array(MAX_ENTITIES),
  moveZ: new Float32Array(MAX_ENTITIES),
  yaw: new Float32Array(MAX_ENTITIES),
  sprint: new Uint8Array(MAX_ENTITIES),
  jump: new Uint8Array(MAX_ENTITIES),
};

export const IsMoving = {};

export const IsPlayer = {};

export const IsRemote = {};

export type DracorComponents = {
  Position: typeof Position;
  Rotation: typeof Rotation;
  Velocity: typeof Velocity;
  Health: typeof Health;
  CharacterInfo: typeof CharacterInfo;
  NetworkId: typeof NetworkId;
  InputState: typeof InputState;
  IsMoving: typeof IsMoving;
  IsPlayer: typeof IsPlayer;
  IsRemote: typeof IsRemote;
};
