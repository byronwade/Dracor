import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createBrowserClient(url: string, anonKey: string): TypedSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function createServerClient(url: string, serviceKey: string): TypedSupabaseClient {
  return createClient<Database>(url, serviceKey, {
    auth: {
      flowType: 'pkce',
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
