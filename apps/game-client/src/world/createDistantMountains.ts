import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function createDistantMountains(scene: Scene): TransformNode {
  const root = new TransformNode('distantMountains', scene);

  const mountainMat = new StandardMaterial('distMountainMat', scene);
  mountainMat.diffuseColor = new Color3(0.12, 0.13, 0.18);
  mountainMat.specularColor = new Color3(0, 0, 0);
  mountainMat.emissiveColor = new Color3(0.04, 0.05, 0.08);

  const snowMat = new StandardMaterial('distSnowMat', scene);
  snowMat.diffuseColor = new Color3(0.35, 0.38, 0.45);
  snowMat.specularColor = new Color3(0, 0, 0);
  snowMat.emissiveColor = new Color3(0.12, 0.13, 0.18);

  const rand = seededRandom(42);
  const mountainCount = 36;
  const ringRadius = 900;

  for (let i = 0; i < mountainCount; i++) {
    const angle = (i / mountainCount) * Math.PI * 2 + (rand() - 0.5) * 0.15;
    const dist = ringRadius + rand() * 200;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const height = 80 + rand() * 200;
    const baseRadius = 60 + rand() * 80;

    // Main peak
    const peak = MeshBuilder.CreateCylinder(`distPeak_${i}`, {
      diameterTop: 0,
      diameterBottom: baseRadius * 2,
      height: height,
      tessellation: 5 + Math.floor(rand() * 3),
    }, scene);
    peak.position = new Vector3(x, height * 0.5 - 20, z);
    peak.scaling.x = 0.8 + rand() * 0.4;
    peak.scaling.z = 0.8 + rand() * 0.4;
    peak.rotation.y = rand() * Math.PI * 2;
    peak.material = mountainMat;
    peak.isPickable = false;
    peak.parent = root;

    // Snow cap on tall peaks
    if (height > 160) {
      const capHeight = height * 0.3;
      const capRadius = baseRadius * 0.4;
      const cap = MeshBuilder.CreateCylinder(`distCap_${i}`, {
        diameterTop: 0,
        diameterBottom: capRadius * 2,
        height: capHeight,
        tessellation: 5,
      }, scene);
      cap.position = new Vector3(x, height - capHeight * 0.5 - 20, z);
      cap.scaling.x = peak.scaling.x;
      cap.scaling.z = peak.scaling.z;
      cap.rotation.y = peak.rotation.y;
      cap.material = snowMat;
      cap.isPickable = false;
      cap.parent = root;
    }

    // Secondary smaller peak nearby (50% chance)
    if (rand() > 0.5) {
      const subAngle = angle + (rand() - 0.5) * 0.12;
      const subDist = dist + (rand() - 0.5) * 80;
      const subX = Math.cos(subAngle) * subDist;
      const subZ = Math.sin(subAngle) * subDist;
      const subHeight = height * (0.4 + rand() * 0.3);
      const subRadius = baseRadius * (0.5 + rand() * 0.3);

      const sub = MeshBuilder.CreateCylinder(`distSub_${i}`, {
        diameterTop: 0,
        diameterBottom: subRadius * 2,
        height: subHeight,
        tessellation: 4 + Math.floor(rand() * 2),
      }, scene);
      sub.position = new Vector3(subX, subHeight * 0.5 - 20, subZ);
      sub.scaling.x = 0.8 + rand() * 0.4;
      sub.scaling.z = 0.8 + rand() * 0.4;
      sub.rotation.y = rand() * Math.PI * 2;
      sub.material = mountainMat;
      sub.isPickable = false;
      sub.parent = root;
    }
  }

  return root;
}
