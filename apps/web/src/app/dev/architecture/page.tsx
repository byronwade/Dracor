export default function ArchitecturePage() {
  return (
    <div>
      <h1 className="ember-gradient-text mb-6 text-4xl font-black tracking-tight">
        Architecture
      </h1>

      <div className="space-y-12">
        {/* Overview */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            System Overview
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            Dracor is composed of four independent services that communicate
            through well-defined boundaries. Each service owns its domain and
            can be developed, deployed, and scaled independently.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-dark">
              <h3 className="mb-2 font-semibold text-orange-400">
                Web App (Next.js)
              </h3>
              <p className="text-sm text-stone-400">
                The marketing site, account management, character creation, and
                play launcher. Server-rendered where possible, client-interactive
                where needed. Handles authentication flows via Supabase Auth and
                serves as the entry point for all player-facing content.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-2 font-semibold text-orange-400">
                Game Client (Babylon.js + Vite)
              </h3>
              <p className="text-sm text-stone-400">
                A standalone single-page application built with Babylon.js 7 and
                bundled via Vite. Renders the 3D game world, handles player
                input, and communicates with the game server over WebSocket.
                Hosted separately at game.thedracor.com.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-2 font-semibold text-orange-400">
                Game Server (Colyseus)
              </h3>
              <p className="text-sm text-stone-400">
                The authoritative multiplayer server. Runs game simulation at a
                fixed 20Hz tick rate, validates all player actions, manages room
                state, and broadcasts delta updates to connected clients. No
                game logic runs on the client.
              </p>
            </div>
            <div className="card-dark">
              <h3 className="mb-2 font-semibold text-orange-400">
                Database (Supabase / Postgres)
              </h3>
              <p className="text-sm text-stone-400">
                PostgreSQL with Row Level Security for persistent data:
                characters, inventory, contracts, deeds, and reputation.
                Supabase provides authentication, real-time subscriptions, and
                storage. The game server writes state snapshots every 30 seconds.
              </p>
            </div>
          </div>
        </section>

        {/* Communication */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Service Communication
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            The web app communicates with Supabase directly via the client SDK
            for auth and data queries. The game client connects to the Colyseus
            server over WebSocket for real-time gameplay. The game server reads
            and writes to Supabase via the service role key for persistence
            operations. No direct communication exists between the web app and
            the game server — the game client is the bridge.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Web App &#8594; Supabase: REST + Realtime (auth, characters, profiles)
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Game Client &#8594; Game Server: WebSocket (inputs, state sync)
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Game Server &#8594; Supabase: Service-role REST (persistence snapshots)
            </li>
            <li className="flex items-start gap-3 text-sm text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
              Web App &#8594; Game Client: URL redirect with character param
            </li>
          </ul>
        </section>

        {/* Subdomain Strategy */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Domain Architecture
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            In production, services are exposed through subdomains of
            thedracor.com. The Next.js middleware handles host-based routing,
            rewriting subdomain requests to the appropriate path prefix. In
            local development, everything runs at localhost:3000 under normal
            path routing.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="py-3 pr-4 text-left font-medium text-stone-400">Domain</th>
                  <th className="py-3 text-left font-medium text-stone-400">Service</th>
                </tr>
              </thead>
              <tbody className="text-stone-300">
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">thedracor.com</td>
                  <td className="py-3">Landing page and marketing content</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">play.thedracor.com</td>
                  <td className="py-3">Game launcher and play hub</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">account.thedracor.com</td>
                  <td className="py-3">Account dashboard, login, and character management</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">dev.thedracor.com</td>
                  <td className="py-3">Developer portal and technical documentation</td>
                </tr>
                <tr className="border-b border-stone-800/50">
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">game.thedracor.com</td>
                  <td className="py-3">Babylon.js game client (separate Vite app)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-xs text-orange-400">server.thedracor.com</td>
                  <td className="py-3">Colyseus game server (WebSocket)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Monorepo Structure */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-stone-100">
            Monorepo Structure
          </h2>
          <p className="mb-4 text-stone-300 leading-relaxed">
            The project uses a Turborepo monorepo with pnpm workspaces. Shared
            packages (UI components, database types, shared utilities) are
            consumed by all apps. Each app has its own build pipeline and can be
            deployed independently.
          </p>
          <div className="card-dark font-mono text-xs leading-6 text-stone-400">
            <pre>{`apps/
  web/         # Next.js (thedracor.com + subdomains)
  game/        # Babylon.js + Vite (game.thedracor.com)
  server/      # Colyseus (server.thedracor.com)
packages/
  ui/          # Shared React components
  shared/      # Types, constants, utilities
  database/    # Supabase client, migrations, types`}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
