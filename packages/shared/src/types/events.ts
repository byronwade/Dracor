export interface WorldEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  zoneId: string;
  startsAt?: string;
  endsAt?: string;
  status: 'scheduled' | 'active' | 'completed';
  metadata: Record<string, unknown>;
}

export interface PlayerDeed {
  id: string;
  characterId: string;
  deedType: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
