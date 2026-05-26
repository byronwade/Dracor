export interface BaseStats {
  strength: number;
  agility: number;
  vitality: number;
  spirit: number;
  focus: number;
}

export interface CombatStats {
  attackPower: number;
  defense: number;
  critChance: number;
  critDamage: number;
  attackSpeed: number;
}

export interface DerivedStats {
  maxHealth: number;
  maxStamina: number;
  movementSpeed: number;
  healthRegen: number;
  staminaRegen: number;
}
