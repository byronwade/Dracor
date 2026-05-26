export type ContractType = 'hunt' | 'gather' | 'recover';
export type ContractStatus = 'active' | 'completed' | 'failed' | 'abandoned';

export interface ContractObjective {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
}

export interface Contract {
  id: string;
  slug: string;
  title: string;
  contractType: ContractType;
  summary: string;
  description: string;
  zoneId: string;
  requiredLevel: number;
  rewardXp: number;
  rewardGold: number;
  rewardItems: string[];
  objectives: ContractObjective[];
}

export interface CharacterContract {
  id: string;
  characterId: string;
  contractId: string;
  status: ContractStatus;
  progress: Record<string, number>;
  startedAt: string;
  completedAt?: string;
}
