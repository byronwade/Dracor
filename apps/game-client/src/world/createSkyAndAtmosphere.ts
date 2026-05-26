import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

import type { QualitySettings } from '../scenes/IronvaleOutskirtsScene';

/**
 * Create a gradient sky dome and atmospheric effects.
 * Uses a large inverted hemisphere with emissive gradient material,
 * plus ambient floating particle dust if quality allows.
 */
export function createSkyAndAtmosphere(
  scene: Scene,
  quality: QualitySettings
): void {
  // Sky dome (large hemisphere, rendered from inside)
  const skyDome = MeshBuilder.CreateSphere(
    'skyDome',
    { diameter: 800, segments: 16, sideOrientation: 1 }, // sideOrientation 1 = inside
    scene
  );
  skyDome.position = Vector3.Zero();
  skyDome.isPickable = false;
  skyDome.infiniteDistance = true;
  skyDome.applyFog = false; // Don't let scene fog hide the sky

  // Sky material - dark dusk gradient approximation
  const skyMat = new StandardMaterial('skyMat', scene);
  skyMat.diffuseColor = Color3.Black();
  skyMat.specularColor = Color3.Black();
  skyMat.emissiveColor = new Color3(0.03, 0.02, 0.05); // Very dark purple-blue
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyDome.material = skyMat;

  // Render sky behind everything
  skyDome.renderingGroupId = 0;

  // Scene clear color as the "horizon" fallback
  scene.clearColor = new Color4(0.02, 0.015, 0.03, 1.0);

  // Warm horizon glow - a ring of faint light near the horizon line (south)
  // Represented by a dim emissive band
  const horizonGlow = MeshBuilder.CreateSphere(
    'horizonGlow',
    { diameter: 790, segments: 8, sideOrientation: 1, arc: 0.5 },
    scene
  );
  horizonGlow.position = new Vector3(0, -50, 100);
  horizonGlow.scaling.y = 0.15;
  horizonGlow.isPickable = false;
  horizonGlow.infiniteDistance = true;
  horizonGlow.applyFog = false;

  const horizonMat = new StandardMaterial('horizonMat', scene);
  horizonMat.diffuseColor = Color3.Black();
  horizonMat.specularColor = Color3.Black();
  horizonMat.emissiveColor = new Color3(0.12, 0.06, 0.02); // Warm amber low glow
  horizonMat.alpha = 0.4;
  horizonMat.disableLighting = true;
  horizonMat.backFaceCulling = false;
  horizonGlow.material = horizonMat;
  horizonGlow.renderingGroupId = 0;

  // Ambient dust particles (high quality only)
  if (quality.tier === 'high' || quality.tier === 'ultra') {
    createAmbientDust(scene);
  }
}

function createAmbientDust(scene: Scene): void {
  const ps = new ParticleSystem('ambientDust', 200, scene);

  ps.emitter = new Vector3(0, 5, 0);
  ps.minEmitBox = new Vector3(-80, 0, -80);
  ps.maxEmitBox = new Vector3(80, 15, 80);

  ps.minLifeTime = 4.0;
  ps.maxLifeTime = 8.0;
  ps.minSize = 0.02;
  ps.maxSize = 0.06;
  ps.emitRate = 30;

  ps.color1 = new Color4(0.6, 0.5, 0.4, 0.15);
  ps.color2 = new Color4(0.4, 0.35, 0.3, 0.1);
  ps.colorDead = new Color4(0.3, 0.25, 0.2, 0.0);

  ps.direction1 = new Vector3(-0.5, 0.1, -0.5);
  ps.direction2 = new Vector3(0.5, 0.3, 0.5);

  ps.minEmitPower = 0.05;
  ps.maxEmitPower = 0.15;
  ps.gravity = new Vector3(0, -0.005, 0);

  ps.blendMode = ParticleSystem.BLENDMODE_ADD;

  ps.start();
}
