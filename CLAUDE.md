# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Dracor: First Road is a browser-first multiplayer action RPG. Players log in, take contracts, fight, and return to town — all in 20-minute sessions. No install required. The game is server-authoritative: the Colyseus game server validates all input and owns game state.

## Commands

```bash
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start all three apps via Turborepo (web :3000, game-client :5173, game-server :2567)
pnpm build                # Build all packages and apps
pnpm typecheck            # Type-check all packages
pnpm clean                # Remove all build artifacts

# Run a single app
pnpm --filter @dracor/web dev
pnpm --filter @dracor/game-client dev
pnpm --filter @dracor/game-server dev

# Type-check a single package
pnpm --filter @dracor/game-server typecheck

# Build shared packages first if types aren't resolving
pnpm --filter @dracor/shared build
```

No test runner is configured yet.

## Architecture

This is a **pnpm + Turborepo monorepo** with three apps and four shared packages.

### Apps

- **`apps/web`** — Next.js 14 site for auth, character creation, marketing. Uses Supabase for auth and database. Styled with Tailwind CSS.
- **`apps/game-client`** — Vite + Babylon.js 7 3D client. Connects to the game server via `colyseus.js`. Has no direct Supabase dependency — player name comes from URL params or env vars.
- **`apps/game-server`** — Express + Colyseus 0.15 authoritative multiplayer server. Defines `WorldRoom` with 50-player cap, 20-tick simulation, server-validated movement and chat. Runs as a persistent process (not serverless).

### Packages

- **`packages/shared`** — TypeScript type definitions (character, player, item, contract, zone, NPC, enemy, events) used across all three apps. This is the type contract between client and server.
- **`packages/database`** — Supabase client factory (`createBrowserClient`, `createServerClient`) and DB types. Used by `apps/web`.
- **`packages/game-data`** — Static game content: NPCs, items, weapons, contracts, zones, enemies, lore, memories. Pure data, no runtime dependencies.
- **`packages/ui`** — Shared React UI components (Button, Card, Badge, Input, etc.) for the web app.
- **`packages/config`** — Shared constants (`MAX_PLAYERS_PER_ROOM`, `WORLD_BOUNDS`, `TICK_RATE`, etc.) and TypeScript config.

### Data Flow

1. Player authenticates via Supabase on the web app, creates a character (persisted to Postgres with RLS).
2. Player launches the game client, which connects to the Colyseus game server over WebSocket.
3. The game server owns all authoritative state via Colyseus schema (`WorldState` with `MapSchema<Player>` and `ArraySchema<ChatMessageSchema>`).
4. Client sends `"move"` and `"chat"` messages; server validates, clamps positions to world bounds ([-500, 500]), and broadcasts state changes.
5. Remote players are rendered as meshes in Babylon.js via `PlayerManager`; positions are sent at ~12 Hz from the client.

### Database

Schema is in `supabase/migrations/0001_initial_schema.sql`. Applied manually via the Supabase SQL Editor (no CLI migration runner). Tables: `profiles`, `characters`, `items`, `inventory_items`, `contracts`, `character_contracts`, `world_events`, `player_deeds`. All tables have RLS policies — users can only access their own data; items, contracts, and world events are publicly readable.

### Key Colyseus Details

- Room name: `"world_room"` (defined in `apps/game-server/src/index.ts`)
- Schema classes are in `apps/game-server/src/rooms/schema/WorldState.ts` (uses `@colyseus/schema` decorators)
- Movement bounds are clamped server-side: X/Z [-500, 500], Y [0, 100]
- Chat is sanitized and capped at 250 chars; rolling 50-message buffer

## Environment Variables

Copy `.env.example` to `.env`. Required for the web app: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The game client/server work without Supabase — the client falls back to offline mode if the game server is unreachable.

## Deployment

- **Web** → Vercel (root directory: `apps/web`)
- **Game Client** → Any static host (build output: `apps/game-client/dist/`). Set `VITE_GAME_SERVER_URL` at build time.
- **Game Server** → Railway (needs persistent process, not serverless). Build: `pnpm --filter @dracor/shared build && pnpm --filter @dracor/game-server build`. Start: `pnpm --filter @dracor/game-server start`.

## Engineering Principles

Prioritize correctness over quantity. If a feature would make the scaffold too brittle, create the clean architecture and a minimal working implementation instead of pretending to finish a huge system. Top-end engineering foundations, not fake complexity.

## Current Status

MVP with: Supabase auth, character creation, real-time multiplayer movement, chat. No combat, trading, inventory UI, or NPC interaction yet. See `docs/ROADMAP.md` for milestone plan.
