import type { TypedSupabaseClient } from './client';
import type { CreateCharacterInput } from '@dracor/shared';

export async function getCharactersByUser(client: TypedSupabaseClient, userId: string) {
  const { data, error } = await client
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCharacter(
  client: TypedSupabaseClient,
  userId: string,
  input: CreateCharacterInput
) {
  const { data, error } = await client
    .from('characters')
    .insert({
      user_id: userId,
      name: input.name,
      ancestry: 'dracor',
      weapon: input.weapon,
      memory: input.memory,
      appearance: input.appearance as unknown as Record<string, string>,
      zone_id: 'ironvale_town',
      position_x: 0,
      position_y: 0,
      position_z: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCharacterById(client: TypedSupabaseClient, characterId: string) {
  const { data, error } = await client
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCharacterLastLocation(
  client: TypedSupabaseClient,
  characterId: string,
  x: number,
  y: number,
  z: number,
  zoneId: string
) {
  const { data, error } = await client
    .from('characters')
    .update({
      position_x: x,
      position_y: y,
      position_z: z,
      zone_id: zoneId,
    })
    .eq('id', characterId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
