import type { TerrainChunkDef } from './TerrainChunk';
import type { FoliageGroup, RockGroup } from './FoliageDefinition';
import type { RoadDefinition } from './RoadDefinition';
import type { LandmarkDefinition } from './LandmarkDefinition';
import type { WaterBodyDefinition } from './WaterDefinition';
import type { SpawnPoint } from './SpawnPoint';

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

export interface TerrainDefinition {
  chunks: TerrainChunkDef[];
  materialId: string;
  heightScale: number;
  baseElevation: number;
}
