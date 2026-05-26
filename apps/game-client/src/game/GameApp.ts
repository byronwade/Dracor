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
import { SettingsManager } from '../systems/SettingsManager';
import { AudioManager } from '../systems/AudioManager';
import { createGameHud, type GameHud } from '../ui/createGameHud';
import { createDevPanel, type DevPanel } from '../ui/createDevPanel';
import { createMinimap, type Minimap } from '../ui/createMinimap';
import { createMainMenu, type MainMenu } from '../ui/createMainMenu';
import { createPauseMenu, type PauseMenu } from '../ui/createPauseMenu';
import { createSettingsPanel, type SettingsPanel } from '../ui/createSettingsPanel';
import { createLoadingScreen, type LoadingScreen } from '../ui/createLoadingScreen';
import type { AtmosphereEngine } from '@dracor/atmosphere';
import type { BabylonAtmosphereRenderer } from '../atmosphere/BabylonAtmosphereRenderer';

export class GameApp {
  private engine!: Engine;
  private scene!: Scene;
  private quality!: QualitySettings;
  private sceneResult!: SceneBuildResult;
  private atmosphereEngine: AtmosphereEngine | null = null;
  private atmosphereRenderer: BabylonAtmosphereRenderer | null = null;
  private inputController!: InputController;
  private playerController!: PlayerController;
  private cameraController!: CameraController;
  private multiplayerClient!: MultiplayerClient;
  private chatController!: ChatController;
  private gameLoop!: GameLoop;
  private settings!: SettingsManager;
  private audio!: AudioManager;
  private hud!: GameHud;
  private devPanel!: DevPanel;
  private minimap!: Minimap;
  private mainMenu!: MainMenu;
  private pauseMenu!: PauseMenu;
  private settingsPanel!: SettingsPanel;
  private loadingScreen!: LoadingScreen;
  private playerName: string;
  private characterId: string | null;
  private userId: string | null;
  private characterWeapon: string;
  private characterMemory: string;
  private characterLevel: number;
  private characterRace: string;
  private worldEntered = false;

  constructor(private canvas: HTMLCanvasElement) {
    const params = new URLSearchParams(window.location.search);
    this.playerName = params.get('name') || ENV.defaultPlayerName;
    this.characterId = params.get('characterId');
    this.userId = params.get('userId');
    this.characterWeapon = params.get('weapon') || 'blade';
    this.characterMemory = params.get('memory') || 'ember';
    this.characterLevel = parseInt(params.get('level') || '1', 10) || 1;
    this.characterRace = params.get('race') || 'dracor';
  }

  async start(): Promise<void> {
    console.log('[GameApp] Starting...');
    console.log(`[GameApp] Canvas: ${this.canvas.id}, ${this.canvas.width}x${this.canvas.height}`);
    console.log(`[GameApp] Player: ${this.playerName}, race: ${this.characterRace}, weapon: ${this.characterWeapon}`);

    this.loadingScreen = createLoadingScreen();
    this.loadingScreen.updateStatus('Detecting hardware...');
    this.loadingScreen.updateProgress(5);

    this.settings = new SettingsManager();
    this.audio = new AudioManager(this.settings);

    const caps = await this.detectCapabilities();
    this.loadingScreen.updateStatus('Creating engine...');
    this.loadingScreen.updateProgress(15);

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });

    const autoTier = autoSelectQuality(caps);
    const tier = autoTier;
    this.quality = getQualitySettings(tier);
    this.settings.set('qualityTier', tier);
    console.log(`[Game] Quality tier: ${tier} (WebGPU: ${caps.webgpu}, WebGL2: ${caps.webgl2})`);

    this.loadingScreen.updateStatus('Loading terrain...');
    this.loadingScreen.updateProgress(25);

    const builder = getSceneBuilder('ironvale_outskirts');
    this.sceneResult = await builder(this.engine, this.quality);
    this.scene = this.sceneResult.scene;
    this.atmosphereEngine = this.sceneResult.atmosphereEngine;
    this.atmosphereRenderer = this.sceneResult.atmosphereRenderer;

    this.loadingScreen.updateStatus('Spawning player...');
    this.loadingScreen.updateProgress(60);

    this.inputController = new InputController();
    this.inputController.attachCanvas(this.canvas);

    const spawn = { x: 0, y: 0, z: 10 };
    this.playerController = new PlayerController(
      this.scene,
      spawn.x,
      spawn.y,
      spawn.z,
      this.sceneResult.getHeightAt,
      {
        race: this.characterRace,
        weapon: this.characterWeapon,
        memory: this.characterMemory,
      }
    );

    this.cameraController = new CameraController(
      this.scene,
      this.playerController.getMesh(),
      this.sceneResult.getHeightAt
    );

    this.loadingScreen.updateStatus('Preparing interface...');
    this.loadingScreen.updateProgress(80);

    this.hud = createGameHud();
    this.hud.setPlayerName(this.playerName);
    this.hud.setZoneName('Ironvale Outskirts');
    this.hud.setHealth(100, 100);

    this.devPanel = createDevPanel(this.engine, this.scene, this.quality);
    this.devPanel.setQualityTier(tier);
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
      this.chatController.addSelfMessage(displayName, content);
    });

    this.multiplayerClient.onPlayerCount(() => {
      this.chatController.updatePlayerList(this.multiplayerClient.getOnlinePlayerNames());
    });

    this.settingsPanel = createSettingsPanel(this.settings, () => {
      this.settingsPanel.close();
    });

    this.pauseMenu = createPauseMenu(this.settings, {
      onResume: () => { this.pauseMenu.close(); },
      onSettings: () => { this.settingsPanel.open(); },
      onReturnToSite: () => { window.open(ENV.siteUrl, '_blank'); },
    });

    this.settings.onChange((s) => { this.applySettings(s); });

    this.loadingScreen.updateStatus('Starting game loop...');
    this.loadingScreen.updateProgress(95);

    this.gameLoop = new GameLoop(this.engine, this.scene, (dt) => {
      this.update(dt);
    });
    this.gameLoop.start();

    window.addEventListener('resize', this.handleResize);

    this.loadingScreen.updateProgress(100);
    this.loadingScreen.hide();

    this.mainMenu = createMainMenu(this.playerName, {
      onEnterWorld: () => { this.enterWorld(); },
      onSettings: () => { this.settingsPanel.open(); },
    });

    this.applySettings(this.settings.get());
    this.enterWorld();
  }

  private enterWorld(): void {
    if (this.worldEntered) return;
    this.worldEntered = true;
    this.mainMenu.hide();
    this.audio.startAmbient();
    this.connectToServer();
    console.log('[GameApp] World entered — click the 3D canvas to capture mouse, or right-click+drag to orbit');
  }

  private applySettings(s: ReturnType<SettingsManager['get']>): void {
    const minimapEl = document.getElementById('minimap-container');
    if (minimapEl) minimapEl.style.display = s.showMinimap ? 'block' : 'none';
    const hudEl = document.getElementById('game-hud');
    if (hudEl) hudEl.style.display = s.showHud ? 'flex' : 'none';
  }

  private update(dt: number): void {
    if (!this.worldEntered) return;

    const menuOpen = this.pauseMenu.isOpen() || this.settingsPanel.isOpen();
    const mouse = this.inputController.consumeMouse();

    if (!menuOpen) {
      this.cameraController.setPlayerState(
        this.playerController.isMoving(),
        this.playerController.getYaw(),
        this.playerController.isSprinting()
      );
      this.cameraController.update(mouse, dt);
      this.playerController.setCameraYaw(this.cameraController.getCameraYaw());
      const input = this.inputController.getInput();
      this.playerController.update(input, dt);
    }

    if (this.atmosphereEngine && this.atmosphereRenderer) {
      this.atmosphereEngine.update(dt);
      this.atmosphereRenderer.update(this.atmosphereEngine.getState());
    }
    this.sceneResult.updateWind(dt);

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
        {
          name: this.playerName,
          characterId: this.characterId || undefined,
          userId: this.userId || undefined,
          weapon: this.characterWeapon,
          memory: this.characterMemory,
          level: this.characterLevel,
          race: this.characterRace,
        },
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

  private handleResize = (): void => { this.engine.resize(); };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.multiplayerClient.disconnect();
    this.gameLoop.stop();
    this.inputController.dispose();
    this.cameraController.dispose();
    this.playerController.dispose();
    this.chatController.dispose();
    this.audio.dispose();
    this.hud.dispose();
    this.devPanel.dispose();
    this.minimap.dispose();
    this.mainMenu.dispose();
    this.pauseMenu.dispose();
    this.settingsPanel.dispose();
    this.loadingScreen.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
