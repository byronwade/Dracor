import type { TypedSupabaseClient } from './client';

export async function getProfile(client: TypedSupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertProfile(
  client: TypedSupabaseClient,
  userId: string,
  displayName: string
) {
  const { data, error } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
