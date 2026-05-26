# Netcode Architecture

## Authoritative Server

The server owns all game state. The client is a view layer and input sender. The client never tells the server where the player is — it tells the server what keys are pressed.

This is the foundation of anti-cheat. If the server calculates all positions, a modified client cannot teleport, speed-hack, or clip through walls.

## Client Input Messages

Every tick, the client sends an input message:

| Field | Type | Description |
|-------|------|-------------|
| seq | number | Sequence number for reconciliation |
| moveX | number | Horizontal input axis (-1 to 1) |
| moveZ | number | Forward/back input axis (-1 to 1) |
| yaw | number | Camera/character facing direction |
| sprint | boolean | Whether sprint key is held |
| jump | boolean | Whether jump was pressed this frame |
| dt | number | Client delta time since last input |

The message contains what the player intends to do, not the result of doing it. The server applies these inputs to the CharacterMotor and determines the actual position.

## Server Simulation

The server runs a fixed 20Hz tick loop:

1. Collect all queued input messages from connected clients
2. For each client, apply their inputs to their CharacterMotor instance
3. Run trigger volume checks (zone entry, NPC proximity, event areas)
4. Update game state (NPC behavior, enemy AI, contract progress)
5. Broadcast state patches to all clients via Colyseus schema synchronization

Each tick has a 50ms budget. If simulation takes longer, the server is overloaded.

## Colyseus Schema Synchronization

State is defined using `@colyseus/schema` decorators. The schema system:

- Tracks which fields changed since the last broadcast
- Encodes only the deltas (changed fields) into a binary patch
- Sends the patch to each connected client
- Client-side schema applies the patch and fires change callbacks

This means a 50-player room does not send 50 full player states every tick. It sends only the fields that actually changed — typically position and velocity for moving players.

## Fixed Tick Loop

The server tick runs at a constant rate (20Hz = every 50ms) regardless of:

- Client framerate (clients may run at 30, 60, or 144 FPS)
- Network latency (clients receive updates at the server's rate, not their own)
- Number of connected clients (all clients receive the same tick)

Fixed tick ensures deterministic simulation. The same inputs at the same tick always produce the same result.

## Interpolation

Remote players (other players in your view) are rendered using interpolation:

- The client buffers the two most recent server snapshots for each remote player
- Rendering interpolates between the older and newer snapshot based on elapsed time
- This introduces ~100ms of visual delay for remote players
- The tradeoff is smooth motion instead of jerky position updates

Interpolation lives in `packages/netcode/src/interpolation.ts`.

## Future: Client Prediction

Not yet implemented. The current client shows server-authoritative state directly, which means local movement has one round-trip of latency.

When implemented, client prediction will:

1. Apply local inputs to the CharacterMotor immediately (same code as server)
2. Render the predicted position without waiting for the server
3. Store a buffer of recent inputs with sequence numbers
4. When a server state arrives with a sequence number, compare predicted position to authoritative position
5. If they match, discard old inputs. Prediction was correct.
6. If they differ, reset to the server position and replay all inputs since that sequence number

This eliminates perceived input latency for the local player while keeping the server authoritative.

## Future: Reconciliation

Reconciliation is the process of correcting a misprediction:

1. Server sends authoritative state tagged with the last processed input sequence
2. Client finds that sequence in its input buffer
3. Client resets local state to the server's authoritative position
4. Client replays all inputs after that sequence number through the CharacterMotor
5. The result becomes the new predicted position

Done correctly, reconciliation is invisible to the player. The camera does not snap or rubber-band unless the prediction was wildly wrong (which indicates cheating or extreme lag).

## What Supabase Stores

Supabase handles persistent RPG data that survives server restarts:

| Data | Table | Updated |
|------|-------|---------|
| Character stats | characters | On level up, gear change |
| Inventory | inventory | On item gain/loss |
| Contract progress | contracts | On contract accept/complete |
| Deeds | deeds | On deed earn |
| Reputation | reputation | On rep change |

Supabase does NOT store:

- Live player positions (that is Colyseus room state)
- Real-time movement data
- Chat messages (ephemeral, in-memory only)
- Tick-by-tick game simulation

The game server reads from Supabase when a player joins (load character) and writes to Supabase periodically (save progress every 30 seconds) and on significant events (contract complete, level up, deed earned).

## Anti-Cheat Principles

| Principle | Implementation |
|-----------|---------------|
| Never trust client values | Server calculates HP, XP, gold, damage. Client values are display-only |
| Validate movement speed | Server rejects movement faster than max sprint speed + tolerance |
| Rate-limit inputs | Max 30 input messages per second per client. Excess is dropped |
| Reject impossible sequences | Jump while in air, attack while dead, interact at distance |
| Sanitize all strings | Chat messages trimmed, length-limited, HTML-stripped |
| Clamp all numbers | Position clamped to world bounds. Stats clamped to valid ranges |

The client should be treated as hostile. Any value it sends could be fabricated. The server must validate everything before applying it to game state.

## Bandwidth Budget

| Direction | Rate | Size | Total |
|-----------|------|------|-------|
| Upstream (client to server) | 20 packets/sec | ~40 bytes per input message | < 1 KB/sec |
| Downstream (server to client) | 20 patches/sec | Variable, only changed fields | < 5 KB/sec |

For a 50-player room where 10 players are actively moving, downstream is roughly:

- 10 moving players x 12 bytes (position xyz) x 20 ticks/sec = 2.4 KB/sec
- Plus overhead for schema encoding, headers, other state changes
- Total stays under 5 KB/sec per client

This is well within browser WebSocket capabilities and mobile data budgets.
