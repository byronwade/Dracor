import type { ZoneManifest } from '@dracor/world-data';
import type { FullAssetManifest } from '../types/AssetManifest';
import { MAX_ZONE_SIZE_MB } from '../constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_SPAWN_TYPES = ['player', 'npc', 'enemy', 'item', 'event'] as const;
const VALID_FOLIAGE_TYPES = ['tree_pine', 'tree_dead', 'bush', 'grass_tall', 'grass_short', 'fern', 'flower'] as const;
const VALID_ROCK_TYPES = ['boulder_large', 'boulder_medium', 'stone_cluster', 'cliff_face'] as const;
const VALID_ROAD_TYPES = ['cobblestone', 'dirt', 'broken_stone'] as const;
const VALID_LANDMARK_TYPES = ['shrine', 'ruin', 'monument', 'bridge', 'gate', 'tower'] as const;
const VALID_WATER_TYPES = ['stream', 'pond', 'river', 'puddle'] as const;
const VALID_ASSET_TYPES = ['mesh_glb', 'mesh_gltf', 'texture_png', 'texture_ktx2', 'texture_basis', 'audio_ogg', 'audio_mp3', 'heightmap'] as const;

function collectIds(items: Array<{ id: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  return counts;
}

function findDuplicateIds(items: Array<{ id: string }>, label: string, errors: string[]): void {
  const counts = collectIds(items);
  for (const [id, count] of counts) {
    if (count > 1) {
      errors.push(`Duplicate ${label} id: "${id}" appears ${count} times`);
    }
  }
}

export function validateZoneManifest(manifest: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not an object'], warnings: [] };
  }

  // Required string fields
  const requiredStrings = ['id', 'name', 'description', 'biomeId', 'lightingPreset', 'fogPreset', 'performanceTier'];
  for (const field of requiredStrings) {
    if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
      errors.push(`Missing or empty required string field: "${field}"`);
    }
  }

  // Bounds validation
  if (!manifest.bounds || typeof manifest.bounds !== 'object') {
    errors.push('Missing "bounds" object');
  } else {
    const { minX, maxX, minZ, maxZ } = manifest.bounds;
    if (typeof minX !== 'number' || typeof maxX !== 'number' || typeof minZ !== 'number' || typeof maxZ !== 'number') {
      errors.push('Bounds must have numeric minX, maxX, minZ, maxZ');
    } else {
      if (minX >= maxX) {
        errors.push(`Bounds minX (${minX}) must be less than maxX (${maxX})`);
      }
      if (minZ >= maxZ) {
        errors.push(`Bounds minZ (${minZ}) must be less than maxZ (${maxZ})`);
      }
      const width = maxX - minX;
      const depth = maxZ - minZ;
      if (width > 10000 || depth > 10000) {
        warnings.push(`Zone bounds are very large (${width}x${depth}). Consider splitting into multiple zones.`);
      }
    }
  }

  // Player spawn validation
  if (!manifest.playerSpawn || typeof manifest.playerSpawn !== 'object') {
    errors.push('Missing "playerSpawn" object');
  } else {
    const { x, y, z } = manifest.playerSpawn;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      errors.push('playerSpawn must have numeric x, y, z');
    } else if (manifest.bounds) {
      const { minX, maxX, minZ, maxZ } = manifest.bounds;
      if (x < minX || x > maxX || z < minZ || z > maxZ) {
        warnings.push('playerSpawn position is outside zone bounds');
      }
    }
  }

  // Terrain validation
  if (!manifest.terrain || typeof manifest.terrain !== 'object') {
    errors.push('Missing "terrain" object');
  } else {
    if (typeof manifest.terrain.materialId !== 'string' || manifest.terrain.materialId.length === 0) {
      errors.push('Terrain missing materialId');
    }
    if (typeof manifest.terrain.heightScale !== 'number') {
      errors.push('Terrain missing numeric heightScale');
    }
    if (typeof manifest.terrain.baseElevation !== 'number') {
      errors.push('Terrain missing numeric baseElevation');
    }
    if (!Array.isArray(manifest.terrain.chunks) || manifest.terrain.chunks.length === 0) {
      errors.push('Terrain must have at least one chunk');
    } else {
      findDuplicateIds(manifest.terrain.chunks, 'terrain chunk', errors);
      for (const chunk of manifest.terrain.chunks) {
        if (typeof chunk.id !== 'string' || chunk.id.length === 0) {
          errors.push('Terrain chunk missing id');
        }
        if (typeof chunk.gridX !== 'number' || typeof chunk.gridZ !== 'number') {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" missing numeric gridX/gridZ`);
        }
        if (typeof chunk.size !== 'number' || chunk.size <= 0) {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" must have positive size`);
        }
        if (typeof chunk.resolution !== 'number' || chunk.resolution <= 0) {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" must have positive resolution`);
        }
        const validHeightData = ['flat', 'procedural', 'heightmap'];
        if (!validHeightData.includes(chunk.heightData)) {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" has invalid heightData: "${chunk.heightData}"`);
        }
        if (chunk.heightData === 'heightmap' && (typeof chunk.heightmapUrl !== 'string' || chunk.heightmapUrl.length === 0)) {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" uses heightmap but is missing heightmapUrl`);
        }
        if (typeof chunk.lodLevels !== 'number' || chunk.lodLevels < 1) {
          errors.push(`Terrain chunk "${chunk.id ?? '?'}" must have at least 1 LOD level`);
        }
      }
    }
  }

  // Foliage validation
  if (!Array.isArray(manifest.foliage)) {
    errors.push('Missing "foliage" array');
  } else {
    findDuplicateIds(manifest.foliage, 'foliage group', errors);
    for (const group of manifest.foliage) {
      if (typeof group.id !== 'string' || group.id.length === 0) {
        errors.push('Foliage group missing id');
      }
      if (!(VALID_FOLIAGE_TYPES as readonly string[]).includes(group.type)) {
        errors.push(`Foliage group "${group.id ?? '?'}" has invalid type: "${group.type}"`);
      }
      if (typeof group.count !== 'number' || group.count < 0) {
        errors.push(`Foliage group "${group.id ?? '?'}" must have non-negative count`);
      }
      if (!group.area || typeof group.area.centerX !== 'number' || typeof group.area.centerZ !== 'number' || typeof group.area.radius !== 'number') {
        errors.push(`Foliage group "${group.id ?? '?'}" missing valid area (centerX, centerZ, radius)`);
      }
    }
  }

  // Rocks validation
  if (!Array.isArray(manifest.rocks)) {
    errors.push('Missing "rocks" array');
  } else {
    findDuplicateIds(manifest.rocks, 'rock group', errors);
    for (const group of manifest.rocks) {
      if (typeof group.id !== 'string' || group.id.length === 0) {
        errors.push('Rock group missing id');
      }
      if (!(VALID_ROCK_TYPES as readonly string[]).includes(group.type)) {
        errors.push(`Rock group "${group.id ?? '?'}" has invalid type: "${group.type}"`);
      }
      if (typeof group.count !== 'number' || group.count < 0) {
        errors.push(`Rock group "${group.id ?? '?'}" must have non-negative count`);
      }
    }
  }

  // Roads validation
  if (!Array.isArray(manifest.roads)) {
    errors.push('Missing "roads" array');
  } else {
    findDuplicateIds(manifest.roads, 'road', errors);
    for (const road of manifest.roads) {
      if (typeof road.id !== 'string' || road.id.length === 0) {
        errors.push('Road missing id');
      }
      if (!(VALID_ROAD_TYPES as readonly string[]).includes(road.type)) {
        errors.push(`Road "${road.id ?? '?'}" has invalid type: "${road.type}"`);
      }
      if (!Array.isArray(road.points) || road.points.length < 2) {
        errors.push(`Road "${road.id ?? '?'}" must have at least 2 points`);
      } else {
        for (let i = 0; i < road.points.length; i++) {
          const pt = road.points[i];
          if (typeof pt.x !== 'number' || typeof pt.y !== 'number' || typeof pt.z !== 'number') {
            errors.push(`Road "${road.id ?? '?'}" point ${i} must have numeric x, y, z`);
          }
        }
      }
      if (typeof road.width !== 'number' || road.width <= 0) {
        errors.push(`Road "${road.id ?? '?'}" must have positive width`);
      }
    }
  }

  // Landmarks validation
  if (!Array.isArray(manifest.landmarks)) {
    errors.push('Missing "landmarks" array');
  } else {
    findDuplicateIds(manifest.landmarks, 'landmark', errors);
    for (const lm of manifest.landmarks) {
      if (typeof lm.id !== 'string' || lm.id.length === 0) {
        errors.push('Landmark missing id');
      }
      if (!(VALID_LANDMARK_TYPES as readonly string[]).includes(lm.type)) {
        errors.push(`Landmark "${lm.id ?? '?'}" has invalid type: "${lm.type}"`);
      }
      if (typeof lm.name !== 'string' || lm.name.length === 0) {
        errors.push(`Landmark "${lm.id ?? '?'}" missing name`);
      }
      if (!lm.position || typeof lm.position.x !== 'number' || typeof lm.position.y !== 'number' || typeof lm.position.z !== 'number') {
        errors.push(`Landmark "${lm.id ?? '?'}" missing valid position`);
      }
      if (typeof lm.interactable !== 'boolean') {
        errors.push(`Landmark "${lm.id ?? '?'}" missing boolean interactable field`);
      }
    }
  }

  // Water validation
  if (!Array.isArray(manifest.water)) {
    errors.push('Missing "water" array');
  } else {
    findDuplicateIds(manifest.water, 'water body', errors);
    for (const wb of manifest.water) {
      if (typeof wb.id !== 'string' || wb.id.length === 0) {
        errors.push('Water body missing id');
      }
      if (!(VALID_WATER_TYPES as readonly string[]).includes(wb.type)) {
        errors.push(`Water body "${wb.id ?? '?'}" has invalid type: "${wb.type}"`);
      }
      if (!wb.position || typeof wb.position.x !== 'number' || typeof wb.position.y !== 'number' || typeof wb.position.z !== 'number') {
        errors.push(`Water body "${wb.id ?? '?'}" missing valid position`);
      }
      if (!wb.size || typeof wb.size.width !== 'number' || typeof wb.size.depth !== 'number') {
        errors.push(`Water body "${wb.id ?? '?'}" missing valid size`);
      }
      if (typeof wb.opacity !== 'number' || wb.opacity < 0 || wb.opacity > 1) {
        errors.push(`Water body "${wb.id ?? '?'}" opacity must be between 0 and 1`);
      }
    }
  }

  // Spawns validation
  if (!Array.isArray(manifest.spawns)) {
    errors.push('Missing "spawns" array');
  } else {
    findDuplicateIds(manifest.spawns, 'spawn point', errors);
    let playerSpawnCount = 0;
    for (const sp of manifest.spawns) {
      if (typeof sp.id !== 'string' || sp.id.length === 0) {
        errors.push('Spawn point missing id');
      }
      if (!(VALID_SPAWN_TYPES as readonly string[]).includes(sp.type)) {
        errors.push(`Spawn point "${sp.id ?? '?'}" has invalid type: "${sp.type}"`);
      }
      if (!sp.position || typeof sp.position.x !== 'number' || typeof sp.position.y !== 'number' || typeof sp.position.z !== 'number') {
        errors.push(`Spawn point "${sp.id ?? '?'}" missing valid position`);
      }
      if (sp.type === 'player') {
        playerSpawnCount++;
      }
      if (sp.type === 'enemy') {
        if (typeof sp.entityId !== 'string' || sp.entityId.length === 0) {
          warnings.push(`Enemy spawn "${sp.id ?? '?'}" has no entityId`);
        }
        if (typeof sp.respawnSeconds === 'number' && sp.respawnSeconds < 0) {
          errors.push(`Spawn point "${sp.id ?? '?'}" respawnSeconds must be non-negative`);
        }
      }
    }
    if (playerSpawnCount === 0) {
      warnings.push('Zone has no player spawn points');
    }
    if (playerSpawnCount > 1) {
      warnings.push(`Zone has ${playerSpawnCount} player spawn points. Usually only one is expected.`);
    }
  }

  // Arrays that should be string arrays
  if (!Array.isArray(manifest.ambientAudio)) {
    errors.push('Missing "ambientAudio" array');
  }
  if (!Array.isArray(manifest.worldEvents)) {
    errors.push('Missing "worldEvents" array');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAssetManifest(manifest: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not an object'], warnings: [] };
  }

  // Required fields
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    errors.push('Missing or empty "version"');
  }
  if (typeof manifest.zoneId !== 'string' || manifest.zoneId.length === 0) {
    errors.push('Missing or empty "zoneId"');
  }
  if (typeof manifest.totalSizeMB !== 'number' || manifest.totalSizeMB < 0) {
    errors.push('"totalSizeMB" must be a non-negative number');
  }

  // Entries validation
  if (!Array.isArray(manifest.entries)) {
    errors.push('Missing "entries" array');
  } else {
    findDuplicateIds(manifest.entries, 'asset entry', errors);

    let computedTotalSize = 0;

    for (const entry of manifest.entries) {
      if (typeof entry.id !== 'string' || entry.id.length === 0) {
        errors.push('Asset entry missing id');
        continue;
      }
      if (!(VALID_ASSET_TYPES as readonly string[]).includes(entry.type)) {
        errors.push(`Asset entry "${entry.id}" has invalid type: "${entry.type}"`);
      }
      if (typeof entry.path !== 'string' || entry.path.length === 0) {
        errors.push(`Asset entry "${entry.id}" missing path`);
      }
      if (typeof entry.sizeMB !== 'number' || entry.sizeMB < 0) {
        errors.push(`Asset entry "${entry.id}" must have non-negative sizeMB`);
      } else {
        computedTotalSize += entry.sizeMB;
      }
      if (typeof entry.compressed !== 'boolean') {
        errors.push(`Asset entry "${entry.id}" missing boolean "compressed" field`);
      }
      if (!Array.isArray(entry.tags)) {
        errors.push(`Asset entry "${entry.id}" missing "tags" array`);
      }
    }

    if (typeof manifest.totalSizeMB === 'number' && manifest.entries.length > 0) {
      const difference = Math.abs(computedTotalSize - manifest.totalSizeMB);
      if (difference > 0.5) {
        warnings.push(
          `Declared totalSizeMB (${manifest.totalSizeMB}) differs from sum of entry sizes (${computedTotalSize.toFixed(2)}) by ${difference.toFixed(2)} MB`
        );
      }
    }

    if (typeof manifest.totalSizeMB === 'number' && manifest.totalSizeMB > MAX_ZONE_SIZE_MB) {
      warnings.push(`Total asset size (${manifest.totalSizeMB} MB) exceeds MAX_ZONE_SIZE_MB (${MAX_ZONE_SIZE_MB} MB)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
