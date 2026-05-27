import { query } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const meshRegistry = new Map<number, TransformNode>();

export function registerInterpolationMesh(eid: number, mesh: TransformNode): void {
  meshRegistry.set(eid, mesh);
}

export function unregisterInterpolationMesh(eid: number): void {
  meshRegistry.delete(eid);
}

const LERP_FACTOR = 0.15;

export function interpolationSystem(world: DracorWorld): void {
  const { Position, Rotation, IsRemote } = world.components;
  for (const eid of query(world, [Position, Rotation, IsRemote])) {
    const mesh = meshRegistry.get(eid);
    if (!mesh) continue;
    mesh.position.x += (Position.x[eid] - mesh.position.x) * LERP_FACTOR;
    mesh.position.y += (Position.y[eid] - mesh.position.y) * LERP_FACTOR;
    mesh.position.z += (Position.z[eid] - mesh.position.z) * LERP_FACTOR;
    mesh.rotation.y += (Rotation.yaw[eid] - mesh.rotation.y) * LERP_FACTOR;
  }
}
