import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import '@babylonjs/core/Meshes/Builders/groundBuilder';

import type { QualitySettings, TerrainDefinition } from '../scenes/IronvaleOutskirtsScene';

export interface TerrainResult {
  mesh: Mesh;
  getHeightAt: (x: number, z: number) => number;
}

/**
 * Simple deterministic noise function using layered sines.
 * Produces gentle rolling hills suitable for a frontier landscape.
 */
function proceduralHeight(x: number, z: number, heightScale: number): number {
  // Layer 1: broad rolling hills
  let h = Math.sin(x * 0.008) * Math.cos(z * 0.006) * 0.4;
  // Layer 2: medium undulation
  h += Math.sin(x * 0.02 + 1.7) * Math.cos(z * 0.025 + 0.3) * 0.2;
  // Layer 3: fine detail bumps
  h += Math.sin(x * 0.07 + 3.1) * Math.cos(z * 0.06 + 2.1) * 0.08;
  // Layer 4: very fine roughness
  h += Math.sin(x * 0.15 + 5.0) * Math.sin(z * 0.12 + 4.0) * 0.03;

  // Flatten near center (player spawn area)
  const distFromCenter = Math.sqrt(x * x + z * z);
  const flattenFactor = Math.min(1.0, distFromCenter / 60.0);

  return h * heightScale * flattenFactor;
}

/**
 * Create terrain ground mesh with procedural height displacement.
 */
export function createTerrainFromManifest(
  terrain: TerrainDefinition,
  scene: Scene,
  quality: QualitySettings
): TerrainResult {
  const totalSize = 500; // total world size
  const subdivisions = quality.tier === 'low' ? 64 : quality.tier === 'medium' ? 128 : 200;

  const ground = MeshBuilder.CreateGround(
    'terrain',
    {
      width: totalSize,
      height: totalSize,
      subdivisions,
      updatable: true,
    },
    scene
  );

  // Apply procedural height to vertices
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (positions) {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      positions[i + 1] = proceduralHeight(x, z, terrain.heightScale);
    }
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    ground.createNormals(false);
  }

  // Apply dark earth material
  const groundMat = new StandardMaterial('terrainMat', scene);
  groundMat.diffuseColor = new Color3(0.12, 0.09, 0.07); // Dark brown earth
  groundMat.specularColor = new Color3(0.02, 0.02, 0.02);
  groundMat.roughness = 1.0;
  // Slight ambient color for moss feel
  groundMat.ambientColor = new Color3(0.05, 0.08, 0.04);
  ground.material = groundMat;
  ground.receiveShadows = true;
  ground.position = Vector3.Zero();

  // Height query function for character motor
  const getHeightAt = (x: number, z: number): number => {
    return proceduralHeight(x, z, terrain.heightScale);
  };

  return { mesh: ground, getHeightAt };
}
