import type { Item } from '@dracor/shared';

export const STARTER_WEAPONS: Item[] = [
  {
    id: 'weapon_rusted_blade',
    slug: 'rusted_blade',
    name: 'Rusted Blade',
    description:
      'A short sword pitted with rust but still sharp enough to cut. Its balance suggests it was once a fine weapon.',
    itemType: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 6,
    sellPrice: 5,
    metadata: { weaponClass: 'blade', attackSpeed: 1.0 },
  },
  {
    id: 'weapon_roadwarden_bow',
    slug: 'roadwarden_bow',
    name: 'Roadwarden Bow',
    description:
      'A simple shortbow carried by frontier patrol scouts. Light and reliable, if unremarkable.',
    itemType: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 8,
    sellPrice: 5,
    metadata: { weaponClass: 'bow', attackSpeed: 0.8 },
  },
  {
    id: 'weapon_emberwood_staff',
    slug: 'emberwood_staff',
    name: 'Emberwood Staff',
    description:
      'A staff carved from emberwood — a tree that grows near volcanic vents. It hums faintly with residual heat.',
    itemType: 'weapon',
    rarity: 'common',
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 5,
    sellPrice: 5,
    metadata: { weaponClass: 'staff', attackSpeed: 1.2 },
  },
];
