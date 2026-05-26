import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';

import type { InputState } from './InputController';
import type { MultiplayerClient } from './MultiplayerClient';

// ─── Character Motor Constants ───
const MOVE_SPEED = 5.0;
const SPRINT_MULTIPLIER = 1.8;
const GRAVITY = -20.0;
const JUMP_VELOCITY = 8.0;
const GROUND_SNAP_THRESHOLD = 0.5;
const NETWORK_SEND_INTERVAL = 1000 / 20; // 20Hz

/**
 * Local character motor: position, velocity, gravity, ground snap.
 */
interface CharacterMotorState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  grounded: boolean;
}

/**
 * Owns the local player mesh and runs the character motor each frame.
 */
export class PlayerController {
  private mesh: Mesh;
  private motor: CharacterMotorState;
  private getHeightAt: (x: number, z: number) => number;
  private multiplayer: MultiplayerClient | null = null;
  private lastNetworkSend = 0;

  constructor(
    scene: Scene,
    spawnX: number,
    spawnY: number,
    spawnZ: number,
    getHeightAt: (x: number, z: number) => number
  ) {
    this.getHeightAt = getHeightAt;

    // Create local player mesh (ember-orange capsule)
    const body = MeshBuilder.CreateCylinder(
      'localPlayer',
      { diameter: 0.8, height: 1.6, tessellation: 16 },
      scene
    );

    const mat = new StandardMaterial('localPlayerMat', scene);
    mat.diffuseColor = new Color3(0.9, 0.4, 0.1);
    mat.specularColor = new Color3(0.3, 0.15, 0.05);
    mat.emissiveColor = new Color3(0.15, 0.05, 0.0);
    body.material = mat;

    // Head sphere
    const head = MeshBuilder.CreateSphere(
      'localPlayerHead',
      { diameter: 0.6, segments: 12 },
      scene
    );
    head.position = new Vector3(0, 1.0, 0);
    head.parent = body;
    head.material = mat;

    this.mesh = body;

    // Initialize motor state
    const groundY = getHeightAt(spawnX, spawnZ);
    this.motor = {
      x: spawnX,
      y: groundY,
      z: spawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      grounded: true,
    };

    this.syncMeshToMotor();
  }

  setMultiplayerClient(client: MultiplayerClient): void {
    this.multiplayer = client;
  }

  getMesh(): Mesh {
    return this.mesh;
  }

  getPosition(): { x: number; y: number; z: number } {
    return { x: this.motor.x, y: this.motor.y, z: this.motor.z };
  }

  /**
   * Run the character motor for one frame.
   */
  update(input: InputState, dt: number): void {
    this.applyInput(input, dt);
    this.applyPhysics(dt);
    this.groundSnap();
    this.syncMeshToMotor();
    this.maybeSendNetwork(input, dt);
  }

  private applyInput(input: InputState, _dt: number): void {
    // Calculate desired velocity from input
    let moveX = input.moveX;
    let moveZ = input.moveZ;

    // Normalize diagonal
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    const speed = input.sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;
    this.motor.vx = moveX * speed;
    this.motor.vz = moveZ * speed;

    // Update yaw if moving
    if (length > 0) {
      this.motor.yaw = Math.atan2(moveX, moveZ);
    }

    // Jump
    if (input.jump && this.motor.grounded) {
      this.motor.vy = JUMP_VELOCITY;
      this.motor.grounded = false;
    }
  }

  private applyPhysics(dt: number): void {
    // Apply gravity
    if (!this.motor.grounded) {
      this.motor.vy += GRAVITY * dt;
    }

    // Integrate position
    this.motor.x += this.motor.vx * dt;
    this.motor.y += this.motor.vy * dt;
    this.motor.z += this.motor.vz * dt;
  }

  private groundSnap(): void {
    const groundY = this.getHeightAt(this.motor.x, this.motor.z);

    if (this.motor.y <= groundY + GROUND_SNAP_THRESHOLD) {
      if (this.motor.y < groundY) {
        this.motor.y = groundY;
        this.motor.vy = 0;
        this.motor.grounded = true;
      } else if (this.motor.vy <= 0) {
        // Falling or stationary near ground
        this.motor.y = groundY;
        this.motor.vy = 0;
        this.motor.grounded = true;
      }
    } else {
      this.motor.grounded = false;
    }
  }

  private syncMeshToMotor(): void {
    this.mesh.position.set(this.motor.x, this.motor.y + 0.8, this.motor.z);
    this.mesh.rotation.y = this.motor.yaw;
  }

  private maybeSendNetwork(input: InputState, dt: number): void {
    if (!this.multiplayer) return;

    const now = performance.now();
    if (now - this.lastNetworkSend < NETWORK_SEND_INTERVAL) return;
    this.lastNetworkSend = now;

    this.multiplayer.sendInput(
      input.moveX,
      input.moveZ,
      this.motor.yaw,
      input.sprint,
      input.jump,
      dt
    );
  }

  dispose(): void {
    this.mesh.dispose(false, true);
  }
}
