export default function NetcodePage() {
  return (
    <div>
      <h1 className="ember-gradient-text mb-6 text-4xl font-black tracking-tight">
        Netcode
      </h1>

      <div className="space-y-12">
        {/* Overview */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Authoritative Server Model
          </h2>
          <p className="text-stone-300 leading-relaxed">
            Dracor uses a fully authoritative server architecture built on
            Colyseus. The game server is the single source of truth for all game
            state. Clients never simulate game logic — they send input messages
            describing what the player intends to do, and the server decides the
            outcome. This design makes cheating architecturally impossible rather
            than merely detectable.
          </p>
        </section>

        {/* Input Messages */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Input-Based Messaging
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            Clients send lightweight input messages rather than position updates.
            A movement message contains the direction vector and whether the
            player is sprinting — not the resulting position. The server applies
            the movement according to its own simulation, checking for
            collisions, speed limits, and valid state transitions.
          </p>
          <div className="card-dark">
            <h3 className="mb-3 font-semibold text-stone-200">
              Message Types
            </h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                <span>
                  <strong className="text-stone-200">MoveInput</strong> —
                  Direction vector (x, z) + sprint flag. Server applies velocity
                  and collision.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                <span>
                  <strong className="text-stone-200">ActionInput</strong> —
                  Action type (attack, interact, use item) + target ID. Server
                  validates range, cooldowns, and resources.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                <span>
                  <strong className="text-stone-200">ChatMessage</strong> —
                  Text content + channel. Server validates length, rate limits,
                  and broadcasts to the appropriate scope.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Fixed Tick */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Fixed Tick Simulation
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            The game server runs its simulation loop at a fixed 20Hz tick rate
            (50ms per tick). Every tick, the server processes all queued inputs,
            updates entity positions, resolves combat, checks triggers, and
            produces a new world state snapshot. This fixed rate ensures
            deterministic behavior regardless of server load fluctuations.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card-dark text-center">
              <p className="text-2xl font-bold text-orange-400">20 Hz</p>
              <p className="mt-1 text-sm text-stone-400">Server tick rate</p>
            </div>
            <div className="card-dark text-center">
              <p className="text-2xl font-bold text-orange-400">50 ms</p>
              <p className="mt-1 text-sm text-stone-400">Tick interval</p>
            </div>
            <div className="card-dark text-center">
              <p className="text-2xl font-bold text-orange-400">50</p>
              <p className="mt-1 text-sm text-stone-400">Players per room</p>
            </div>
          </div>
        </section>

        {/* Client-Side Interpolation */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Client-Side Interpolation
          </h2>
          <p className="text-stone-300 leading-relaxed">
            Since the server only sends state at 20Hz, the client interpolates
            between received snapshots to produce smooth 60fps visuals. Entity
            positions are linearly interpolated between the two most recent
            server states. The client renders slightly in the past (one tick of
            buffer) to always have two snapshots available for interpolation.
            This approach produces visually smooth movement even on connections
            with moderate jitter.
          </p>
        </section>

        {/* Delta Sync */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Binary Delta Synchronization
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            Colyseus uses schema-based binary serialization with automatic delta
            encoding. Only fields that changed since the last tick are
            transmitted. A full room state might be several kilobytes, but a
            typical tick delta is measured in bytes. This keeps bandwidth under
            5KB/sec per connected player, making the game playable on mobile
            data connections.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Schema-based serialization with automatic change tracking
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Binary encoding — no JSON overhead on the wire
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Under 5KB/sec bandwidth per connected player
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Room-based horizontal scaling — rooms are independent processes
            </li>
          </ul>
        </section>

        {/* Persistence */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            State Persistence
          </h2>
          <p className="text-stone-300 leading-relaxed">
            The game server writes character state snapshots to Supabase every
            30 seconds and on disconnect. Position, health, inventory, and quest
            progress are persisted so players resume exactly where they left off.
            On room creation, the server loads the latest snapshot for each
            joining character. This decouples persistence from the tick loop —
            the simulation runs in memory at full speed, and database writes
            happen asynchronously on a separate timer.
          </p>
        </section>
      </div>
    </div>
  );
}
