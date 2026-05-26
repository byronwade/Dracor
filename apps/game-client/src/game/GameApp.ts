import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

import { ENV } from '../env';
import { getSceneBuilder, type SceneBuildResult } from '../scenes/SceneRegistry';
import {
  autoSelectQuality,
  getQualitySettings,
  type QualitySettings,
  type RendererCapabilities,
} from '../scenes/IronvaleOutskirtsScene';
import { InputController } from './InputController';
import { PlayerController } from './PlayerController';
import { CameraController } from './CameraController';
import { MultiplayerClient } from './MultiplayerClient';
import { ChatController } from './ChatController';
import { GameLoop } from './GameLoop';
import { createGameHud, type GameHud } from '../ui/createGameHud';
import { createDevPanel, type DevPanel } from '../ui/createDevPanel';
import { createMinimap, type Minimap } from '../ui/createMinimap';

export class GameApp {
  private engine!: Engine;
  private scene!: Scene;
  private quality!: QualitySettings;
  private inputController!: InputController;
  private playerController!: PlayerController;
  private cameraController!: CameraController;
  private multiplayerClient!: MultiplayerClient;
  private chatController!: ChatController;
  private gameLoop!: GameLoop;
  private hud!: GameHud;
  private devPanel!: DevPanel;
  private minimap!: Minimap;
  private playerName: string;

  constructor(private canvas: HTMLCanvasElement) {
    this.playerName = this.resolvePlayerName();
  }

  async start(): Promise<void> {
    const caps = await this.detectCapabilities();

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });

    const tier = autoSelectQuality(caps);
    this.quality = getQualitySettings(tier);
    console.log(`[Game] Quality tier: ${tier} (WebGPU: ${caps.webgpu}, WebGL2: ${caps.webgl2})`);

    const builder = getSceneBuilder('ironvale_outskirts');
    const result: SceneBuildResult = builder(this.engine, this.quality);
    this.scene = result.scene;

    this.inputController = new InputController();

    const spawn = { x: 0, y: 0, z: 10 };
    this.playerController = new PlayerController(
      this.scene,
      spawn.x,
      spawn.y,
      spawn.z,
      result.getHeightAt
    );

    this.cameraController = new CameraController(
      this.scene,
      this.playerController.getMesh()
    );

    this.hud = createGameHud();
    this.hud.setPlayerName(this.playerName);
    this.hud.setZoneName('Ironvale Outskirts');
    this.hud.setHealth(100, 100);

    this.devPanel = createDevPanel(this.engine, this.scene, this.quality);
    this.devPanel.setQualityTier(this.quality.tier);
    this.minimap = createMinimap();

    this.chatController = new ChatController();

    this.multiplayerClient = new MultiplayerClient();
    this.playerController.setMultiplayerClient(this.multiplayerClient);

    this.multiplayerClient.onChat((sender, content, isSystem) => {
      if (isSystem) {
        this.chatController.addSystemMessage(content);
      } else {
        this.chatController.addMessage(sender, content);
      }
    });

    this.chatController.onSend((content) => {
      this.multiplayerClient.sendChat(content);
      const displayName = this.multiplayerClient.getAssignedName() || this.playerName;
      this.chatController.addMessage(displayName, content);
    });

    this.connectToServer();

    this.gameLoop = new GameLoop(this.engine, this.scene, (dt) => {
      this.update(dt);
    });
    this.gameLoop.start();

    window.addEventListener('resize', this.handleResize);
  }

  private update(dt: number): void {
    const input = this.inputController.getInput();
    this.playerController.update(input, dt);
    this.multiplayerClient.interpolateRemotePlayers();

    this.devPanel.update({
      connectionState: this.multiplayerClient.getConnectionState(),
      networkStats: this.multiplayerClient.getNetworkStats(),
      playerCount: this.multiplayerClient.getPlayerCount(),
      roomName: 'world_room',
    });

    const pos = this.playerController.getPosition();
    const yaw = this.playerController.getYaw();
    this.minimap.updatePlayerPosition(pos.x, pos.z, yaw);
    this.minimap.updateRemotePlayers(this.multiplayerClient.getRemotePlayerPositions());
  }

  private async connectToServer(): Promise<void> {
    try {
      await this.multiplayerClient.connect(
        ENV.gameServerUrl,
        this.playerName,
        this.scene
      );
      const assigned = this.multiplayerClient.getAssignedName();
      if (assigned && assigned !== this.playerName) {
        this.playerName = assigned;
        this.hud.setPlayerName(assigned);
      }
      console.log(`[Game] Connected as "${this.playerName}"`);
    } catch {
      this.chatController.addSystemMessage('Running in offline mode.');
      console.log('[Game] Running in offline mode');
    }
  }

  private async detectCapabilities(): Promise<RendererCapabilities> {
    const caps: RendererCapabilities = {
      webgpu: false, webgl2: false, webgl1: false,
      maxTextureSize: 0, maxDrawBuffers: 0, floatTextures: false,
      instancedArrays: false, deviceTier: 'low', estimatedVRAM: 0,
    };

    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const gpu = (navigator as unknown as { gpu: GPU }).gpu;
        const adapter = await gpu.requestAdapter();
        if (adapter) {
          caps.webgpu = true;
          caps.maxTextureSize = adapter.limits.maxTextureDimension2D ?? 8192;
          caps.maxDrawBuffers = adapter.limits.maxColorAttachments ?? 8;
          caps.floatTextures = true;
          caps.instancedArrays = true;
          caps.estimatedVRAM = 2048;
          caps.deviceTier = 'high';
        }
      } catch { /* WebGPU not available */ }
    }

    if (!caps.webgpu || caps.maxTextureSize === 0) {
      const testCanvas = document.createElement('canvas');
      const gl2 = testCanvas.getContext('webgl2');
      if (gl2) {
        caps.webgl2 = true;
        caps.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) as number;
        caps.maxDrawBuffers = gl2.getParameter(gl2.MAX_DRAW_BUFFERS) as number;
        caps.floatTextures = gl2.getExtension('EXT_color_buffer_float') !== null;
        caps.instancedArrays = true;
        caps.estimatedVRAM = 1024;
        if (caps.floatTextures && caps.maxTextureSize >= 8192) caps.deviceTier = 'high';
        else if (caps.maxTextureSize >= 4096) caps.deviceTier = 'mid';
        const lc = gl2.getExtension('WEBGL_lose_context');
        if (lc) lc.loseContext();
      } else {
        const gl1 = testCanvas.getContext('webgl');
        if (gl1) {
          caps.webgl1 = true;
          caps.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE) as number;
          caps.maxDrawBuffers = 1;
          caps.instancedArrays = gl1.getExtension('ANGLE_instanced_arrays') !== null;
          caps.estimatedVRAM = 512;
          caps.deviceTier = 'low';
          const lc = gl1.getExtension('WEBGL_lose_context');
          if (lc) lc.loseContext();
        }
      }
      testCanvas.remove();
    }
    return caps;
  }

  private resolvePlayerName(): string {
    const urlParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlParams.get('name');
    if (nameFromUrl) return nameFromUrl;
    return ENV.defaultPlayerName;
  }

  private handleResize = (): void => { this.engine.resize(); };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.multiplayerClient.disconnect();
    this.gameLoop.stop();
    this.inputController.dispose();
    this.cameraController.dispose();
    this.playerController.dispose();
    this.chatController.dispose();
    this.hud.dispose();
    this.devPanel.dispose();
    this.minimap.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
