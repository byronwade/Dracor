import { createDracorWorld, type DracorWorld } from '@dracor/ecs';

let world: DracorWorld | null = null;

export function getClientWorld(): DracorWorld {
  if (!world) {
    world = createDracorWorld();
  }
  return world;
}

export function disposeClientWorld(): void {
  world = null;
}
