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
import { createPerformancePanel, type PerformancePanel } from '../ui/createPerformancePanel';
import { createConnectionStatus, type ConnectionStatusUI } from '../ui/createConnectionStatus';

/**
 * Main game orchestrator.
 * Wires together engine, scene, input, player, camera, networking, chat, and UI.
 */
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
  private perfPanel!: PerformancePanel;
  private connectionUI!: ConnectionStatusUI;
  private playerName: string;

  constructor(private canvas: HTMLCanvasElement) {
    this.playerName = this.resolvePlayerName();
  }

  async start(): Promise<void> {
    // 1. Detect renderer capabilities
    const caps = await this.detectCapabilities();

    // 2. Create Babylon Engine (WebGL2 — WebGPU engine creation is more involved)
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });

    // 3. Auto-select quality tier
    const tier = autoSelectQuality(caps);
    this.quality = getQualitySettings(tier);
    console.log(`[Game] Quality tier: ${tier} (WebGPU: ${caps.webgpu}, WebGL2: ${caps.webgl2})`);

    // 4. Build the scene
    const builder = getSceneBuilder('ironvale_outskirts');
    const result: SceneBuildResult = builder(this.engine, this.quality);
    this.scene = result.scene;

    // 5. Create input controller
    this.inputController = new InputController();

    // 6. Create player controller (with character motor + terrain height query)
    const spawn = { x: 0, y: 0, z: 10 }; // Ironvale spawn
    this.playerController = new PlayerController(
      this.scene,
      spawn.x,
      spawn.y,
      spawn.z,
      result.getHeightAt
    );

    // 7. Create camera (follow player)
    this.cameraController = new CameraController(
      this.scene,
      this.playerController.getMesh()
    );

    // 8. Create UI
    this.hud = createGameHud();
    this.hud.setPlayerName(this.playerName);
    this.hud.setZoneName('Ironvale Outskirts');
    this.hud.setHealth(100, 100);

    this.perfPanel = createPerformancePanel(this.engine, this.scene, this.quality);
    this.connectionUI = createConnectionStatus();
    this.connectionUI.setQualityTier(this.quality.tier);

    // 9. Create chat controller
    this.chatController = new ChatController();

    // 10. Create multiplayer client
    this.multiplayerClient = new MultiplayerClient();
    this.playerController.setMultiplayerClient(this.multiplayerClient);

    // Wire connection state to UI
    this.multiplayerClient.onConnectionStateChange((state) => {
      this.connectionUI.setState(state);
      if (state === 'connected') {
        this.connectionUI.setRoomInfo('world_room', 1);
      }
    });

    // Wire incoming chat messages
    this.multiplayerClient.onChat((sender, content) => {
      this.chatController.addMessage(sender, content);
    });

    // Wire outgoing chat messages
    this.chatController.onSend((content) => {
      this.multiplayerClient.sendChat(content);
      this.chatController.addMessage(this.playerName, content);
    });

    // Connect to server (non-blocking)
    this.connectToServer();

    // 11. Start game loop
    this.gameLoop = new GameLoop(this.engine, this.scene, (dt) => {
      this.update(dt);
    });
    this.gameLoop.start();

    // 12. Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private update(dt: number): void {
    // Get input
    const input = this.inputController.getInput();

    // Update player motor
    this.playerController.update(input, dt);

    // Interpolate remote players
    this.multiplayerClient.interpolateRemotePlayers();

    // Update perf panel
    this.perfPanel.update();
  }

  private async connectToServer(): Promise<void> {
    try {
      await this.multiplayerClient.connect(
        ENV.gameServerUrl,
        this.playerName,
        this.scene
      );
      this.chatController.addSystemMessage(`Connected as "${this.playerName}".`);
      console.log(`[Game] Connected to server as "${this.playerName}"`);
    } catch {
      this.chatController.addSystemMessage('Running in offline mode.');
      console.log('[Game] Running in offline mode');
    }
  }

  private async detectCapabilities(): Promise<RendererCapabilities> {
    const caps: RendererCapabilities = {
      webgpu: false,
      webgl2: false,
      webgl1: false,
      maxTextureSize: 0,
      maxDrawBuffers: 0,
      floatTextures: false,
      instancedArrays: false,
      deviceTier: 'low',
      estimatedVRAM: 0,
    };

    // Probe WebGPU
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
      } catch {
        // WebGPU not available
      }
    }

    // Probe WebGL2 (only if WebGPU didn't give us texture info)
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

        // Determine tier
        if (caps.floatTextures && caps.maxTextureSize >= 8192) {
          caps.deviceTier = 'high';
        } else if (caps.maxTextureSize >= 4096) {
          caps.deviceTier = 'mid';
        }

        const loseCtx = gl2.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
      } else {
        // WebGL1 fallback
        const gl1 = testCanvas.getContext('webgl');
        if (gl1) {
          caps.webgl1 = true;
          caps.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE) as number;
          caps.maxDrawBuffers = 1;
          caps.instancedArrays = gl1.getExtension('ANGLE_instanced_arrays') !== null;
          caps.estimatedVRAM = 512;
          caps.deviceTier = 'low';

          const loseCtx = gl1.getExtension('WEBGL_lose_context');
          if (loseCtx) loseCtx.loseContext();
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

  private handleResize = (): void => {
    this.engine.resize();
  };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.multiplayerClient.disconnect();
    this.gameLoop.stop();
    this.inputController.dispose();
    this.cameraController.dispose();
    this.playerController.dispose();
    this.chatController.dispose();
    this.hud.dispose();
    this.perfPanel.dispose();
    this.connectionUI.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
