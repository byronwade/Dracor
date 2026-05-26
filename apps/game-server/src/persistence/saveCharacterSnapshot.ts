import { logger } from "../logging/logger";

/**
 * Save a character's position snapshot.
 * Currently logs the save; Supabase integration will be added later.
 */
export async function saveCharacterSnapshot(
  characterId: string,
  x: number,
  y: number,
  z: number,
  zoneId: string
): Promise<void> {
  logger.debug("Saving character snapshot", {
    characterId,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    z: Math.round(z * 100) / 100,
    zoneId,
  });
  // TODO: Supabase upsert call
  // await supabase.from('characters').update({ x, y, z, zone_id: zoneId }).eq('id', characterId);
}
