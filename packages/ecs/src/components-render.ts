const MAX_ENTITIES = 10_000;

export const Renderable = {
  meshIndex: new Uint32Array(MAX_ENTITIES),
  materialIndex: new Uint32Array(MAX_ENTITIES),
  visible: new Uint8Array(MAX_ENTITIES),
};

export const LODGroup = {
  lod0: new Uint32Array(MAX_ENTITIES),
  lod1: new Uint32Array(MAX_ENTITIES),
  lod2: new Uint32Array(MAX_ENTITIES),
  currentLOD: new Uint8Array(MAX_ENTITIES),
};
