import type { ZoneManifest } from '../types/ZoneManifest';

export const IRONVALE_OUTSKIRTS: ZoneManifest = {
  id: 'ironvale_outskirts',
  name: 'Ironvale Outskirts',
  description:
    'A dark fantasy frontier just outside the walls of Ironvale. An old broken cobblestone road ' +
    'winds through a dense pine forest, past stone outcroppings and moss-covered boulders. ' +
    'Low-hanging fog clings to the ground while distant mountains frame the horizon. ' +
    'Warm amber town lights glow faintly through the tree line to the south. ' +
    'A Dracor memory shrine pulses with ember-orange light at the heart of a small clearing.',
  biomeId: 'dark_pine_frontier',
  bounds: { minX: -250, maxX: 250, minZ: -250, maxZ: 250 },
  playerSpawn: { x: 0, y: 0, z: 10, yaw: 0 },

  terrain: {
    chunks: [
      // Row 0 (far negative Z)
      { id: 'chunk_0_0', gridX: 0, gridZ: 0, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_1_0', gridX: 1, gridZ: 0, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_2_0', gridX: 2, gridZ: 0, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_3_0', gridX: 3, gridZ: 0, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_4_0', gridX: 4, gridZ: 0, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      // Row 1
      { id: 'chunk_0_1', gridX: 0, gridZ: 1, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_1_1', gridX: 1, gridZ: 1, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_2_1', gridX: 2, gridZ: 1, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_3_1', gridX: 3, gridZ: 1, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_4_1', gridX: 4, gridZ: 1, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      // Row 2 (center)
      { id: 'chunk_0_2', gridX: 0, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_1_2', gridX: 1, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_2_2', gridX: 2, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_3_2', gridX: 3, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_4_2', gridX: 4, gridZ: 2, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      // Row 3
      { id: 'chunk_0_3', gridX: 0, gridZ: 3, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_1_3', gridX: 1, gridZ: 3, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_2_3', gridX: 2, gridZ: 3, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_3_3', gridX: 3, gridZ: 3, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_4_3', gridX: 4, gridZ: 3, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      // Row 4 (far positive Z)
      { id: 'chunk_0_4', gridX: 0, gridZ: 4, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_1_4', gridX: 1, gridZ: 4, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_2_4', gridX: 2, gridZ: 4, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_3_4', gridX: 3, gridZ: 4, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
      { id: 'chunk_4_4', gridX: 4, gridZ: 4, size: 100, resolution: 64, heightData: 'procedural', lodLevels: 3 },
    ],
    materialId: 'mat_ironvale_ground',
    heightScale: 30,
    baseElevation: 0,
  },

  foliage: [
    {
      id: 'foliage_pine_main',
      type: 'tree_pine',
      count: 200,
      area: { centerX: 0, centerZ: 0, radius: 220 },
      minScale: 0.8,
      maxScale: 1.4,
      density: 0.6,
      lodDistance: 120,
      castShadow: true,
    },
    {
      id: 'foliage_dead_trees',
      type: 'tree_dead',
      count: 30,
      area: { centerX: -80, centerZ: 60, radius: 150 },
      minScale: 0.7,
      maxScale: 1.1,
      density: 0.15,
      lodDistance: 100,
      castShadow: true,
    },
    {
      id: 'foliage_tall_grass',
      type: 'grass_tall',
      count: 500,
      area: { centerX: 0, centerZ: 0, radius: 50 },
      minScale: 0.6,
      maxScale: 1.0,
      density: 0.9,
      lodDistance: 40,
      castShadow: false,
    },
    {
      id: 'foliage_bushes_edge',
      type: 'bush',
      count: 80,
      area: { centerX: 40, centerZ: -30, radius: 180 },
      minScale: 0.5,
      maxScale: 1.2,
      density: 0.35,
      lodDistance: 60,
      castShadow: true,
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
      description:
        'An ancient cobblestone road, cracked and overtaken by roots and weeds. ' +
        'It winds from the southern tree line northwest toward Ironvale, barely visible under centuries of neglect.',
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
      description:
        'A weathered stone shrine engraved with draconic runes. Faint ember-orange light pulses ' +
        'from deep within the carvings, as though the stone itself remembers an ancient flame. ' +
        'Touching the shrine reveals fragments of forgotten memory.',
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
      description:
        'The crumbling remains of a stone gateway that once marked the boundary of Ironvale territory. ' +
        'One pillar still stands; the other has collapsed into a heap of mossy rubble.',
    },
    {
      id: 'landmark_old_bridge',
      type: 'bridge',
      name: 'Ashwood Crossing',
      position: { x: 100, y: -0.5, z: 120 },
      rotation: 30,
      scale: 1.0,
      interactable: false,
      description:
        'A narrow stone bridge spanning a shallow stream. The railings are long gone, ' +
        'and the surface is slick with moss. Locals say the bridge was built by dwarves ' +
        'before the age of forgetting.',
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
    // Player spawn
    {
      id: 'spawn_player_start',
      type: 'player',
      position: { x: 0, y: 0, z: 10 },
      rotation: 0,
    },
    // NPC spawns
    {
      id: 'spawn_npc_wandering_merchant',
      type: 'npc',
      position: { x: -30, y: 0.2, z: -10 },
      rotation: 90,
      entityId: 'npc_wandering_merchant',
    },
    {
      id: 'spawn_npc_lost_traveler',
      type: 'npc',
      position: { x: 80, y: 0.3, z: 100 },
      rotation: 180,
      entityId: 'npc_lost_traveler',
    },
    {
      id: 'spawn_npc_shrine_keeper',
      type: 'npc',
      position: { x: 25, y: 0.5, z: 45 },
      rotation: 45,
      entityId: 'npc_shrine_keeper',
    },
    // Enemy spawn areas
    {
      id: 'spawn_enemy_road_wolf_south',
      type: 'enemy',
      position: { x: -120, y: 0.2, z: -100 },
      entityId: 'enemy_road_wolf',
      radius: 30,
      maxCount: 3,
      respawnSeconds: 120,
    },
    {
      id: 'spawn_enemy_road_wolf_north',
      type: 'enemy',
      position: { x: 140, y: 0.3, z: 150 },
      entityId: 'enemy_road_wolf',
      radius: 25,
      maxCount: 2,
      respawnSeconds: 150,
    },
    {
      id: 'spawn_enemy_ashroot_spider_forest',
      type: 'enemy',
      position: { x: -160, y: 0.1, z: 40 },
      entityId: 'enemy_ashroot_spider',
      radius: 40,
      maxCount: 4,
      respawnSeconds: 180,
    },
    {
      id: 'spawn_enemy_ashroot_spider_rocks',
      type: 'enemy',
      position: { x: -180, y: 0.5, z: -130 },
      entityId: 'enemy_ashroot_spider',
      radius: 20,
      maxCount: 2,
      respawnSeconds: 200,
    },
    {
      id: 'spawn_enemy_road_wolf_bridge',
      type: 'enemy',
      position: { x: 110, y: -0.3, z: 130 },
      entityId: 'enemy_road_wolf',
      radius: 20,
      maxCount: 2,
      respawnSeconds: 160,
    },
  ],

  lightingPreset: 'ironvale_dusk',
  fogPreset: 'ironvale_mist',
  ambientAudio: ['wind_pine', 'distant_wolves', 'crackling_ember'],
  worldEvents: ['shrine_pulse', 'wolf_pack_patrol'],
  performanceTier: 'medium',
};
