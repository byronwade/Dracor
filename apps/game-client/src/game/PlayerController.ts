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

const WALK_SPEED = 5.0;
const SPRINT_MULTIPLIER = 1.8;
const ACCELERATION = 35.0;
const DECELERATION = 25.0;
const GRAVITY = -20.0;
const JUMP_VELOCITY = 8.0;
const GROUND_SNAP_THRESHOLD = 0.5;
const YAW_TURN_SPEED = 12.0;
const MESH_SMOOTH_FACTOR = 0.18;
const NETWORK_SEND_INTERVAL = 1000 / 20;

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}

interface MotorState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  visualYaw: number;
  grounded: boolean;
}

export class PlayerController {
  private mesh: Mesh;
  private motor: MotorState;
  private getHeightAt: (x: number, z: number) => number;
  private multiplayer: MultiplayerClient | null = null;
  private lastNetworkSend = 0;
  private cameraYaw = Math.PI;
  private meshX: number;
  private meshY: number;
  private meshZ: number;

  constructor(
    scene: Scene,
    spawnX: number,
    spawnY: number,
    spawnZ: number,
    getHeightAt: (x: number, z: number) => number
  ) {
    this.getHeightAt = getHeightAt;

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

    const head = MeshBuilder.CreateSphere(
      'localPlayerHead',
      { diameter: 0.6, segments: 12 },
      scene
    );
    head.position = new Vector3(0, 1.0, 0);
    head.parent = body;
    head.material = mat;

    this.mesh = body;

    const groundY = getHeightAt(spawnX, spawnZ);
    this.motor = {
      x: spawnX,
      y: groundY,
      z: spawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      visualYaw: 0,
      grounded: true,
    };

    this.meshX = spawnX;
    this.meshY = groundY + 0.8;
    this.meshZ = spawnZ;
    this.syncMeshToMotor(1);
  }

  setMultiplayerClient(client: MultiplayerClient): void {
    this.multiplayer = client;
  }

  setCameraYaw(yaw: number): void {
    this.cameraYaw = yaw;
  }

  getMesh(): Mesh {
    return this.mesh;
  }

  getPosition(): { x: number; y: number; z: number } {
    return { x: this.motor.x, y: this.motor.y, z: this.motor.z };
  }

  getYaw(): number {
    return this.motor.yaw;
  }

  update(input: InputState, dt: number): void {
    this.applyInput(input, dt);
    this.applyPhysics(dt);
    this.groundSnap();
    this.syncMeshToMotor(dt);
    this.maybeSendNetwork(input, dt);
  }

  private applyInput(input: InputState, dt: number): void {
    let moveX = input.moveX;
    let moveZ = input.moveZ;

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    const camAngle = this.cameraYaw + Math.PI;
    const sinCam = Math.sin(camAngle);
    const cosCam = Math.cos(camAngle);

    const worldX = moveX * cosCam + moveZ * sinCam;
    const worldZ = -moveX * sinCam + moveZ * cosCam;

    const maxSpeed = input.sprint ? WALK_SPEED * SPRINT_MULTIPLIER : WALK_SPEED;
    const desiredVx = worldX * maxSpeed;
    const desiredVz = worldZ * maxSpeed;

    const hasInput = len > 0;

    if (hasInput) {
      const accel = ACCELERATION * dt;
      this.motor.vx += (desiredVx - this.motor.vx) * Math.min(1, accel);
      this.motor.vz += (desiredVz - this.motor.vz) * Math.min(1, accel);

      const targetYaw = Math.atan2(worldX, worldZ);
      this.motor.yaw = lerpAngle(this.motor.yaw, targetYaw, Math.min(1, YAW_TURN_SPEED * dt));
    } else {
      const decel = DECELERATION * dt;
      this.motor.vx *= Math.max(0, 1 - decel);
      this.motor.vz *= Math.max(0, 1 - decel);

      if (Math.abs(this.motor.vx) < 0.01) this.motor.vx = 0;
      if (Math.abs(this.motor.vz) < 0.01) this.motor.vz = 0;
    }

    const currentSpeed = Math.sqrt(this.motor.vx * this.motor.vx + this.motor.vz * this.motor.vz);
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.motor.vx *= scale;
      this.motor.vz *= scale;
    }

    if (input.jump && this.motor.grounded) {
      this.motor.vy = JUMP_VELOCITY;
      this.motor.grounded = false;
    }
  }

  private applyPhysics(dt: number): void {
    if (!this.motor.grounded) {
      this.motor.vy += GRAVITY * dt;
    }

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
        this.motor.y = groundY;
        this.motor.vy = 0;
        this.motor.grounded = true;
      }
    } else {
      this.motor.grounded = false;
    }
  }

  private syncMeshToMotor(dt: number): void {
    const t = 1 - Math.pow(1 - MESH_SMOOTH_FACTOR, dt * 60);

    const targetX = this.motor.x;
    const targetY = this.motor.y + 0.8;
    const targetZ = this.motor.z;

    this.meshX += (targetX - this.meshX) * t;
    this.meshY += (targetY - this.meshY) * t;
    this.meshZ += (targetZ - this.meshZ) * t;

    this.mesh.position.set(this.meshX, this.meshY, this.meshZ);

    this.motor.visualYaw = lerpAngle(this.motor.visualYaw, this.motor.yaw, Math.min(1, YAW_TURN_SPEED * dt));
    this.mesh.rotation.y = this.motor.visualYaw;
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
