import type { Enemy } from '@dracor/shared';

export const STARTER_ENEMIES: Enemy[] = [
  {
    id: 'enemy_road_wolf',
    name: 'Road Wolf',
    level: 2,
    health: 30,
    damageMin: 3,
    damageMax: 5,
    xpReward: 15,
    goldReward: 5,
    zoneId: 'old_road',
    drops: [
      {
        itemSlug: 'wolf_fang',
        dropChance: 0.4,
        quantityMin: 1,
        quantityMax: 1,
      },
    ],
    description:
      'A gaunt wolf with matted grey fur and hungry yellow eyes. Road Wolves travel in small packs, growing bolder as their numbers increase.',
  },
  {
    id: 'enemy_ashroot_spider',
    name: 'Ashroot Spider',
    level: 3,
    health: 25,
    damageMin: 4,
    damageMax: 6,
    xpReward: 20,
    goldReward: 8,
    zoneId: 'ashroot_mine',
    drops: [
      {
        itemSlug: 'spider_silk',
        dropChance: 0.3,
        quantityMin: 1,
        quantityMax: 2,
      },
    ],
    description:
      'A large spider that nests in the abandoned mine tunnels. Its legs tap against stone in an unsettling rhythm, and its web is unnervingly strong.',
  },
  {
    id: 'enemy_hollow_bandit',
    name: 'Hollow Bandit',
    level: 4,
    health: 45,
    damageMin: 5,
    damageMax: 8,
    xpReward: 30,
    goldReward: 15,
    zoneId: 'old_road',
    drops: [
      {
        itemSlug: 'rusted_blade',
        dropChance: 0.1,
        quantityMin: 1,
        quantityMax: 1,
      },
    ],
    description:
      'A desperate figure in tattered clothing, hollow-cheeked and wild-eyed. Once ordinary people driven to banditry by hard times on the frontier.',
  },
];
