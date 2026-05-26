export type ItemType = 'weapon' | 'consumable' | 'material' | 'quest' | 'armor';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  slug: string;
  name: string;
  description: string;
  itemType: ItemType;
  rarity: Rarity;
  requiredLevel: number;
  damageMin?: number;
  damageMax?: number;
  armor?: number;
  sellPrice: number;
  metadata: Record<string, unknown>;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  itemId: string;
  quantity: number;
  slotIndex?: number;
}
