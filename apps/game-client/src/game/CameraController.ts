import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { MouseState } from './InputController';

const MIN_RADIUS = 4;
const MAX_RADIUS = 30;
const DEFAULT_RADIUS = 12;
const MIN_BETA = 0.3;
const MAX_BETA = 1.45;
const DEFAULT_BETA = 1.1;
const ORBIT_SENSITIVITY = 0.004;
const ZOOM_SENSITIVITY = 0.008;
const CAMERA_SMOOTHING = 0.12;
const TERRAIN_OFFSET = 1.5;

export class CameraController {
  private camera: ArcRotateCamera;
  private target: AbstractMesh;
  private getHeightAt: ((x: number, z: number) => number) | null = null;

  private targetAlpha: number;
  private targetBeta: number;
  private targetRadius: number;
  private smoothPosition = new Vector3();
  private initialized = false;

  constructor(scene: Scene, target: AbstractMesh, getHeightAt?: (x: number, z: number) => number) {
    this.target = target;
    this.getHeightAt = getHeightAt || null;

    this.targetAlpha = Math.PI;
    this.targetBeta = DEFAULT_BETA;
    this.targetRadius = DEFAULT_RADIUS;

    this.camera = new ArcRotateCamera(
      'playerCamera',
      this.targetAlpha,
      this.targetBeta,
      this.targetRadius,
      target.position.clone(),
      scene
    );

    this.camera.lowerRadiusLimit = MIN_RADIUS;
    this.camera.upperRadiusLimit = MAX_RADIUS;
    this.camera.lowerBetaLimit = MIN_BETA;
    this.camera.upperBetaLimit = MAX_BETA;
    this.camera.panningSensibility = 0;
    this.camera.inputs.clear();
    this.camera.minZ = 0.5;
    this.camera.fov = 0.9;

    this.smoothPosition.copyFrom(target.position);

    scene.activeCamera = this.camera;
  }

  getCameraYaw(): number {
    return this.camera.alpha;
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  update(mouse: MouseState, dt: number): void {
    if (mouse.rightDown) {
      this.targetAlpha -= mouse.deltaX * ORBIT_SENSITIVITY;
      this.targetBeta -= mouse.deltaY * ORBIT_SENSITIVITY;
      this.targetBeta = Math.max(MIN_BETA, Math.min(MAX_BETA, this.targetBeta));
    }

    if (mouse.scrollDelta !== 0) {
      this.targetRadius += mouse.scrollDelta * ZOOM_SENSITIVITY;
      this.targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, this.targetRadius));
    }

    const t = 1 - Math.pow(1 - CAMERA_SMOOTHING, dt * 60);

    const targetPos = this.target.position;
    this.smoothPosition.x += (targetPos.x - this.smoothPosition.x) * t;
    this.smoothPosition.y += (targetPos.y - this.smoothPosition.y) * t;
    this.smoothPosition.z += (targetPos.z - this.smoothPosition.z) * t;

    this.camera.target.copyFrom(this.smoothPosition);

    this.camera.alpha += (this.targetAlpha - this.camera.alpha) * t;
    this.camera.beta += (this.targetBeta - this.camera.beta) * t;
    this.camera.radius += (this.targetRadius - this.camera.radius) * t;

    if (this.getHeightAt) {
      const camPos = this.camera.position;
      const groundAtCam = this.getHeightAt(camPos.x, camPos.z) + TERRAIN_OFFSET;
      if (camPos.y < groundAtCam) {
        const correctedBeta = this.camera.beta - 0.05;
        this.camera.beta = Math.max(MIN_BETA, correctedBeta);
        this.targetBeta = this.camera.beta;
      }
    }

    if (!this.initialized) {
      this.camera.alpha = this.targetAlpha;
      this.camera.beta = this.targetBeta;
      this.camera.radius = this.targetRadius;
      this.smoothPosition.copyFrom(this.target.position);
      this.camera.target.copyFrom(this.smoothPosition);
      this.initialized = true;
    }
  }

  dispose(): void {
    this.camera.dispose();
  }
}
