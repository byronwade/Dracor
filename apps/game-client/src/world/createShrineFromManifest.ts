import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';

import type { LandmarkDefinition } from '../scenes/IronvaleOutskirtsScene';

/**
 * Create the Dracor Memory Shrine with glowing ember crystal and particle effects.
 * Samples terrain height at the shrine position so it sits on the ground.
 */
export function createShrineFromManifest(
  landmark: LandmarkDefinition,
  scene: Scene,
  getHeightAt: (x: number, z: number) => number
): Mesh {
  const parent = new TransformNode(`shrine_${landmark.id}`, scene) as unknown as Mesh;
  const pos = landmark.position;
  const scale = landmark.scale ?? 1.0;

  // Sample terrain height as the base Y for all shrine elements
  const baseY = getHeightAt(pos.x, pos.z);

  // Dark stone pedestal
  const pedestalMat = new StandardMaterial('shrinePedestalMat', scene);
  pedestalMat.diffuseColor = new Color3(0.12, 0.12, 0.14);
  pedestalMat.specularColor = new Color3(0.03, 0.03, 0.03);
  pedestalMat.roughness = 1.0;

  const pedestal = MeshBuilder.CreateCylinder(
    'shrinePedestal',
    { diameter: 2 * scale, height: 1.2 * scale, tessellation: 12 },
    scene
  );
  pedestal.position = new Vector3(pos.x, baseY + 0.6 * scale, pos.z);
  pedestal.material = pedestalMat;
  pedestal.parent = parent;

  // Smaller step at the base
  const base = MeshBuilder.CreateCylinder(
    'shrineBase',
    { diameter: 3 * scale, height: 0.3 * scale, tessellation: 12 },
    scene
  );
  base.position = new Vector3(pos.x, baseY + 0.15 * scale, pos.z);
  base.material = pedestalMat;
  base.parent = parent;

  // Pillar columns around the pedestal (4 corners)
  const pillarMat = new StandardMaterial('shrinePillarMat', scene);
  pillarMat.diffuseColor = new Color3(0.1, 0.1, 0.12);
  pillarMat.specularColor = new Color3(0.02, 0.02, 0.02);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const dist = 1.2 * scale;
    const pillar = MeshBuilder.CreateCylinder(
      `shrinePillar_${i}`,
      { diameter: 0.25 * scale, height: 2.5 * scale, tessellation: 8 },
      scene
    );
    pillar.position = new Vector3(
      pos.x + Math.cos(angle) * dist,
      baseY + 1.25 * scale,
      pos.z + Math.sin(angle) * dist
    );
    pillar.material = pillarMat;
    pillar.parent = parent;
  }

  // Ember crystal (glowing sphere)
  const emissiveColor = landmark.emissive
    ? landmark.emissive.color
    : [1.0, 0.55, 0.1];
  const emissiveIntensity = landmark.emissive
    ? landmark.emissive.intensity
    : 2.5;

  const crystalMat = new StandardMaterial('shrineCrystalMat', scene);
  crystalMat.diffuseColor = new Color3(
    emissiveColor[0] * 0.3,
    emissiveColor[1] * 0.3,
    emissiveColor[2] * 0.3
  );
  crystalMat.emissiveColor = new Color3(
    emissiveColor[0] * emissiveIntensity,
    emissiveColor[1] * emissiveIntensity,
    emissiveColor[2] * emissiveIntensity
  );
  crystalMat.specularColor = new Color3(0.5, 0.3, 0.1);
  crystalMat.alpha = 0.9;

  const crystal = MeshBuilder.CreateSphere(
    'shrineCrystal',
    { diameter: 0.6 * scale, segments: 16 },
    scene
  );
  crystal.position = new Vector3(pos.x, baseY + 1.6 * scale, pos.z);
  crystal.material = crystalMat;
  crystal.parent = parent;

  // Inner glow sphere (smaller, brighter)
  const innerGlowMat = new StandardMaterial('shrineInnerGlow', scene);
  innerGlowMat.diffuseColor = Color3.Black();
  innerGlowMat.emissiveColor = new Color3(
    emissiveColor[0] * emissiveIntensity * 1.5,
    emissiveColor[1] * emissiveIntensity * 1.5,
    emissiveColor[2] * emissiveIntensity * 1.5
  );
  innerGlowMat.alpha = 0.7;
  innerGlowMat.disableLighting = true;

  const innerGlow = MeshBuilder.CreateSphere(
    'shrineInnerGlow',
    { diameter: 0.35 * scale, segments: 12 },
    scene
  );
  innerGlow.position = new Vector3(pos.x, baseY + 1.6 * scale, pos.z);
  innerGlow.material = innerGlowMat;
  innerGlow.parent = parent;

  // Point light for the shrine glow
  const shrineLight = new PointLight(
    'shrineLight',
    new Vector3(pos.x, baseY + 2.0 * scale, pos.z),
    scene
  );
  shrineLight.intensity = 2.0;
  shrineLight.diffuse = new Color3(
    emissiveColor[0],
    emissiveColor[1],
    emissiveColor[2]
  );
  shrineLight.range = 15;
  shrineLight.parent = parent;

  // Particle system for rising ember particles
  if (landmark.particles === 'ember_rise') {
    createEmberParticles(scene, new Vector3(pos.x, baseY + 1.6 * scale, pos.z), parent as unknown as TransformNode);
  }

  // Ring of rune stones at base
  const runeMat = new StandardMaterial('shrineRuneMat', scene);
  runeMat.diffuseColor = new Color3(0.08, 0.08, 0.1);
  runeMat.emissiveColor = new Color3(
    emissiveColor[0] * 0.3,
    emissiveColor[1] * 0.3,
    emissiveColor[2] * 0.3
  );

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 2.0 * scale;
    const rune = MeshBuilder.CreateBox(
      `shrineRune_${i}`,
      { width: 0.2 * scale, height: 0.5 * scale, depth: 0.1 * scale },
      scene
    );
    rune.position = new Vector3(
      pos.x + Math.cos(angle) * dist,
      baseY + 0.25 * scale,
      pos.z + Math.sin(angle) * dist
    );
    rune.rotation.y = angle + Math.PI * 0.5;
    rune.material = runeMat;
    rune.parent = parent;
  }

  return parent as unknown as Mesh;
}

function createEmberParticles(
  scene: Scene,
  origin: Vector3,
  _parent: TransformNode
): void {
  const ps = new ParticleSystem('emberParticles', 80, scene);

  // ParticleSystem uses default white particle texture; colors tint it
  ps.emitter = origin;

  ps.minLifeTime = 1.0;
  ps.maxLifeTime = 3.0;
  ps.minSize = 0.05;
  ps.maxSize = 0.15;
  ps.emitRate = 15;

  ps.color1 = new Color4(1.0, 0.6, 0.1, 1.0);
  ps.color2 = new Color4(1.0, 0.3, 0.05, 0.8);
  ps.colorDead = new Color4(0.3, 0.1, 0.0, 0.0);

  ps.direction1 = new Vector3(-0.3, 1, -0.3);
  ps.direction2 = new Vector3(0.3, 2, 0.3);

  ps.minEmitPower = 0.3;
  ps.maxEmitPower = 0.8;
  ps.gravity = new Vector3(0, -0.1, 0);

  ps.blendMode = ParticleSystem.BLENDMODE_ADD;

  // Emit box
  ps.minEmitBox = new Vector3(-0.2, -0.1, -0.2);
  ps.maxEmitBox = new Vector3(0.2, 0.1, 0.2);

  ps.start();
}
