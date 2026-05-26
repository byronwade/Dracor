export type WeaponType = 'blade' | 'bow' | 'staff';
export type DragonMemory = 'ember' | 'stone' | 'storm';
export type RaceId = 'dracor' | 'ironborn' | 'sylvhari' | 'ashwalker' | 'voidtouched' | 'bloodfane' | 'stoneguard' | 'grukhar' | 'skrix';
export type Ancestry = RaceId;

export interface RacialAbility {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active';
  cooldown?: number;
}

export interface RaceBaseStats {
  strength: number;
  agility: number;
  vitality: number;
  spirit: number;
  focus: number;
}

export interface RaceAppearanceOptions {
  eyeColors: string[];
  skinTones: string[];
  markings: string[];
  hairStyles: string[];
  uniqueFeature: string;
  uniqueFeatureOptions: string[];
}

export interface Race {
  id: RaceId;
  name: string;
  tagline: string;
  description: string;
  lore: string;
  traits: string[];
  baseStats: RaceBaseStats;
  abilities: RacialAbility[];
  appearance: RaceAppearanceOptions;
  modelConfig: {
    bodyType: 'heavy' | 'medium' | 'lean' | 'ethereal';
    height: number;
    primaryColor: string;
    secondaryColor: string;
    emissiveColor: string;
    particleEffect?: string;
  };
}

export interface CharacterAppearance {
  eyeColor: string;
  skinTone: string;
  marking: string;
  hairStyle: string;
  uniqueFeature: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  race: RaceId;
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
  race: RaceId;
  weapon: WeaponType;
  memory: DragonMemory;
  appearance: CharacterAppearance;
}
