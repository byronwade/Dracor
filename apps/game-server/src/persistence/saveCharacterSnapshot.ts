import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import { logger } from "../logging/logger";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabase) return supabase;
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;

  supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export async function saveCharacterSnapshot(
  characterId: string,
  x: number,
  y: number,
  z: number,
  zoneId: string
): Promise<void> {
  const client = getClient();

  if (!client) {
    logger.debug("Supabase not configured, skipping save", { characterId });
    return;
  }

  const roundedX = Math.round(x * 100) / 100;
  const roundedY = Math.round(y * 100) / 100;
  const roundedZ = Math.round(z * 100) / 100;

  const { error } = await client
    .from("characters")
    .update({
      position_x: roundedX,
      position_y: roundedY,
      position_z: roundedZ,
      zone_id: zoneId,
    })
    .eq("id", characterId);

  if (error) {
    logger.error("Failed to save character snapshot", {
      characterId,
      error: error.message,
    });
  } else {
    logger.debug("Saved character snapshot", {
      characterId,
      x: roundedX,
      y: roundedY,
      z: roundedZ,
      zoneId,
    });
  }
}
