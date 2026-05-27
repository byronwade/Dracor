import { query } from '@dracor/ecs';
import type { DracorWorld } from '@dracor/ecs';

const LOD_DISTANCES = [50, 150, 400];

export function lodSystem(world: DracorWorld, cameraX: number, cameraY: number, cameraZ: number): void {
  const { Position, Renderable, LODGroup } = world.components;
  for (const eid of query(world, [Position, Renderable, LODGroup])) {
    const dx = Position.x[eid] - cameraX;
    const dy = Position.y[eid] - cameraY;
    const dz = Position.z[eid] - cameraZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let targetLOD = 2;
    if (dist < LOD_DISTANCES[0]) targetLOD = 0;
    else if (dist < LOD_DISTANCES[1]) targetLOD = 1;

    if (LODGroup.currentLOD[eid] !== targetLOD) {
      LODGroup.currentLOD[eid] = targetLOD;
      const meshIndices = [LODGroup.lod0[eid], LODGroup.lod1[eid], LODGroup.lod2[eid]];
      Renderable.meshIndex[eid] = meshIndices[targetLOD];
    }
  }
}
