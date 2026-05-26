import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

import type { RoadDefinition } from '../scenes/IronvaleOutskirtsScene';

/**
 * Create a broken cobblestone road by placing flat box segments between waypoints.
 */
export function createRoadFromManifest(
  road: RoadDefinition,
  scene: Scene
): Mesh {
  const parent = new TransformNode(`road_${road.id}`, scene) as unknown as Mesh;

  // Road material - weathered stone
  const roadMat = new StandardMaterial('roadMat', scene);
  roadMat.diffuseColor = new Color3(0.25, 0.23, 0.2); // Warm gray stone
  roadMat.specularColor = new Color3(0.03, 0.03, 0.03);
  roadMat.roughness = 1.0;
  roadMat.ambientColor = new Color3(0.08, 0.07, 0.06);

  // Edge/rubble material
  const rubbleMat = new StandardMaterial('roadRubbleMat', scene);
  rubbleMat.diffuseColor = new Color3(0.18, 0.16, 0.14);
  rubbleMat.specularColor = new Color3(0.02, 0.02, 0.02);
  rubbleMat.roughness = 1.0;

  const points = road.points;

  for (let i = 0; i < points.length - 1; i++) {
    const start = new Vector3(points[i].x, points[i].y, points[i].z);
    const end = new Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z);
    const direction = end.subtract(start);
    const segmentLength = direction.length();
    const midpoint = start.add(direction.scale(0.5));

    // Create road segment
    const segment = MeshBuilder.CreateBox(
      `roadSeg_${road.id}_${i}`,
      {
        width: road.width,
        height: 0.15,
        depth: segmentLength,
      },
      scene
    );
    segment.position = midpoint;
    segment.material = roadMat;

    // Rotate to align with direction
    const angle = Math.atan2(direction.x, direction.z);
    segment.rotation.y = angle;

    // Slight random tilt for weathered look
    if (road.worn) {
      segment.rotation.x = (Math.random() - 0.5) * 0.02;
      segment.rotation.z = (Math.random() - 0.5) * 0.02;
    }

    segment.parent = parent;

    // Add scattered rubble/broken stones along edges
    if (road.worn) {
      const rubbleCount = Math.floor(segmentLength / 8);
      for (let r = 0; r < rubbleCount; r++) {
        const t = Math.random();
        const offset = (Math.random() - 0.5) * (road.width + 2);
        const rubblePos = start.add(direction.scale(t));
        rubblePos.x += Math.cos(angle + Math.PI * 0.5) * offset;
        rubblePos.z += Math.sin(angle + Math.PI * 0.5) * offset;

        const rubbleSize = 0.3 + Math.random() * 0.5;
        const rubble = MeshBuilder.CreateBox(
          `rubble_${road.id}_${i}_${r}`,
          { width: rubbleSize, height: rubbleSize * 0.4, depth: rubbleSize },
          scene
        );
        rubble.position = new Vector3(rubblePos.x, rubblePos.y + 0.1, rubblePos.z);
        rubble.rotation.y = Math.random() * Math.PI * 2;
        rubble.rotation.x = (Math.random() - 0.5) * 0.4;
        rubble.material = rubbleMat;
        rubble.parent = parent;
      }
    }
  }

  return parent as unknown as Mesh;
}
