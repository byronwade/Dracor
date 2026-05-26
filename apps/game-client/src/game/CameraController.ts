import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Culling/ray';
import type { MouseState } from './InputController';

const MIN_RADIUS = 5;
const MAX_RADIUS = 40;
const DEFAULT_RADIUS = 18;
const MIN_BETA = 0.3;
const MAX_BETA = 1.4;
const DEFAULT_BETA = 0.85;
const DEFAULT_FOV = 0.75;
const SPRINT_FOV = 0.82;

const ORBIT_SENSITIVITY = 0.003;
const ZOOM_BASE_SENSITIVITY = 0.006;
const CAMERA_SMOOTHING = 0.14;
const POSITION_SMOOTHING = 0.16;
const FOV_SMOOTHING = 0.08;
const TERRAIN_OFFSET = 1.2;
const COLLISION_OFFSET = 0.3;
const TARGET_Y_OFFSET = 1.4;

const AUTO_FOLLOW_SPEED = 1.5;
const AUTO_FOLLOW_DELAY = 0.8;
const INERTIA_DECAY = 0.92;
const INERTIA_THRESHOLD = 0.0001;

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}

export class CameraController {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private target: TransformNode;
  private getHeightAt: ((x: number, z: number) => number) | null = null;

  private targetAlpha: number;
  private targetBeta: number;
  private targetRadius: number;
  private targetFov: number;
  private smoothPosition = new Vector3();
  private initialized = false;

  private inertiaAlpha = 0;
  private inertiaBeta = 0;
  private timeSinceOrbit = 10;
  private playerMoving = false;
  private playerYaw = 0;
  private isSprinting = false;

  private collisionRadius: number;
  private rayOrigin = new Vector3();
  private rayDir = new Vector3();

  constructor(scene: Scene, target: TransformNode, getHeightAt?: (x: number, z: number) => number) {
    this.scene = scene;
    this.target = target;
    this.getHeightAt = getHeightAt || null;

    this.targetAlpha = Math.PI;
    this.targetBeta = DEFAULT_BETA;
    this.targetRadius = DEFAULT_RADIUS;
    this.targetFov = DEFAULT_FOV;
    this.collisionRadius = DEFAULT_RADIUS;

    this.camera = new ArcRotateCamera(
      'playerCamera',
      this.targetAlpha,
      this.targetBeta,
      this.targetRadius,
      target.position.clone().add(new Vector3(0, TARGET_Y_OFFSET, 0)),
      scene
    );

    this.camera.lowerRadiusLimit = MIN_RADIUS;
    this.camera.upperRadiusLimit = MAX_RADIUS;
    this.camera.lowerBetaLimit = MIN_BETA;
    this.camera.upperBetaLimit = MAX_BETA;
    this.camera.panningSensibility = 0;
    this.camera.inputs.clear();
    this.camera.minZ = 0.3;
    this.camera.fov = DEFAULT_FOV;

    this.smoothPosition.copyFrom(target.position);
    this.smoothPosition.y += TARGET_Y_OFFSET;

    scene.activeCamera = this.camera;
  }

  getCameraYaw(): number {
    return this.camera.alpha;
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  setPlayerState(moving: boolean, yaw: number, sprinting: boolean): void {
    this.playerMoving = moving;
    this.playerYaw = yaw;
    this.isSprinting = sprinting;
  }

  resetBehindPlayer(): void {
    this.targetAlpha = this.playerYaw + Math.PI;
    this.targetBeta = DEFAULT_BETA;
    this.inertiaAlpha = 0;
    this.inertiaBeta = 0;
  }

  update(mouse: MouseState, dt: number): void {
    if (mouse.locked && (mouse.deltaX !== 0 || mouse.deltaY !== 0)) {
      this.targetAlpha -= mouse.deltaX * ORBIT_SENSITIVITY;
      this.targetBeta -= mouse.deltaY * ORBIT_SENSITIVITY;
      this.targetBeta = Math.max(MIN_BETA, Math.min(MAX_BETA, this.targetBeta));
      this.timeSinceOrbit = 0;
    } else {
      this.timeSinceOrbit += dt;
    }

    if (mouse.scrollDelta !== 0) {
      const distanceFactor = this.targetRadius / MAX_RADIUS;
      const zoomSpeed = ZOOM_BASE_SENSITIVITY * (0.3 + distanceFactor * 0.7);
      this.targetRadius += mouse.scrollDelta * zoomSpeed;
      this.targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, this.targetRadius));
    }

    if (mouse.middleDown) {
      this.resetBehindPlayer();
    }

    if (this.playerMoving && this.timeSinceOrbit > AUTO_FOLLOW_DELAY) {
      const behindAlpha = this.playerYaw + Math.PI;
      const followT = Math.min(1, AUTO_FOLLOW_SPEED * dt);
      this.targetAlpha = lerpAngle(this.targetAlpha, behindAlpha, followT);
    }

    this.targetFov = this.isSprinting ? SPRINT_FOV : DEFAULT_FOV;

    const t = 1 - Math.pow(1 - CAMERA_SMOOTHING, dt * 60);
    const pt = 1 - Math.pow(1 - POSITION_SMOOTHING, dt * 60);
    const ft = 1 - Math.pow(1 - FOV_SMOOTHING, dt * 60);

    const tp = this.target.position;
    this.smoothPosition.x += (tp.x - this.smoothPosition.x) * pt;
    this.smoothPosition.y += (tp.y + TARGET_Y_OFFSET - this.smoothPosition.y) * pt;
    this.smoothPosition.z += (tp.z - this.smoothPosition.z) * pt;

    this.camera.target.copyFrom(this.smoothPosition);

    this.camera.alpha += (this.targetAlpha - this.camera.alpha) * t;
    this.camera.beta += (this.targetBeta - this.camera.beta) * t;
    this.camera.radius += (this.targetRadius - this.camera.radius) * t;
    this.camera.fov += (this.targetFov - this.camera.fov) * ft;

    this.resolveTerrainCollision();
    this.resolveObjectCollision();

    if (!this.initialized) {
      this.camera.alpha = this.targetAlpha;
      this.camera.beta = this.targetBeta;
      this.camera.radius = this.targetRadius;
      this.camera.fov = this.targetFov;
      this.smoothPosition.set(tp.x, tp.y + TARGET_Y_OFFSET, tp.z);
      this.camera.target.copyFrom(this.smoothPosition);
      this.initialized = true;
    }
  }

  private resolveTerrainCollision(): void {
    if (!this.getHeightAt) return;
    const camPos = this.camera.position;
    const groundAtCam = this.getHeightAt(camPos.x, camPos.z) + TERRAIN_OFFSET;
    if (camPos.y < groundAtCam) {
      const overshoot = groundAtCam - camPos.y;
      const betaCorrection = overshoot * 0.02;
      this.camera.beta = Math.max(MIN_BETA, this.camera.beta - betaCorrection);
      this.targetBeta = this.camera.beta;

      if (this.camera.radius > MIN_RADIUS + 1) {
        this.camera.radius -= overshoot * 0.3;
        if (this.camera.radius < MIN_RADIUS) this.camera.radius = MIN_RADIUS;
      }
    }
  }

  private resolveObjectCollision(): void {
    const targetPos = this.camera.target;
    const camPos = this.camera.position;

    this.rayDir.copyFrom(camPos).subtractInPlace(targetPos);
    const fullDist = this.rayDir.length();
    if (fullDist < 0.1) return;
    this.rayDir.normalize();

    this.rayOrigin.copyFrom(targetPos);

    const ray = new Ray(this.rayOrigin, this.rayDir, fullDist);
    const pick = this.scene.pickWithRay(ray, (mesh) => {
      if (!mesh.isEnabled() || !mesh.isPickable) return false;
      if (mesh.name.startsWith('localPlayer')) return false;
      if (mesh.name.startsWith('rp_')) return false;
      if (mesh.name.startsWith('rpHead_')) return false;
      if (mesh.name === 'skyDome') return false;
      if (mesh.name === 'horizonGlow') return false;
      if (mesh.name.startsWith('grass_')) return false;
      if (mesh.name.startsWith('water_')) return false;
      return true;
    });

    if (pick && pick.hit && pick.distance < fullDist) {
      const clampedRadius = Math.max(MIN_RADIUS, pick.distance - COLLISION_OFFSET);
      if (clampedRadius < this.camera.radius) {
        this.camera.radius = clampedRadius;
        this.collisionRadius = clampedRadius;
      }
    } else {
      this.collisionRadius = this.targetRadius;
    }
  }

  dispose(): void {
    this.camera.dispose();
  }
}
