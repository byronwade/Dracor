import { Matrix, Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import type { Scene } from '@babylonjs/core/scene';

export interface InstanceData {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function createInstanceBatch(
  sourceMesh: Mesh,
  instances: InstanceData[],
  _scene: Scene
): InstancedMesh[] {
  if (instances.length === 0) {
    return [];
  }

  // Use thin instances if we have a large batch (better GPU performance)
  if (instances.length > 64) {
    return createThinInstances(sourceMesh, instances);
  }

  return createRegularInstances(sourceMesh, instances);
}

function createRegularInstances(
  sourceMesh: Mesh,
  instances: InstanceData[]
): InstancedMesh[] {
  const result: InstancedMesh[] = [];

  for (let i = 0; i < instances.length; i++) {
    const data = instances[i];
    const instance = sourceMesh.createInstance(`${sourceMesh.name}_inst_${i}`);

    instance.position.set(data.position[0], data.position[1], data.position[2]);

    if (data.rotation) {
      instance.rotation.set(
        data.rotation[0],
        data.rotation[1],
        data.rotation[2]
      );
    }

    if (data.scale) {
      instance.scaling.set(data.scale[0], data.scale[1], data.scale[2]);
    }

    result.push(instance);
  }

  return result;
}

function createThinInstances(
  sourceMesh: Mesh,
  instances: InstanceData[]
): InstancedMesh[] {
  // Build the matrix buffer for all thin instances
  const matricesData = new Float32Array(instances.length * 16);
  const tempPosition = new Vector3();
  const tempRotation = new Quaternion();
  const tempScale = new Vector3(1, 1, 1);
  const tempMatrix = new Matrix();

  for (let i = 0; i < instances.length; i++) {
    const data = instances[i];

    tempPosition.set(data.position[0], data.position[1], data.position[2]);

    if (data.rotation) {
      Quaternion.FromEulerAnglesToRef(
        data.rotation[0],
        data.rotation[1],
        data.rotation[2],
        tempRotation
      );
    } else {
      tempRotation.set(0, 0, 0, 1);
    }

    if (data.scale) {
      tempScale.set(data.scale[0], data.scale[1], data.scale[2]);
    } else {
      tempScale.set(1, 1, 1);
    }

    Matrix.ComposeToRef(tempScale, tempRotation, tempPosition, tempMatrix);
    tempMatrix.copyToArray(matricesData, i * 16);
  }

  sourceMesh.thinInstanceSetBuffer('matrix', matricesData, 16, false);

  // Thin instances don't produce InstancedMesh objects. Return an empty array
  // since the instances are managed internally by the source mesh's thin instance buffer.
  return [];
}
