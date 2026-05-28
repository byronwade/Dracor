import { Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Particles/particleSystemComponent';

/**
 * Procedural soft white disc texture for additive particle blending.
 * Cached as a module-level singleton so all systems share one GPU texture.
 */
let sharedDiscTex: Texture | null = null;
function getDiscTexture(scene: Scene): Texture {
  if (sharedDiscTex) return sharedDiscTex;
  const tex = new DynamicTexture('particleDisc', { width: 64, height: 64 }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();
  sharedDiscTex = tex;
  return tex;
}

interface AmbientParticleSystems {
  embers: ParticleSystem;
  dust: ParticleSystem;
  leaves: ParticleSystem;
}

export function createAmbientParticles(
  scene: Scene,
  followTarget: TransformNode,
): AmbientParticleSystems {
  const disc = getDiscTexture(scene);

  // ─── Embers — warm magic dust drifting upward ───
  const embers = new ParticleSystem('ambientEmbers', 80, scene);
  embers.particleTexture = disc;
  embers.minSize = 0.04;
  embers.maxSize = 0.14;
  embers.minLifeTime = 4;
  embers.maxLifeTime = 10;
  embers.emitRate = 12;
  embers.color1 = new Color4(1.0, 0.5, 0.1, 0.6);
  embers.color2 = new Color4(0.4, 0.6, 1.0, 0.4);
  embers.colorDead = new Color4(0.1, 0.1, 0.2, 0.0);
  embers.minEmitPower = 0.1;
  embers.maxEmitPower = 0.4;
  embers.gravity = new Vector3(0, 0.18, 0);
  embers.blendMode = ParticleSystem.BLENDMODE_ADD;
  embers.createPointEmitter(new Vector3(-30, -2, -30), new Vector3(30, 8, 30));

  // ─── Dust motes — fine particles that catch god rays ───
  const dust = new ParticleSystem('ambientDust', 200, scene);
  dust.particleTexture = disc;
  dust.minSize = 0.015;
  dust.maxSize = 0.05;
  dust.minLifeTime = 8;
  dust.maxLifeTime = 18;
  dust.emitRate = 25;
  dust.color1 = new Color4(0.9, 0.85, 0.7, 0.4);
  dust.color2 = new Color4(1.0, 0.9, 0.6, 0.25);
  dust.colorDead = new Color4(0.6, 0.55, 0.4, 0.0);
  dust.minEmitPower = 0.03;
  dust.maxEmitPower = 0.12;
  // Drift mostly horizontally with a slight upward bias, matching wind
  dust.direction1 = new Vector3(-0.3, 0.1, -0.2);
  dust.direction2 = new Vector3(0.3, 0.2, 0.2);
  dust.gravity = new Vector3(0, 0.02, 0);
  dust.blendMode = ParticleSystem.BLENDMODE_ADD;
  dust.createBoxEmitter(
    new Vector3(-0.4, 0.1, -0.3),
    new Vector3(0.4, 0.3, 0.3),
    new Vector3(-25, 0, -25),
    new Vector3(25, 12, 25),
  );

  // ─── Leaves — slow drifting falling debris ───
  const leaves = new ParticleSystem('ambientLeaves', 25, scene);
  leaves.particleTexture = disc;
  leaves.minSize = 0.08;
  leaves.maxSize = 0.18;
  leaves.minLifeTime = 14;
  leaves.maxLifeTime = 28;
  leaves.emitRate = 1.2;
  leaves.color1 = new Color4(0.45, 0.32, 0.12, 0.7);
  leaves.color2 = new Color4(0.6, 0.45, 0.18, 0.6);
  leaves.colorDead = new Color4(0.2, 0.15, 0.08, 0.0);
  leaves.minEmitPower = 0.5;
  leaves.maxEmitPower = 1.2;
  leaves.direction1 = new Vector3(-0.6, -0.2, -0.4);
  leaves.direction2 = new Vector3(0.6, -0.5, 0.4);
  leaves.gravity = new Vector3(0.1, -0.4, 0);
  leaves.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  leaves.minAngularSpeed = -1.5;
  leaves.maxAngularSpeed = 1.5;
  leaves.createBoxEmitter(
    new Vector3(0, -1, 0),
    new Vector3(0, -1, 0),
    new Vector3(-20, 8, -20),
    new Vector3(20, 14, 20),
  );

  const embersEmit = new Vector3(0, 1, 0);
  const dustEmit = new Vector3(0, 4, 0);
  const leavesEmit = new Vector3(0, 10, 0);
  embers.emitter = embersEmit;
  dust.emitter = dustEmit;
  leaves.emitter = leavesEmit;

  scene.onBeforeRenderObservable.add(() => {
    const p = followTarget.position;
    embersEmit.set(p.x, p.y + 1, p.z);
    dustEmit.set(p.x, p.y + 4, p.z);
    leavesEmit.set(p.x, p.y + 10, p.z);
  });

  embers.start();
  dust.start();
  leaves.start();
  return { embers, dust, leaves };
}
