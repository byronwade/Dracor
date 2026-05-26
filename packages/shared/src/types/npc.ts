export type NpcRole = 'quest_giver' | 'merchant' | 'healer' | 'guard' | 'scout';

export interface Npc {
  id: string;
  name: string;
  title: string;
  role: NpcRole;
  zoneId: string;
  dialogue: string[];
  description: string;
}
