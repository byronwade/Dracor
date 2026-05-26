import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';

/**
 * Create large dark mountain silhouettes at the far edges of the zone.
 * Uses tapered cylinders (cone-like) to approximate mountain peaks.
 */
export function createDistantMountains(scene: Scene): void {
  const mountainMat = new StandardMaterial('mountainMat', scene);
  mountainMat.diffuseColor = new Color3(0.04, 0.04, 0.06); // Very dark blue-black
  mountainMat.specularColor = Color3.Black();
  mountainMat.emissiveColor = new Color3(0.01, 0.01, 0.02); // Tiny hint so silhouette shows against sky
  mountainMat.disableLighting = true;

  // Slightly lighter for the distant fog-blended feel
  const farMountainMat = new StandardMaterial('farMountainMat', scene);
  farMountainMat.diffuseColor = new Color3(0.06, 0.06, 0.08);
  farMountainMat.specularColor = Color3.Black();
  farMountainMat.emissiveColor = new Color3(0.02, 0.02, 0.03);
  farMountainMat.disableLighting = true;

  const mountains = [
    // North mountains
    { x: -120, z: -280, height: 80, baseW: 120, mat: mountainMat },
    { x: 40, z: -300, height: 110, baseW: 140, mat: mountainMat },
    { x: 180, z: -260, height: 70, baseW: 100, mat: mountainMat },
    // East mountains
    { x: 300, z: -60, height: 90, baseW: 130, mat: farMountainMat },
    { x: 280, z: 100, height: 65, baseW: 110, mat: farMountainMat },
    // West mountains
    { x: -300, z: 50, height: 100, baseW: 150, mat: mountainMat },
    { x: -270, z: -120, height: 75, baseW: 120, mat: mountainMat },
    // Background layering (farther, taller)
    { x: -50, z: -350, height: 140, baseW: 200, mat: farMountainMat },
    { x: 100, z: -370, height: 120, baseW: 180, mat: farMountainMat },
  ];

  for (let i = 0; i < mountains.length; i++) {
    const m = mountains[i];
    const mountain = MeshBuilder.CreateCylinder(
      `mountain_${i}`,
      {
        diameterTop: 0,
        diameterBottom: m.baseW,
        height: m.height,
        tessellation: 6, // Low-poly silhouette feel
      },
      scene
    );
    mountain.position = new Vector3(m.x, m.height * 0.35, m.z);
    mountain.material = m.mat;
    mountain.isPickable = false;
    mountain.applyFog = false; // Silhouettes should stay visible through fog

    // Slight random asymmetry
    mountain.scaling.x = 0.8 + Math.random() * 0.4;
    mountain.scaling.z = 0.8 + Math.random() * 0.4;
  }
}
