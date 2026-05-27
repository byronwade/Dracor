import { query } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { NodeMaterial } from '@babylonjs/core/Materials/Node/nodeMaterial';

const meshRegistry = new Map<number, AbstractMesh>();
const shaderRegistry = new Map<number, NodeMaterial>();
const appliedShaders = new Map<number, number>();

export function registerMaterialMesh(eid: number, mesh: AbstractMesh): void {
  meshRegistry.set(eid, mesh);
}

export function registerShader(shaderId: number, material: NodeMaterial): void {
  shaderRegistry.set(shaderId, material);
}

export function materialSystem(world: DracorWorld): void {
  const { MaterialOverride } = world.components;
  for (const eid of query(world, [MaterialOverride])) {
    const shaderId = MaterialOverride.shaderId[eid];
    if (shaderId === 0) continue;
    if (appliedShaders.get(eid) === shaderId) continue;
    const mesh = meshRegistry.get(eid);
    const material = shaderRegistry.get(shaderId);
    if (!mesh || !material) continue;
    mesh.material = material;
    appliedShaders.set(eid, shaderId);
  }
}
