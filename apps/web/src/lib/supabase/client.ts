import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@dracor/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

let supabaseInstance: TypedSupabaseClient | null = null;

/**
 * Returns a Supabase browser client instance typed with the Dracor database schema.
 * Returns null if environment variables are not configured.
 *
 * Usage:
 *   const supabase = getSupabaseClient();
 *   if (!supabase) { // handle missing config }
 */
export function getSupabaseClient(): TypedSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Dracor] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
    }
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}
