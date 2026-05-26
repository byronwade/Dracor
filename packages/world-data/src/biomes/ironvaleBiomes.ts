import type { BiomeDefinition } from '../types/BiomeDefinition';

export const IRONVALE_BIOMES: BiomeDefinition[] = [
  {
    id: 'dark_pine_frontier',
    name: 'Dark Pine Frontier',
    groundColor: [0.18, 0.14, 0.1],
    groundRoughness: 0.85,
    foliageTypes: ['tree_pine', 'tree_dead', 'bush', 'fern'],
    rockTypes: ['boulder_large', 'boulder_medium', 'stone_cluster'],
    ambientParticles: 'dust_motes',
    description:
      'A dark, forested frontier dominated by towering pines and gnarled dead trees. ' +
      'The earth is rich and dark, scattered with ferns and low bushes. ' +
      'Stone outcroppings break through the forest floor at irregular intervals.',
  },
  {
    id: 'ashroot_underground',
    name: 'Ashroot Underground',
    groundColor: [0.08, 0.07, 0.09],
    groundRoughness: 0.95,
    foliageTypes: [],
    rockTypes: ['cliff_face', 'stone_cluster', 'boulder_medium'],
    ambientParticles: 'cave_spores',
    description:
      'A lightless network of tunnels beneath the Ironvale region. ' +
      'Bare stone walls are slick with moisture. No foliage survives here, ' +
      'only the faint glow of bioluminescent fungi clinging to the ceiling.',
  },
  {
    id: 'wolfpine_deep',
    name: 'Wolfpine Deep',
    groundColor: [0.12, 0.1, 0.07],
    groundRoughness: 0.9,
    foliageTypes: ['tree_pine', 'fern', 'grass_short'],
    rockTypes: ['boulder_large', 'boulder_medium', 'cliff_face'],
    ambientParticles: 'fireflies',
    description:
      'The deepest reaches of the Ironvale pine forest. Trees grow so thick ' +
      'that daylight barely penetrates. Thick moss carpets the ground and ferns ' +
      'crowd every gap between ancient trunks. Wolves rule these woods.',
  },
];
