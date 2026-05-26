import { Room } from 'colyseus.js';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';

import { connectToWorldRoom } from '../networking/connectToWorldRoom';
import type { ClientInputMessage, ChatMessagePayload, ConnectionState } from '../networking/networkTypes';

interface RemotePlayer {
  mesh: Mesh;
  label: Mesh;
  labelTexture: DynamicTexture;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRotY: number;
}

/**
 * Handles Colyseus connection, remote player management, and message passing.
 */
export class MultiplayerClient {
  private room: Room | null = null;
  private remotePlayers = new Map<string, RemotePlayer>();
  private connectionState: ConnectionState = 'disconnected';
  private inputSeq = 0;
  private onConnectionChange: ((state: ConnectionState) => void) | null = null;
  private onChatMessage: ((sender: string, content: string) => void) | null = null;

  /**
   * Connect to the server.
   */
  async connect(
    serverUrl: string,
    playerName: string,
    scene: Scene
  ): Promise<void> {
    this.setConnectionState('connecting');

    try {
      this.room = await connectToWorldRoom(serverUrl, playerName);
      this.setConnectionState('connected');
      this.setupListeners(scene);
      console.log(`[MP] Joined room "${this.room.name}" (session: ${this.room.sessionId})`);
    } catch (err) {
      this.setConnectionState('disconnected');
      console.warn('[MP] Connection failed:', err);
      throw err;
    }
  }

  private setupListeners(scene: Scene): void {
    const room = this.room;
    if (!room) return;
    const sessionId = room.sessionId;

    // Player joins
    room.state.players.onAdd((player: Record<string, unknown>, key: string) => {
      if (key === sessionId) return; // Skip self
      const name = (player.name as string) || 'Unknown';
      this.addRemotePlayer(key, name, scene);

      // Listen for changes
      if (typeof (player as { onChange?: unknown }).onChange === 'function') {
        (player as { onChange: (cb: () => void) => void }).onChange(() => {
          const rp = this.remotePlayers.get(key);
          if (rp) {
            rp.targetX = (player.x as number) ?? rp.targetX;
            rp.targetY = (player.y as number) ?? rp.targetY;
            rp.targetZ = (player.z as number) ?? rp.targetZ;
            rp.targetRotY = (player.yaw as number) ?? rp.targetRotY;
          }
        });
      }
    });

    // Player leaves
    room.state.players.onRemove((_player: unknown, key: string) => {
      this.removeRemotePlayer(key);
    });

    // Chat from state
    if (room.state.messages) {
      (room.state.messages as { onAdd: (cb: (msg: Record<string, unknown>) => void) => void }).onAdd(
        (message: Record<string, unknown>) => {
          const sender = (message.senderName as string) || 'Unknown';
          const content = (message.content as string) || '';
          this.onChatMessage?.(sender, content);
        }
      );
    }

    // Chat broadcast messages
    room.onMessage('chat', (message: Record<string, unknown>) => {
      if (message.sessionId !== sessionId) {
        const sender = (message.senderName as string) || 'Unknown';
        const content = (message.content as string) || '';
        this.onChatMessage?.(sender, content);
      }
    });

    // Handle disconnect
    room.onLeave(() => {
      this.setConnectionState('disconnected');
      // Clean up remote players
      for (const [key] of this.remotePlayers) {
        this.removeRemotePlayer(key);
      }
    });
  }

  /**
   * Send a client input message to the server (called at 20Hz).
   */
  sendInput(moveX: number, moveZ: number, yaw: number, sprint: boolean, jump: boolean, dt: number): void {
    if (!this.room || this.connectionState !== 'connected') return;

    this.inputSeq++;
    const msg: ClientInputMessage = {
      type: 'input',
      seq: this.inputSeq,
      moveX,
      moveZ,
      yaw,
      sprint,
      jump,
      dt,
    };

    try {
      this.room.send('input', msg);
    } catch (err) {
      console.warn('[MP] Failed to send input:', err);
    }
  }

  /**
   * Send a chat message.
   */
  sendChat(content: string): void {
    if (!this.room || this.connectionState !== 'connected') return;

    const msg: ChatMessagePayload = { content };
    try {
      this.room.send('chat', msg);
    } catch (err) {
      console.warn('[MP] Failed to send chat:', err);
    }
  }

  /**
   * Interpolate remote player positions (call each frame).
   */
  interpolateRemotePlayers(): void {
    const lerpFactor = 0.1; // 10% per frame

    for (const [, rp] of this.remotePlayers) {
      const pos = rp.mesh.position;
      pos.x += (rp.targetX - pos.x) * lerpFactor;
      pos.y += (rp.targetY + 0.8 - pos.y) * lerpFactor;
      pos.z += (rp.targetZ - pos.z) * lerpFactor;
      rp.mesh.rotation.y += (rp.targetRotY - rp.mesh.rotation.y) * lerpFactor;
    }
  }

  /** Register callback for connection state changes */
  onConnectionStateChange(cb: (state: ConnectionState) => void): void {
    this.onConnectionChange = cb;
  }

  /** Register callback for incoming chat messages */
  onChat(cb: (sender: string, content: string) => void): void {
    this.onChatMessage = cb;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getSessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  disconnect(): void {
    if (this.room) {
      try { this.room.leave(); } catch { /* ignore */ }
      this.room = null;
    }
    for (const [key] of this.remotePlayers) {
      this.removeRemotePlayer(key);
    }
    this.setConnectionState('disconnected');
  }

  // ─── Remote Player Mesh Management ───

  private addRemotePlayer(id: string, name: string, scene: Scene): void {
    // Body
    const body = MeshBuilder.CreateCylinder(
      `rp_${id}`,
      { diameter: 0.8, height: 1.6, tessellation: 16 },
      scene
    );
    body.position = new Vector3(0, 0.8, 0);

    const mat = new StandardMaterial(`rpMat_${id}`, scene);
    mat.diffuseColor = new Color3(0.3, 0.4, 0.6);
    mat.specularColor = new Color3(0.1, 0.1, 0.2);
    mat.emissiveColor = new Color3(0.02, 0.03, 0.08);
    body.material = mat;

    // Head
    const head = MeshBuilder.CreateSphere(
      `rpHead_${id}`,
      { diameter: 0.6, segments: 12 },
      scene
    );
    head.position = new Vector3(0, 1.0, 0);
    head.parent = body;
    head.material = mat;

    // Name label
    const { label, texture } = this.createNameLabel(id, name, body, scene);

    this.remotePlayers.set(id, {
      mesh: body,
      label,
      labelTexture: texture,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      targetRotY: 0,
    });
  }

  private removeRemotePlayer(id: string): void {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.labelTexture.dispose();
      rp.label.dispose();
      rp.mesh.dispose(false, true);
      this.remotePlayers.delete(id);
    }
  }

  private createNameLabel(
    id: string,
    name: string,
    parentMesh: Mesh,
    scene: Scene
  ): { label: Mesh; texture: DynamicTexture } {
    const labelPlane = MeshBuilder.CreatePlane(
      `rpLabel_${id}`,
      { width: 2, height: 0.4 },
      scene
    );
    labelPlane.position = new Vector3(0, 1.8, 0);
    labelPlane.parent = parentMesh;
    labelPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const texture = new DynamicTexture(
      `rpLabelTex_${id}`,
      { width: 256, height: 64 },
      scene,
      false
    );
    texture.hasAlpha = true;

    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);
    texture.update();

    const labelMat = new StandardMaterial(`rpLabelMat_${id}`, scene);
    labelMat.diffuseTexture = texture;
    labelMat.emissiveTexture = texture;
    labelMat.opacityTexture = texture;
    labelMat.disableLighting = true;
    labelMat.backFaceCulling = false;
    labelPlane.material = labelMat;

    return { label: labelPlane, texture };
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onConnectionChange?.(state);
  }
}
