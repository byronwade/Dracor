import type { Vec3, TriggerVolume } from './types';
import type { HeightSampler } from './terrainCollision';

export class PhysicsWorld {
  private triggers: TriggerVolume[];
  private heightSampler: HeightSampler;

  constructor(heightSampler: HeightSampler) {
    this.triggers = [];
    this.heightSampler = heightSampler;
  }

  addTrigger(trigger: TriggerVolume): void {
    this.triggers.push(trigger);
  }

  removeTrigger(id: string): void {
    const index = this.triggers.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.triggers.splice(index, 1);
    }
  }

  /**
   * Check which trigger volumes contain the given position and match the layer mask.
   *
   * @param position - The point to test
   * @param layer - The collision layer bitmask of the querying entity
   * @returns Array of trigger volumes that overlap with the position
   */
  checkTriggers(position: Vec3, layer: number): TriggerVolume[] {
    const results: TriggerVolume[] = [];

    for (const trigger of this.triggers) {
      // Check if layers overlap
      if ((trigger.layer & layer) === 0) {
        continue;
      }

      if (trigger.type === 'sphere') {
        if (isInsideSphere(position, trigger)) {
          results.push(trigger);
        }
      } else if (trigger.type === 'box') {
        if (isInsideBox(position, trigger)) {
          results.push(trigger);
        }
      }
    }

    return results;
  }

  getTerrainHeight(x: number, z: number): number {
    return this.heightSampler(x, z);
  }

  setHeightSampler(sampler: HeightSampler): void {
    this.heightSampler = sampler;
  }
}

function isInsideSphere(position: Vec3, trigger: TriggerVolume): boolean {
  const r = trigger.radius ?? 0;
  const dx = position.x - trigger.position.x;
  const dy = position.y - trigger.position.y;
  const dz = position.z - trigger.position.z;
  return dx * dx + dy * dy + dz * dz <= r * r;
}

function isInsideBox(position: Vec3, trigger: TriggerVolume): boolean {
  const he = trigger.halfExtents ?? { x: 0, y: 0, z: 0 };
  const dx = Math.abs(position.x - trigger.position.x);
  const dy = Math.abs(position.y - trigger.position.y);
  const dz = Math.abs(position.z - trigger.position.z);
  return dx <= he.x && dy <= he.y && dz <= he.z;
}
