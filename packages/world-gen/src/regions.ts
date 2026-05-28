import { type WorldSeed, SeededRNG, hashCombine } from './seed';
import { type BiomeType } from './biomes';
import { HALF_WORLD } from './config';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface RegionDefinition {
  id: string;
  name: string;
  centerX: number;
  centerZ: number;
  radius: number;
  dominantBiome: BiomeType;
  dangerLevel: number;    // 1-10
  isStarterZone: boolean;
  colorPalette: string;   // 'autumn' | 'dark' | 'tropical' | 'frozen' | 'arid' | 'verdant' | 'volcanic' | 'murky'
  weatherProfile: string; // 'rainy' | 'dry' | 'stormy' | 'calm' | 'snowy' | 'misty' | 'windy'
}

export interface PointOfInterest {
  id: string;
  name: string;
  type: 'town' | 'city' | 'village' | 'fortress' | 'port' | 'mine' | 'dungeon' | 'shrine' | 'ruin' | 'camp' | 'tower' | 'cave' | 'bridge' | 'crossroads';
  worldX: number;
  worldZ: number;
  regionId: string;
  dangerLevel: number;
}

export interface RegionSystem {
  regions: RegionDefinition[];
  getRegion: (worldX: number, worldZ: number) => RegionDefinition;
  getPointsOfInterest: (regionId: string) => PointOfInterest[];
  getAllPointsOfInterest: () => PointOfInterest[];
}

// ---------------------------------------------------------------------------
// Themed name word lists
// ---------------------------------------------------------------------------

const BIOME_PREFIXES: Record<string, string[]> = {
  forest:       ['Black', 'Shadow', 'Ancient', 'Whispering', 'Iron', 'Hollow', 'Mossy', 'Gnarled', 'Deepwood', 'Thornwood'],
  dense_forest: ['Black', 'Ancient', 'Hollow', 'Shadow', 'Gnarled', 'Tangled', 'Deepwood', 'Sunless', 'Ironbark', 'Withered'],
  pine_forest:  ['Pinereach', 'Frostpine', 'Snowmantle', 'Duskwood', 'Greypine', 'Coldwood', 'Silverwood', 'Winterveil', 'Ashwood', 'Needlethorn'],
  jungle:       ['Verdant', 'Shimmering', 'Jade', 'Serpent', 'Amber', 'Wildbloom', 'Fevered', 'Murkwood', 'Thornvine', 'Dawnpetal'],
  grassland:    ['Golden', 'Sunlit', 'Rolling', 'Emerald', 'Verdant', 'Open', 'Brightfield', 'Greenwatch', 'Clearwater', 'Silvergrass'],
  plains:       ['Golden', 'Amber', 'Dusty', 'Windswept', 'Pale', 'Sunken', 'Farreach', 'Flatstone', 'Drifting', 'Steadfast'],
  desert:       ['Ember', 'Sun', 'Golden', 'Red', 'Burning', 'Scorched', 'Searing', 'Dune', 'Ashen', 'Cinderglass'],
  badlands:     ['Redstone', 'Cracked', 'Bonewhite', 'Bloodrock', 'Ironscorch', 'Ashfall', 'Flint', 'Rustworn', 'Cinderspire', 'Dustblood'],
  savanna:      ['Sunbaked', 'Amber', 'Dustswept', 'Lion', 'Ochre', 'Baked', 'Dry', 'Tawny', 'Blazing', 'Thornveld'],
  swamp:        ['Murk', 'Bog', 'Rotting', 'Mire', 'Blackwater', 'Festering', 'Silt', 'Fog', 'Drowned', 'Fallow'],
  wetlands:     ['Reed', 'Still', 'Shallow', 'Marsh', 'Mist', 'Twilight', 'Grey', 'Silverfen', 'Dawnfen', 'Quiet'],
  tundra:       ['Frost', 'Bleached', 'Pale', 'Bitter', 'Iceworn', 'Bleak', 'Barren', 'Windscour', 'Ashfield', 'Greystone'],
  snowy_peaks:  ['Frost', 'Ice', 'Winter', 'White', 'Crystal', 'Glacial', 'Frostspire', 'Deepsnow', 'Coldspire', 'Blizzard'],
  mountain:     ['Ironpeak', 'Stone', 'Greywall', 'Granite', 'Highrock', 'Stormreach', 'Earthen', 'Crag', 'Steelmount', 'Stonecrown'],
  alpine_meadow:['Highmeadow', 'Dawnpeak', 'Cloudtouch', 'Greenmount', 'Whisper', 'Clearsky', 'Summit', 'Thistledown', 'Skyedge', 'Meadowcrown'],
  volcanic:     ['Cinderfall', 'Ashspire', 'Emberstorm', 'Scorchveil', 'Magma', 'Hellfire', 'Slagreach', 'Sulfur', 'Ironfire', 'Charstone'],
  beach:        ['Stormreach', 'Sandy', 'Shellbreak', 'Driftwood', 'Saltwind', 'Wavecrest', 'Tidemark', 'Shorefall', 'Seawatch', 'Foambreak'],
  tropical_beach:['Coral', 'Azure', 'Sunstrand', 'Warmshore', 'Shellsong', 'Tidesong', 'Ivory', 'Dawnshore', 'Brightwater', 'Crystalcoast'],
  cliff:        ['Sheer', 'Highwall', 'Ironcliff', 'Breakstone', 'Edgerock', 'Fallenstone', 'Greyspire', 'Stonestep', 'Ravenspire', 'Bleakcrag'],
  river_valley: ['Greenvalley', 'Riverside', 'Loam', 'Stillwater', 'Clearrun', 'Rushwater', 'Stonefork', 'Deepford', 'Willowbend', 'Brookhaven'],
  shallow_ocean:['Shimmer', 'Azure', 'Saltmere', 'Deepwater', 'Greyveil', 'Coldwater', 'Mirrorpool', 'Bluedepth', 'Stillsea', 'Breakwater'],
  deep_ocean:   ['Abyssal', 'Deepveil', 'Darkwater', 'Drowned', 'Sunken', 'Void', 'Colddeep', 'Nethersea', 'Darkholm', 'Deepholm'],
};

const BIOME_SUFFIXES: Record<string, string[]> = {
  forest:       ['Woods', 'Grove', 'Hollow', 'Thicket', 'Copse', 'Weald', 'Glade', 'Timberlands'],
  dense_forest: ['Depths', 'Tangle', 'Heartwood', 'Thicket', 'Weald', 'Labyrinth', 'Wilds', 'Hollows'],
  pine_forest:  ['Pines', 'Reach', 'Stand', 'Boughs', 'Heights', 'Ridge', 'Timberline', 'Wilds'],
  jungle:       ['Canopy', 'Wilds', 'Depths', 'Tangle', 'Sprawl', 'Verdure', 'Growth', 'Basin'],
  grassland:    ['Meadows', 'Pastures', 'Fields', 'Lea', 'Downs', 'Glades', 'Commons', 'Greens'],
  plains:       ['Fields', 'Plains', 'Reach', 'Expanse', 'Flats', 'Stretches', 'Span', 'Steppes'],
  desert:       ['Sands', 'Wastes', 'Expanse', 'Flats', 'Reach', 'Dunes', 'Drift', 'Desolation'],
  badlands:     ['Wastes', 'Flats', 'Hollows', 'Scars', 'Breaks', 'Crags', 'Ridges', 'Barrens'],
  savanna:      ['Veldt', 'Grasses', 'Plains', 'Reach', 'Flats', 'Run', 'Passage', 'Lands'],
  swamp:        ['Mire', 'Fen', 'Morass', 'Slough', 'Bogs', 'Marshes', 'Quag', 'Reeds'],
  wetlands:     ['Fen', 'Marshes', 'Lows', 'Bogs', 'Wetlands', 'Shallows', 'Banks', 'Slough'],
  tundra:       ['Tundra', 'Wastes', 'Reaches', 'Flats', 'Expanse', 'Moors', 'Steppes', 'Barrens'],
  snowy_peaks:  ['Peaks', 'Summit', 'Spire', 'Crags', 'Heights', 'Glaciers', 'Snowfields', 'Pinnacle'],
  mountain:     ['Peaks', 'Heights', 'Ridge', 'Summit', 'Crags', 'Pass', 'Escarpment', 'Ramparts'],
  alpine_meadow:['Meadows', 'Highlands', 'Uplands', 'Flats', 'Pastures', 'Steppes', 'Reach', 'Terraces'],
  volcanic:     ['Caldera', 'Vents', 'Ashfields', 'Desolation', 'Wastes', 'Ruins', 'Scorchlands', 'Fissures'],
  beach:        ['Shore', 'Coast', 'Strand', 'Cove', 'Bay', 'Inlet', 'Banks', 'Littoral'],
  tropical_beach:['Shore', 'Lagoon', 'Bay', 'Reef', 'Cove', 'Atoll', 'Banks', 'Strand'],
  cliff:        ['Cliffs', 'Escarpment', 'Bluffs', 'Palisade', 'Scarp', 'Ledges', 'Overhang', 'Stacks'],
  river_valley: ['Valley', 'Dale', 'Run', 'Course', 'Basin', 'Glen', 'Gorge', 'Channel'],
  shallow_ocean:['Shallows', 'Shoals', 'Sound', 'Straits', 'Ford', 'Passage', 'Bay', 'Reach'],
  deep_ocean:   ['Deep', 'Abyss', 'Trench', 'Void', 'Depths', 'Chasm', 'Rift', 'Expanse'],
};

const FALLBACK_PREFIXES = ['Grey', 'Lost', 'Far', 'Wild', 'Broken', 'Forgotten', 'Silent', 'Hollow', 'Bleak', 'Dim'];
const FALLBACK_SUFFIXES = ['Lands', 'Reach', 'Wastes', 'Wilds', 'Vale', 'Moor', 'Hold', 'Passage'];

// ---------------------------------------------------------------------------
// Color palette and weather profile tables
// ---------------------------------------------------------------------------

const BIOME_COLOR_PALETTE: Record<string, string> = {
  forest:        'verdant',
  dense_forest:  'dark',
  pine_forest:   'frozen',
  jungle:        'tropical',
  grassland:     'verdant',
  plains:        'arid',
  desert:        'arid',
  badlands:      'arid',
  savanna:       'arid',
  swamp:         'murky',
  wetlands:      'murky',
  tundra:        'frozen',
  snowy_peaks:   'frozen',
  mountain:      'dark',
  alpine_meadow: 'verdant',
  volcanic:      'volcanic',
  beach:         'tropical',
  tropical_beach:'tropical',
  cliff:         'dark',
  river_valley:  'verdant',
  shallow_ocean: 'tropical',
  deep_ocean:    'dark',
};

const BIOME_WEATHER: Record<string, string> = {
  forest:        'rainy',
  dense_forest:  'misty',
  pine_forest:   'snowy',
  jungle:        'stormy',
  grassland:     'calm',
  plains:        'windy',
  desert:        'dry',
  badlands:      'dry',
  savanna:       'dry',
  swamp:         'misty',
  wetlands:      'rainy',
  tundra:        'windy',
  snowy_peaks:   'snowy',
  mountain:      'stormy',
  alpine_meadow: 'calm',
  volcanic:      'stormy',
  beach:         'windy',
  tropical_beach:'calm',
  cliff:         'windy',
  river_valley:  'rainy',
  shallow_ocean: 'calm',
  deep_ocean:    'stormy',
};

// ---------------------------------------------------------------------------
// POI name lists per type
// ---------------------------------------------------------------------------

const POI_NAME_PARTS: Record<string, { prefixes: string[]; suffixes: string[] }> = {
  town: {
    prefixes: ['Ashford', 'Millhaven', 'Irongate', 'Stonevale', 'Thornwick', 'Greymoor', 'Dusthaven', 'Crestfall', 'Dawnwatch', 'Stoneharbor'],
    suffixes: ['', '', 'Town', 'Settlement', 'Outpost', 'Village', 'Hamlet', 'Keep'],
  },
  dungeon: {
    prefixes: ['The', 'The', 'The', 'The', 'The', 'Sunken', 'Lost', 'Forgotten', 'Ancient', 'Shattered'],
    suffixes: ['Catacombs', 'Vault', 'Crypts', 'Labyrinth', 'Warren', 'Depths', 'Hollow', 'Pit', 'Den', 'Lair'],
  },
  shrine: {
    prefixes: ['Shrine of', 'Altar of', 'Temple of', 'Chapel of', 'Sanctum of'],
    suffixes: ['the Fallen', 'the Lost', 'the Ancients', 'the Storm', 'the Deep', 'the Dawn', 'the Void', 'the Wild'],
  },
  ruin: {
    prefixes: ['Broken', 'Crumbled', 'Sunken', 'Forgotten', 'Ancient', 'Lost', 'Shattered', 'Old'],
    suffixes: ['Citadel', 'Fortress', 'Walls', 'Towers', 'Ramparts', 'Bastion', 'Keep', 'Stronghold'],
  },
  camp: {
    prefixes: ['Wanderer', 'Scout', 'Bandit', 'Ranger', 'Outlander', 'Nomad', 'Drifter', 'Settler'],
    suffixes: ['Camp', 'Camp', 'Encampment', 'Outpost', 'Post', 'Bivouac', 'Station', 'Refuge'],
  },
  tower: {
    prefixes: ['The Watchtower of', 'The Tower of', 'The Spire of', 'The Beacon of'],
    suffixes: ['the East', 'the North', 'the South', 'the West', 'Dawn', 'Dusk', 'the Storm', 'the Watch'],
  },
  cave: {
    prefixes: ['The', 'The', 'The', 'Dark', 'Deep', 'Hidden', 'Echoing', 'Black'],
    suffixes: ['Cavern', 'Grotto', 'Cave', 'Hollow', 'Depths', 'Burrow', 'Delve', 'Fissure'],
  },
  bridge: {
    prefixes: ['Stoneford', 'Ironveil', 'Crownbridge', 'Greyford', 'Highpass', 'Ancientspan', 'Fallen', 'Old'],
    suffixes: ['Bridge', 'Crossing', 'Ford', 'Span', 'Pass', 'Way', 'Passage', 'Link'],
  },
  crossroads: {
    prefixes: ['The', 'The', 'The', 'Wanderer\'s', 'Traveler\'s', 'Merchant\'s', 'Pilgrim\'s', 'Old'],
    suffixes: ['Crossroads', 'Junction', 'Crossroads', 'Fork', 'Crossing', 'Waypoint', 'Confluence', 'Meeting'],
  },
  city: {
    prefixes: ['Ironhold', 'Crownsgate', 'Highwall', 'Stormhaven', 'Dragonport', 'Kingsreach', 'Ashenmire', 'Sunspire', 'Blackmoor', 'Goleli'],
    suffixes: ['', '', 'City', 'Citadel', 'Capital', 'Metropolis', 'Hold', 'Dominion'],
  },
  village: {
    prefixes: ['Millbrook', 'Thornfield', 'Redhollow', 'Oakrest', 'Ashfen', 'Pebblebrook', 'Dustwick', 'Ferndale', 'Greyholm', 'Willowmere'],
    suffixes: ['', '', 'Village', 'Hamlet', 'Steading', 'Homestead', 'Dale', 'Glen'],
  },
  fortress: {
    prefixes: ['Fort', 'Castle', 'Bastion', 'Citadel', 'Stronghold of', 'The Keep of', 'Rampart of', 'The Hold of'],
    suffixes: ['Iron', 'Stone', 'the Warden', 'the North', 'the Mountain', 'the Last Watch', 'the Fallen', 'the Storm'],
  },
  port: {
    prefixes: ['Harborview', 'Saltwind', 'Tidegate', 'Anchorfall', 'Wavebreak', 'Driftwood', 'Seawall', 'Stormquay'],
    suffixes: ['', '', 'Port', 'Harbor', 'Dock', 'Landing', 'Quay', 'Anchorage'],
  },
  mine: {
    prefixes: ['The', 'Old', 'Deep', 'Lost', 'Iron', 'Gold', 'Silver', 'Dark'],
    suffixes: ['Mine', 'Quarry', 'Dig', 'Shaft', 'Excavation', 'Vein', 'Lode', 'Pit'],
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function dist2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function distSq2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function pickFrom<T>(arr: T[], rng: SeededRNG): T {
  return arr[rng.nextInt(0, arr.length - 1)];
}

function regionNameFromBiome(biome: BiomeType, rng: SeededRNG): string {
  const prefixList = BIOME_PREFIXES[biome] ?? FALLBACK_PREFIXES;
  const suffixList = BIOME_SUFFIXES[biome] ?? FALLBACK_SUFFIXES;
  const prefix = pickFrom(prefixList, rng);
  const suffix = pickFrom(suffixList, rng);
  if (suffix === '') return prefix;
  return `${prefix} ${suffix}`;
}

function poiNameForType(type: PointOfInterest['type'], rng: SeededRNG): string {
  const parts = POI_NAME_PARTS[type];
  const prefix = pickFrom(parts.prefixes, rng);
  const suffix = pickFrom(parts.suffixes, rng);
  if (suffix === '') return prefix;
  return `${prefix} ${suffix}`.trim();
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createRegionSystem(
  worldSeed: WorldSeed,
  getBiomeType: (wx: number, wz: number) => BiomeType,
  getElevation: (wx: number, wz: number) => number,
  getContinental: (wx: number, wz: number) => number,
): RegionSystem {
  const regionSeed = worldSeed.getLayerSeed('region');
  const structureSeed = worldSeed.getLayerSeed('structure');
  const rng = new SeededRNG(regionSeed);

  // -------------------------------------------------------------------
  // 1. Generate region center candidates using a relaxed random grid
  //    We partition the landmass into a grid and place one seed per cell
  //    so regions are spread evenly rather than randomly clustered.
  // -------------------------------------------------------------------
  const GRID_COLS = 7;
  const GRID_ROWS = 6;
  const CELL_W = (HALF_WORLD * 2 * 0.85) / GRID_COLS; // use 85% of world diameter
  const CELL_H = (HALF_WORLD * 2 * 0.85) / GRID_ROWS;
  const ORIGIN_X = -HALF_WORLD * 0.85;
  const ORIGIN_Z = -HALF_WORLD * 0.85;

  const candidateCenters: Array<{ x: number; z: number }> = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Random jitter within each cell (50% of cell size)
      const jx = rng.nextFloat(CELL_W * 0.1, CELL_W * 0.9);
      const jz = rng.nextFloat(CELL_H * 0.1, CELL_H * 0.9);
      const cx = ORIGIN_X + col * CELL_W + jx;
      const cz = ORIGIN_Z + row * CELL_H + jz;
      candidateCenters.push({ x: cx, z: cz });
    }
  }

  // Add extra region near world center for starter zones (guaranteed land)
  candidateCenters.push({ x: rng.nextFloat(-200, 200), z: rng.nextFloat(-200, 200) });
  candidateCenters.push({ x: rng.nextFloat(-400, 400), z: rng.nextFloat(-400, 400) });

  // -------------------------------------------------------------------
  // 2. Build RegionDefinitions
  //    For each candidate: sample the dominant biome, compute danger by
  //    distance from center, assign name/palette/weather.
  // -------------------------------------------------------------------
  const regions: RegionDefinition[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < candidateCenters.length; i++) {
    const { x: cx, z: cz } = candidateCenters[i];

    const cont = getContinental(cx, cz);
    // Skip deep ocean regions — no interesting land features
    if (cont < 0.3) continue;

    const biome = getBiomeType(cx, cz);

    // Danger level: starter zones near center, danger climbs with distance
    const distFromCenter = dist2D(cx, cz, 0, 0);
    const normalizedDist = Math.min(1, distFromCenter / (HALF_WORLD * 0.85));

    // Base danger 1-10, slightly randomised ±1
    let baseDanger = Math.round(1 + normalizedDist * 9);
    const nameRng = new SeededRNG(hashCombine(regionSeed, i * 999983 + 1));
    baseDanger = Math.max(1, Math.min(10, baseDanger + nameRng.nextInt(-1, 1)));

    // Region radius scales with distance: inner regions are larger
    const radius = 400 + (1 - normalizedDist) * 600 + nameRng.nextFloat(-100, 100);

    // Generate a unique name
    let name = regionNameFromBiome(biome, nameRng);
    let attempt = 0;
    while (usedNames.has(name) && attempt < 8) {
      name = regionNameFromBiome(biome, nameRng);
      attempt++;
    }
    // If still colliding, append a distinguishing number (rare)
    if (usedNames.has(name)) {
      name = `${name} ${regions.length + 1}`;
    }
    usedNames.add(name);

    const isStarterZone = baseDanger <= 2 && distFromCenter < HALF_WORLD * 0.25;

    const colorPalette = BIOME_COLOR_PALETTE[biome] ?? 'verdant';
    const weatherProfile = BIOME_WEATHER[biome] ?? 'calm';

    regions.push({
      id: `region_${i}`,
      name,
      centerX: Math.round(cx),
      centerZ: Math.round(cz),
      radius: Math.round(radius),
      dominantBiome: biome,
      dangerLevel: baseDanger,
      isStarterZone,
      colorPalette,
      weatherProfile,
    });
  }

  // Guarantee at least two starter zones exist (near-center safety net)
  const starterCount = regions.filter(r => r.isStarterZone).length;
  if (starterCount < 2) {
    // Promote the closest 2 land regions to starter zones
    const landRegions = [...regions]
      .filter(r => r.dangerLevel <= 4)
      .sort((a, b) => distSq2D(a.centerX, a.centerZ, 0, 0) - distSq2D(b.centerX, b.centerZ, 0, 0));
    for (let i = 0; i < Math.min(2, landRegions.length); i++) {
      const target = regions.find(r => r.id === landRegions[i].id)!;
      target.dangerLevel = Math.min(target.dangerLevel, 2);
      target.isStarterZone = true;
    }
  }

  // -------------------------------------------------------------------
  // 3. Generate Points of Interest
  // -------------------------------------------------------------------
  const allPois: PointOfInterest[] = [];
  const poiRng = new SeededRNG(structureSeed);

  for (const region of regions) {
    const regionPoiRng = region.id
      ? new SeededRNG(hashCombine(structureSeed, simpleHash(region.id)))
      : poiRng.fork(simpleHash(region.name));

    const poiCount = regionPoiRng.nextInt(5, 14);
    const poiTypes: PointOfInterest['type'][] = selectPoiTypesForRegion(region, regionPoiRng, poiCount);

    for (let p = 0; p < poiCount; p++) {
      const poiType = poiTypes[p % poiTypes.length];
      const poiPlaceRng = new SeededRNG(hashCombine(structureSeed, simpleHash(region.id) + p * 31337));

      // Place within the region radius, biased toward interesting terrain
      const angle = poiPlaceRng.nextFloat(0, Math.PI * 2);
      const radiusFactor = poiPlaceRng.nextFloat(0.15, 0.9);
      let px = region.centerX + Math.cos(angle) * region.radius * radiusFactor;
      let pz = region.centerZ + Math.sin(angle) * region.radius * radiusFactor;

      // Snap towers to high ground, camps to low ground
      px = refinePlacement(px, pz, poiType, getElevation, poiPlaceRng);
      pz = refinePlacementZ(px, pz, poiType, getElevation, poiPlaceRng);

      // Clamp to world bounds with margin
      const MARGIN = 200;
      px = Math.max(-HALF_WORLD + MARGIN, Math.min(HALF_WORLD - MARGIN, px));
      pz = Math.max(-HALF_WORLD + MARGIN, Math.min(HALF_WORLD - MARGIN, pz));

      const poiNameRng = new SeededRNG(hashCombine(structureSeed, simpleHash(region.id) + p * 7919));
      const poiName = poiNameForType(poiType, poiNameRng);

      // POI danger is ±2 of region danger, clamped 1–10
      const poiDanger = Math.max(1, Math.min(10, region.dangerLevel + poiPlaceRng.nextInt(-2, 2)));

      allPois.push({
        id: `poi_${region.id}_${p}`,
        name: poiName,
        type: poiType,
        worldX: Math.round(px),
        worldZ: Math.round(pz),
        regionId: region.id,
        dangerLevel: poiDanger,
      });
    }
  }

  // -------------------------------------------------------------------
  // 4. Region query helpers (Voronoi: closest center wins)
  // -------------------------------------------------------------------
  function getRegion(worldX: number, worldZ: number): RegionDefinition {
    let bestRegion = regions[0];
    let bestDist = distSq2D(worldX, worldZ, bestRegion.centerX, bestRegion.centerZ);

    for (let i = 1; i < regions.length; i++) {
      const d = distSq2D(worldX, worldZ, regions[i].centerX, regions[i].centerZ);
      if (d < bestDist) {
        bestDist = d;
        bestRegion = regions[i];
      }
    }

    return bestRegion;
  }

  function getPointsOfInterest(regionId: string): PointOfInterest[] {
    return allPois.filter(p => p.regionId === regionId);
  }

  function getAllPointsOfInterest(): PointOfInterest[] {
    return allPois.slice();
  }

  return { regions, getRegion, getPointsOfInterest, getAllPointsOfInterest };
}

// ---------------------------------------------------------------------------
// Internal utility helpers
// ---------------------------------------------------------------------------

/** Simple stable string → int32 hash for POI seeding. */
function simpleHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** Choose POI types that make thematic sense for the region. */
function selectPoiTypesForRegion(
  region: RegionDefinition,
  rng: SeededRNG,
  count: number,
): PointOfInterest['type'][] {
  const all: PointOfInterest['type'][] = [
    'town', 'city', 'village', 'fortress', 'port', 'mine',
    'dungeon', 'shrine', 'ruin', 'camp', 'tower', 'cave', 'bridge', 'crossroads',
  ];

  const weighted: PointOfInterest['type'][] = [...all];
  const biome = region.dominantBiome;

  if (region.isStarterZone) {
    weighted.push('city', 'city', 'village', 'village', 'shrine', 'crossroads');
  }
  if (biome === 'beach' || biome === 'tropical_beach') {
    weighted.push('port', 'port', 'port', 'village', 'town');
  }
  if (biome === 'forest' || biome === 'dense_forest' || biome === 'pine_forest') {
    weighted.push('village', 'village', 'camp', 'shrine', 'ruin', 'cave');
  }
  if (biome === 'mountain' || biome === 'snowy_peaks' || biome === 'alpine_meadow') {
    weighted.push('fortress', 'fortress', 'mine', 'tower', 'cave', 'ruin');
  }
  if (biome === 'desert' || biome === 'badlands') {
    weighted.push('ruin', 'ruin', 'ruin', 'cave', 'camp', 'mine');
  }
  if (biome === 'swamp' || biome === 'wetlands') {
    weighted.push('dungeon', 'ruin', 'camp', 'shrine', 'village');
  }
  if (biome === 'volcanic') {
    weighted.push('mine', 'mine', 'dungeon', 'dungeon', 'ruin', 'fortress');
  }
  if (biome === 'plains' || biome === 'grassland') {
    weighted.push('city', 'town', 'village', 'village', 'crossroads', 'crossroads');
  }
  if (biome === 'river_valley') {
    weighted.push('town', 'town', 'village', 'bridge', 'bridge', 'port');
  }
  if (biome === 'jungle') {
    weighted.push('ruin', 'ruin', 'shrine', 'shrine', 'camp', 'cave');
  }
  if (biome === 'savanna') {
    weighted.push('village', 'village', 'camp', 'camp', 'crossroads');
  }

  const selected: PointOfInterest['type'][] = [];
  const available = [...weighted];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = rng.nextInt(0, available.length - 1);
    selected.push(available[idx]);
    if (available.length > count) available.splice(idx, 1);
  }

  return selected;
}

/**
 * Attempt to shift X toward terrain that suits the POI type.
 * This is a light single-axis nudge; for a production system you'd do 2D search.
 */
function refinePlacement(
  px: number,
  pz: number,
  type: PointOfInterest['type'],
  getElevation: (wx: number, wz: number) => number,
  rng: SeededRNG,
): number {
  const e = getElevation(px, pz);

  // Towers prefer high ground — nudge +X if going uphill
  if (type === 'tower') {
    const step = rng.nextFloat(30, 80);
    const eRight = getElevation(px + step, pz);
    if (eRight > e) return px + step * 0.5;
  }

  // Camps prefer low ground — nudge toward lower elevation
  if (type === 'camp' || type === 'crossroads' || type === 'bridge') {
    const step = rng.nextFloat(20, 60);
    const eLeft = getElevation(px - step, pz);
    if (eLeft < e) return px - step * 0.5;
  }

  // Dungeons and caves prefer slightly lower terrain
  if (type === 'dungeon' || type === 'cave') {
    const step = rng.nextFloat(20, 50);
    const eDown = getElevation(px, pz - step);
    if (eDown < e) return px;
  }

  if (type === 'fortress') {
    const step = rng.nextFloat(40, 100);
    const eRight = getElevation(px + step, pz);
    if (eRight > e) return px + step * 0.5;
  }

  if (type === 'village' || type === 'city' || type === 'port') {
    const step = rng.nextFloat(30, 80);
    const eLeft = getElevation(px - step, pz);
    if (eLeft < e) return px - step * 0.5;
  }

  if (type === 'mine') {
    const step = rng.nextFloat(20, 60);
    const eUp = getElevation(px + step, pz);
    if (eUp > e && eUp > 40) return px + step * 0.4;
  }

  return px;
}

/** Same nudge logic on the Z axis. */
function refinePlacementZ(
  px: number,
  pz: number,
  type: PointOfInterest['type'],
  getElevation: (wx: number, wz: number) => number,
  rng: SeededRNG,
): number {
  const e = getElevation(px, pz);

  if (type === 'tower') {
    const step = rng.nextFloat(30, 80);
    const eFwd = getElevation(px, pz + step);
    if (eFwd > e) return pz + step * 0.5;
  }

  if (type === 'camp' || type === 'crossroads' || type === 'bridge') {
    const step = rng.nextFloat(20, 60);
    const eBwd = getElevation(px, pz - step);
    if (eBwd < e) return pz - step * 0.5;
  }

  if (type === 'fortress') {
    const step = rng.nextFloat(40, 100);
    const eFwd = getElevation(px, pz + step);
    if (eFwd > e) return pz + step * 0.5;
  }

  if (type === 'village' || type === 'city' || type === 'port') {
    const step = rng.nextFloat(30, 80);
    const eBwd = getElevation(px, pz - step);
    if (eBwd < e) return pz - step * 0.5;
  }

  return pz;
}
