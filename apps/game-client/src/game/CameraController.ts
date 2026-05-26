import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

/**
 * Follow camera targeting the local player mesh.
 */
export class CameraController {
  private camera: FollowCamera;

  constructor(scene: Scene, target: AbstractMesh) {
    this.camera = new FollowCamera(
      'followCamera',
      new Vector3(0, 15, -15),
      scene
    );
    this.camera.radius = 15;
    this.camera.heightOffset = 8;
    this.camera.rotationOffset = 180;
    this.camera.cameraAcceleration = 0.05;
    this.camera.maxCameraSpeed = 20;
    this.camera.lockedTarget = target;

    scene.activeCamera = this.camera;
  }

  getCamera(): FollowCamera {
    return this.camera;
  }

  dispose(): void {
    this.camera.dispose();
  }
}
