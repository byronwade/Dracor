export interface DragonMemoryData {
  id: string;
  name: string;
  description: string;
  element: string;
  passiveBonus: string;
}

export const DRAGON_MEMORIES: DragonMemoryData[] = [
  {
    id: 'ember',
    name: 'Ember',
    description: 'A fragment of ancient flame burns within',
    element: 'fire',
    passiveBonus: '+5% fire damage',
  },
  {
    id: 'stone',
    name: 'Stone',
    description: 'The weight of mountains steadies your form',
    element: 'earth',
    passiveBonus: '+5% defense',
  },
  {
    id: 'storm',
    name: 'Storm',
    description: 'Thunder echoes in your bloodline',
    element: 'lightning',
    passiveBonus: '+5% attack speed',
  },
];
