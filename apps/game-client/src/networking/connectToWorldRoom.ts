import { Client, Room } from 'colyseus.js';

/**
 * Connect to the game server's world_room via Colyseus.
 */
export async function connectToWorldRoom(
  serverUrl: string,
  playerName: string
): Promise<Room> {
  const client = new Client(serverUrl);
  const room = await client.joinOrCreate('world_room', { name: playerName });
  return room;
}
