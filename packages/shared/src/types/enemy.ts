export interface Enemy {
  id: string;
  name: string;
  level: number;
  health: number;
  damageMin: number;
  damageMax: number;
  xpReward: number;
  goldReward: number;
  zoneId: string;
  drops: EnemyDrop[];
  description: string;
}

export interface EnemyDrop {
  itemSlug: string;
  dropChance: number;
  quantityMin: number;
  quantityMax: number;
}
