import { Client, Room } from 'colyseus.js';

export interface JoinOptions {
  name: string;
  characterId?: string;
  userId?: string;
  weapon?: string;
  memory?: string;
  level?: number;
  race?: string;
}

export async function connectToWorldRoom(
  serverUrl: string,
  options: JoinOptions
): Promise<Room> {
  const client = new Client(serverUrl);
  const room = await client.joinOrCreate('world_room', options);
  return room;
}
