export type WeaponType = 'blade' | 'bow' | 'staff';
export type DragonMemory = 'ember' | 'stone' | 'storm';
export type Ancestry = 'dracor';

export interface CharacterAppearance {
  eyeColor: string;
  scaleMarking: string;
  hornStyle: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  ancestry: Ancestry;
  level: number;
  xp: number;
  gold: number;
  weapon: WeaponType;
  memory: DragonMemory;
  zoneId: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  appearance: CharacterAppearance;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  name: string;
  weapon: WeaponType;
  memory: DragonMemory;
  appearance: CharacterAppearance;
}
