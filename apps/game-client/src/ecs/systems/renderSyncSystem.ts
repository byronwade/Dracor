import { query } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const meshRegistry = new Map<number, TransformNode>();

export function registerMesh(eid: number, mesh: TransformNode): void {
  meshRegistry.set(eid, mesh);
}

export function unregisterMesh(eid: number): void {
  meshRegistry.delete(eid);
}

export function renderSyncSystem(world: DracorWorld): void {
  const { Position, Rotation } = world.components;
  for (const eid of query(world, [Position, Rotation])) {
    const mesh = meshRegistry.get(eid);
    if (!mesh) continue;
    mesh.position.x = Position.x[eid];
    mesh.position.y = Position.y[eid];
    mesh.position.z = Position.z[eid];
    mesh.rotation.y = Rotation.yaw[eid];
  }
}
