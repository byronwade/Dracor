import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';

import { loadZoneFromManifest, type ZoneLoadResult } from '../world/loadZoneFromManifest';

// ─── Locally-embedded types (from workspace packages, not imported at runtime) ───

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  tier: QualityTier;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  shadowMapSize: number;
  textureResolution: number;
  foliageDensity: number;
  maxRenderDistance: number;
  postProcessingEnabled: boolean;
  particleDensity: number;
  targetFps: number;
  terrainChunkRadius: number;
  lodBias: number;
  ssaoEnabled: boolean;
  bloomEnabled: boolean;
}

export interface RendererCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  webgl1: boolean;
  maxTextureSize: number;
  maxDrawBuffers: number;
  floatTextures: boolean;
  instancedArrays: boolean;
  deviceTier: 'low' | 'mid' | 'high';
  estimatedVRAM: number;
}

export interface TerrainChunkDef {
  id: string;
  gridX: number;
  gridZ: number;
  size: number;
  resolution: number;
  heightData: 'flat' | 'procedural' | 'heightmap';
  heightmapUrl?: string;
  lodLevels: number;
}

export interface TerrainDefinition {
  chunks: TerrainChunkDef[];
  materialId: string;
  heightScale: number;
  baseElevation: number;
}

export interface FoliageGroup {
  id: string;
  type: 'tree_pine' | 'tree_dead' | 'tree_broadleaf' | 'bush' | 'grass_tall' | 'grass_short' | 'fern' | 'flower';
  modelId: string;
  modelFile?: string;
  modelVariant?: string;
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
  density: number;
  lodDistance: number;
  castShadow: boolean;
  maxSlope: number;
  alignToSlope: boolean;
  exclusionRadii: {
    road: number;
    water: number;
    landmark: number;
    spawn: number;
  };
}

export interface RockGroup {
  id: string;
  type: 'boulder_large' | 'boulder_medium' | 'stone_cluster' | 'cliff_face';
  count: number;
  area: { centerX: number; centerZ: number; radius: number };
  minScale: number;
  maxScale: number;
}

export interface RoadDefinition {
  id: string;
  type: 'cobblestone' | 'dirt' | 'broken_stone';
  points: Array<{ x: number; y: number; z: number }>;
  width: number;
  worn: boolean;
  description: string;
}

export interface LandmarkDefinition {
  id: string;
  type: 'shrine' | 'ruin' | 'monument' | 'bridge' | 'gate' | 'tower';
  name: string;
  position: { x: number; y: number; z: number };
  rotation?: number;
  scale?: number;
  interactable: boolean;
  description: string;
  emissive?: { color: [number, number, number]; intensity: number };
  particles?: string;
}

export interface WaterBodyDefinition {
  id: string;
  type: 'stream' | 'pond' | 'river' | 'puddle';
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number };
  flowDirection?: [number, number];
  opacity: number;
}

export interface SpawnPoint {
  id: string;
  type: 'player' | 'npc' | 'enemy' | 'item' | 'event';
  position: { x: number; y: number; z: number };
  rotation?: number;
  entityId?: string;
  radius?: number;
  maxCount?: number;
  respawnSeconds?: number;
}

export interface ZoneManifest {
  id: string;
  name: string;
  description: string;
  biomeId: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  playerSpawn: { x: number; y: number; z: number; yaw: number };
  terrain: TerrainDefinition;
  foliage: FoliageGroup[];
  rocks: RockGroup[];
  roads: RoadDefinition[];
  landmarks: LandmarkDefinition[];
  water: WaterBodyDefinition[];
  spawns: SpawnPoint[];
  lightingPreset: string;
  fogPreset: string;
  ambientAudio: string[];
  worldEvents: string[];
  performanceTier: string;
}

export interface LightingPreset {
  ambientColor: [number, number, number];
  sunColor: [number, number, number];
  sunDirection: [number, number, number];
  sunIntensity: number;
  ambientIntensity: number;
}

export interface FogPreset {
  mode: 'exp' | 'exp2' | 'linear';
  density: number;
  color: [number, number, number];
}

// ─── Embedded presets ───

const LIGHTING: Record<string, LightingPreset> = {
  ironvale_dusk: {
    ambientColor: [0.15, 0.1, 0.08],
    sunColor: [1.0, 0.7, 0.35],
    sunDirection: [-0.6, -0.3, -0.75],
    sunIntensity: 1.8,
    ambientIntensity: 0.4,
  },
};

const FOG: Record<string, FogPreset> = {
  ironvale_mist: {
    mode: 'exp2',
    density: 0.012,
    color: [0.3, 0.32, 0.38],
  },
};

// ─── Quality presets ───

const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  ultra: {
    tier: 'ultra',
    shadowQuality: 'high',
    shadowMapSize: 2048,
    textureResolution: 2048,
    foliageDensity: 1.0,
    maxRenderDistance: 300,
    postProcessingEnabled: true,
    particleDensity: 1.0,
    targetFps: 60,
    terrainChunkRadius: 5,
    lodBias: 0,
    ssaoEnabled: true,
    bloomEnabled: true,
  },
  high: {
    tier: 'high',
    shadowQuality: 'high',
    shadowMapSize: 1024,
    textureResolution: 1024,
    foliageDensity: 0.7,
    maxRenderDistance: 200,
    postProcessingEnabled: true,
    particleDensity: 0.8,
    targetFps: 60,
    terrainChunkRadius: 4,
    lodBias: 0.5,
    ssaoEnabled: true,
    bloomEnabled: true,
  },
  medium: {
    tier: 'medium',
    shadowQuality: 'medium',
    shadowMapSize: 512,
    textureResolution: 512,
    foliageDensity: 0.4,
    maxRenderDistance: 150,
    postProcessingEnabled: false,
    particleDensity: 0.5,
    targetFps: 45,
    terrainChunkRadius: 3,
    lodBias: 1.0,
    ssaoEnabled: false,
    bloomEnabled: false,
  },
  low: {
    tier: 'low',
    shadowQuality: 'low',
    shadowMapSize: 256,
    textureResolution: 256,
    foliageDensity: 0.2,
    maxRenderDistance: 100,
    postProcessingEnabled: false,
    particleDensity: 0.3,
    targetFps: 30,
    terrainChunkRadius: 2,
    lodBias: 2.0,
    ssaoEnabled: false,
    bloomEnabled: false,
  },
};

export function getQualitySettings(tier: QualityTier): QualitySettings {
  return { ...QUALITY_PRESETS[tier] };
}

export function autoSelectQuality(caps: RendererCapabilities): QualityTier {
  if (caps.webgpu) return 'ultra';
  if (caps.deviceTier === 'high') return 'high';
  if (caps.deviceTier === 'mid') return 'medium';
  return 'low';
}

// ─── Embedded Zone Manifest ───

const IRONVALE_OUTSKIRTS: ZoneManifest = {
  id: 'ironvale_outskirts',
  name: 'Ironvale Outskirts',
  description:
    'A dark fantasy frontier just outside the walls of Ironvale.',
  biomeId: 'dark_pine_frontier',
  bounds: { minX: -250, maxX: 250, minZ: -250, maxZ: 250 },
  playerSpawn: { x: 0, y: 0, z: 10, yaw: 0 },
  terrain: {
    chunks: [
      { id: 'chunk_2_2', gridX: 2, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
    ],
    materialId: 'mat_ironvale_ground',
    heightScale: 30,
    baseElevation: 0,
  },
  foliage: [
    {
      id: 'foliage_fir_a',
      type: 'tree_pine',
      modelId: 'fir_sapling_a',
      modelFile: 'fir_sapling_medium_4k.glb',
      modelVariant: '_a_',
      count: 120,
      area: { centerX: 0, centerZ: 0, radius: 220 },
      minScale: 0.8,
      maxScale: 1.4,
      density: 0.4,
      lodDistance: 120,
      castShadow: true,
      maxSlope: 30,
      alignToSlope: true,
      exclusionRadii: { road: 8, water: 6, landmark: 12, spawn: 10 },
    },
    {
      id: 'foliage_fir_b',
      type: 'tree_pine',
      modelId: 'fir_sapling_b',
      modelFile: 'fir_sapling_medium_4k.glb',
      modelVariant: '_b_',
      count: 100,
      area: { centerX: -60, centerZ: 40, radius: 200 },
      minScale: 0.7,
      maxScale: 1.3,
      density: 0.35,
      lodDistance: 120,
      castShadow: true,
      maxSlope: 30,
      alignToSlope: true,
      exclusionRadii: { road: 8, water: 6, landmark: 12, spawn: 10 },
    },
    {
      id: 'foliage_fir_c',
      type: 'tree_pine',
      modelId: 'fir_sapling_c',
      modelFile: 'fir_sapling_medium_4k.glb',
      modelVariant: '_c_',
      count: 80,
      area: { centerX: 50, centerZ: -40, radius: 180 },
      minScale: 0.9,
      maxScale: 1.5,
      density: 0.3,
      lodDistance: 100,
      castShadow: true,
      maxSlope: 25,
      alignToSlope: true,
      exclusionRadii: { road: 10, water: 8, landmark: 15, spawn: 10 },
    },
    {
      id: 'foliage_tall_grass',
      type: 'grass_tall',
      modelId: 'grass_tall_patch',
      count: 500,
      area: { centerX: 0, centerZ: 0, radius: 50 },
      minScale: 0.6,
      maxScale: 1.0,
      density: 0.9,
      lodDistance: 40,
      castShadow: false,
      maxSlope: 40,
      alignToSlope: false,
      exclusionRadii: { road: 3, water: 2, landmark: 5, spawn: 4 },
    },
    {
      id: 'foliage_bushes_edge',
      type: 'bush',
      modelId: 'bush_01',
      count: 80,
      area: { centerX: 40, centerZ: -30, radius: 180 },
      minScale: 0.5,
      maxScale: 1.2,
      density: 0.35,
      lodDistance: 60,
      castShadow: true,
      maxSlope: 35,
      alignToSlope: false,
      exclusionRadii: { road: 5, water: 4, landmark: 8, spawn: 6 },
    },
  ],
  rocks: [
    {
      id: 'rocks_large_boulders',
      type: 'boulder_large',
      count: 15,
      area: { centerX: -60, centerZ: 80, radius: 200 },
      minScale: 1.0,
      maxScale: 2.5,
    },
    {
      id: 'rocks_medium_stones',
      type: 'boulder_medium',
      count: 40,
      area: { centerX: 0, centerZ: 0, radius: 230 },
      minScale: 0.5,
      maxScale: 1.5,
    },
    {
      id: 'rocks_cliff_face',
      type: 'cliff_face',
      count: 5,
      area: { centerX: -180, centerZ: -120, radius: 60 },
      minScale: 2.0,
      maxScale: 4.0,
    },
  ],
  roads: [
    {
      id: 'road_main_cobblestone',
      type: 'broken_stone',
      points: [
        { x: -220, y: 0.1, z: -200 },
        { x: -160, y: 0.2, z: -140 },
        { x: -100, y: 0.3, z: -80 },
        { x: -40, y: 0.2, z: -20 },
        { x: 10, y: 0.1, z: 30 },
        { x: 60, y: 0.3, z: 90 },
        { x: 120, y: 0.4, z: 140 },
        { x: 170, y: 0.3, z: 180 },
        { x: 220, y: 0.2, z: 220 },
      ],
      width: 4.5,
      worn: true,
      description: 'An ancient cobblestone road, cracked and overtaken by roots.',
    },
  ],
  landmarks: [
    {
      id: 'landmark_dracor_shrine',
      type: 'shrine',
      name: 'Dracor Memory Shrine',
      position: { x: 30, y: 0.5, z: 50 },
      rotation: 45,
      scale: 1.2,
      interactable: true,
      description: 'A weathered stone shrine engraved with draconic runes.',
      emissive: { color: [1.0, 0.55, 0.1], intensity: 2.5 },
      particles: 'ember_rise',
    },
    {
      id: 'landmark_ruined_gate',
      type: 'gate',
      name: 'Ruined Frontier Gate',
      position: { x: -40, y: 0.2, z: -20 },
      rotation: -15,
      scale: 1.0,
      interactable: false,
      description: 'The crumbling remains of a stone gateway.',
    },
    {
      id: 'landmark_old_bridge',
      type: 'bridge',
      name: 'Ashwood Crossing',
      position: { x: 100, y: -0.5, z: 120 },
      rotation: 30,
      scale: 1.0,
      interactable: false,
      description: 'A narrow stone bridge spanning a shallow stream.',
    },
  ],
  water: [
    {
      id: 'water_pine_stream',
      type: 'stream',
      position: { x: 90, y: -1.0, z: 110 },
      size: { width: 5, depth: 80 },
      flowDirection: [0.3, 0.95],
      opacity: 0.6,
    },
  ],
  spawns: [
    { id: 'spawn_player_start', type: 'player', position: { x: 0, y: 0, z: 10 }, rotation: 0 },
  ],
  lightingPreset: 'ironvale_dusk',
  fogPreset: 'ironvale_mist',
  ambientAudio: ['wind_pine', 'distant_wolves', 'crackling_ember'],
  worldEvents: ['shrine_pulse', 'wolf_pack_patrol'],
  performanceTier: 'medium',
};

// ─── Scene Builder ───

import { DayNightCycle } from '../systems/DayNightCycle';

export interface IronvaleSceneResult {
  scene: Scene;
  getHeightAt: (x: number, z: number) => number;
  dayNight: DayNightCycle;
  updateWind: (dt: number) => void;
}

/**
 * Build the complete Ironvale Outskirts scene.
 */
export async function buildIronvaleOutskirtsScene(
  engine: Engine,
  quality: QualitySettings
): Promise<IronvaleSceneResult> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.015, 0.03, 1.0);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new Color3(0.3, 0.32, 0.38);
  scene.ambientColor = new Color3(0.1, 0.1, 0.12);

  const dayNight = new DayNightCycle(scene, quality, 0.38);

  const zoneResult = await loadZoneFromManifest(IRONVALE_OUTSKIRTS, scene, quality);

  dayNight.bindSky(zoneResult.sky.skyMat, zoneResult.sky.horizonMat);

  createTownLights(scene, zoneResult.terrain.getHeightAt);

  if (quality.postProcessingEnabled) {
    setupPostProcessing(scene, quality, dayNight);
  }

  return {
    scene,
    getHeightAt: zoneResult.terrain.getHeightAt,
    dayNight,
    updateWind: zoneResult.updateWind,
  };
}

function createTownLights(scene: Scene, getHeightAt: (x: number, z: number) => number): void {
  const townPositions = [
    { x: -30, z: -80 },
    { x: -10, z: -90 },
    { x: 15, z: -85 },
    { x: 40, z: -75 },
    { x: -50, z: -95 },
  ];

  for (let i = 0; i < townPositions.length; i++) {
    const p = townPositions[i];
    const y = getHeightAt(p.x, p.z) + 2.5;
    const light = new PointLight(
      `townLight_${i}`,
      new Vector3(p.x, y, p.z),
      scene
    );
    light.intensity = 0.6;
    light.diffuse = new Color3(1.0, 0.75, 0.35);
    light.range = 20;
  }
}

function setupPostProcessing(scene: Scene, quality: QualitySettings, dayNight: DayNightCycle): void {
  scene.onActiveCameraChanged.addOnce(() => {
    const camera = scene.activeCamera;
    if (!camera) return;

    const pipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      true,
      scene,
      [camera]
    );

    pipeline.bloomEnabled = quality.bloomEnabled;
    if (quality.bloomEnabled) {
      pipeline.bloomThreshold = 0.7;
      pipeline.bloomWeight = 0.35;
      pipeline.bloomKernel = 64;
    }

    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = 1;
    pipeline.imageProcessing.exposure = 1.0;
    pipeline.imageProcessing.contrast = 1.05;

    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 1.8;
    pipeline.imageProcessing.vignetteCameraFov = 0.5;

    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 6;
    pipeline.grain.animated = true;

    pipeline.chromaticAberrationEnabled = quality.tier === 'ultra';
    if (pipeline.chromaticAberrationEnabled) {
      pipeline.chromaticAberration.aberrationAmount = 15;
      pipeline.chromaticAberration.radialIntensity = 0.5;
    }

    dayNight.bindPipeline(pipeline);
  });
}
