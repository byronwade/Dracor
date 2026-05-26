export type AnalyticsEvent =
  | 'account_created'
  | 'character_created'
  | 'game_launched'
  | 'world_joined'
  | 'contract_started'
  | 'contract_completed'
  | 'chat_sent'
  | 'player_death'
  | 'session_ended';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  userId?: string;
  characterId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export function trackEvent(payload: AnalyticsPayload): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${payload.event}`, payload.metadata ?? '');
  }
}
