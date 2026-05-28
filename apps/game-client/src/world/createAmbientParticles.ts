import { Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Particles/particleSystemComponent';

export function createAmbientParticles(scene: Scene, followTarget: TransformNode): ParticleSystem {

  const ps = new ParticleSystem('ambientEmbers', 80, scene);

  // Use a simple circle texture — create procedurally
  ps.createPointEmitter(new Vector3(-30, -2, -30), new Vector3(30, 8, 30));

  // Particle appearance
  ps.minSize = 0.03;
  ps.maxSize = 0.12;
  ps.minLifeTime = 4;
  ps.maxLifeTime = 10;
  ps.emitRate = 12;

  // Warm ember colors with magical blue-white sparks mixed in
  ps.color1 = new Color4(1.0, 0.5, 0.1, 0.6);
  ps.color2 = new Color4(0.4, 0.6, 1.0, 0.4);
  ps.colorDead = new Color4(0.1, 0.1, 0.2, 0.0);

  // Slow floating motion
  ps.minEmitPower = 0.1;
  ps.maxEmitPower = 0.4;
  ps.gravity = new Vector3(0, 0.15, 0);

  // Additive blending for glow
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;

  const emitPos = new Vector3(0, 1, 0);
  ps.emitter = emitPos;

  // Follow the player
  scene.onBeforeRenderObservable.add(() => {
    const targetPos = followTarget.position;
    emitPos.x = targetPos.x;
    emitPos.y = targetPos.y + 1;
    emitPos.z = targetPos.z;
  });

  ps.start();
  return ps;
}
