import { addEntity, addComponent, removeEntity } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';
import { registerMesh, unregisterMesh } from './renderSyncSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';

interface RemoteEntityRef {
  eid: number;
  mesh: Mesh;
}

export function createNetworkReceiveSystem(scene: Scene, createRemoteMesh: (id: string, name: string, scene: Scene) => Mesh) {
  const remoteEntities = new Map<string, RemoteEntityRef>();

  function onPlayerAdd(world: DracorWorld, sessionId: string, name: string, localSessionId: string): void {
    if (sessionId === localSessionId) return;
    if (remoteEntities.has(sessionId)) return;

    const eid = addEntity(world);
    const c = world.components;
    addComponent(world, eid, c.Position);
    addComponent(world, eid, c.Rotation);
    addComponent(world, eid, c.Velocity);
    addComponent(world, eid, c.IsRemote);

    const mesh = createRemoteMesh(sessionId, name, scene);
    registerMesh(eid, mesh);
    remoteEntities.set(sessionId, { eid, mesh });
  }

  function onPlayerRemove(world: DracorWorld, sessionId: string): void {
    const ref = remoteEntities.get(sessionId);
    if (!ref) return;
    unregisterMesh(ref.eid);
    ref.mesh.dispose(false, true);
    removeEntity(world, ref.eid);
    remoteEntities.delete(sessionId);
  }

  function updateRemotePosition(eid: number, x: number, y: number, z: number, yaw: number, components: DracorWorld['components']): void {
    components.Position.x[eid] = x;
    components.Position.y[eid] = y;
    components.Position.z[eid] = z;
    components.Rotation.yaw[eid] = yaw;
  }

  function getEid(sessionId: string): number | undefined {
    return remoteEntities.get(sessionId)?.eid;
  }

  function dispose(world: DracorWorld): void {
    for (const [, ref] of remoteEntities) {
      unregisterMesh(ref.eid);
      ref.mesh.dispose(false, true);
      removeEntity(world, ref.eid);
    }
    remoteEntities.clear();
  }

  return { onPlayerAdd, onPlayerRemove, updateRemotePosition, getEid, dispose };
}
