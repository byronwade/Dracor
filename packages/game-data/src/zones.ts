import type { Zone } from '@dracor/shared';

export const ZONES: Zone[] = [
  {
    id: 'ironvale_town',
    name: 'Ironvale',
    description:
      'A frontier town built where the Old Road meets the valley. Sturdy stone buildings line muddy streets, and the smell of coal smoke mixes with pine. The townsfolk are wary but welcoming — they need every able body they can get.',
    levelRange: [1, 3],
    type: 'town',
    connections: ['old_road'],
  },
  {
    id: 'old_road',
    name: 'The Old Road',
    description:
      'An ancient trade route that once connected great cities now fallen to ruin. Cracked cobblestones peek through overgrown grass, and milestone markers stand like crooked teeth along its length. Wolves and bandits make travel dangerous.',
    levelRange: [2, 4],
    type: 'road',
    connections: ['ironvale_town', 'wolfpine_woods', 'ashroot_mine'],
  },
  {
    id: 'wolfpine_woods',
    name: 'Wolfpine Woods',
    description:
      'A dense forest of ancient pines where the canopy blocks most sunlight. The undergrowth is thick with medicinal herbs and lurking predators. Strange howls echo between the trunks at dusk.',
    levelRange: [3, 5],
    type: 'wilderness',
    connections: ['old_road'],
  },
  {
    id: 'ashroot_mine',
    name: 'Ashroot Mine',
    description:
      'An abandoned mine that once produced iron and strange black crystals. The tunnels run deep, and something skitters in the darkness below. Tools and supplies were left behind when the miners fled.',
    levelRange: [4, 6],
    type: 'dungeon',
    connections: ['old_road'],
  },
];
