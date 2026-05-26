# CLAUDE.md

This file provides guidance to Claude Code when working with the Dracor repository.

## What Is This

Dracor: First Road is a browser-first multiplayer action RPG. Players log in, take contracts, fight, and return to town — all in 20-minute sessions. No install required. The game is server-authoritative: the Colyseus game server validates all input and owns game state.

**GitHub:** https://github.com/byronwade/Dracor

## Production URLs

| Domain | Service | Purpose |
|--------|---------|---------|
| https://www.thedracor.com | Vercel (thedracor project) | Main website, landing page |
| https://play.thedracor.com | Vercel (same project) | Play portal |
| https://account.thedracor.com | Vercel (same project) | Account dashboard, login, characters |
| https://dev.thedracor.com | Vercel (same project) | Developer portal, architecture docs |
| https://game.thedracor.com | Vercel (dracor-game project) | Babylon.js 3D game client |
| https://dracor-production.up.railway.app | Railway | Colyseus WebSocket game server |

The four web subdomains (www, play, account, dev) are all served by the same Next.js deployment. Middleware in `apps/web/src/middleware.ts` rewrites requests based on hostname (e.g. `play.thedracor.com/` → `/play`). On localhost, path-based routing works normally without middleware.

## Commands

```bash
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start all three apps via Turborepo (web :3000, game-client :5173, game-server :2567)
pnpm build                # Build all packages and apps
pnpm typecheck            # Type-check all packages (22 tasks)
pnpm clean                # Remove all build artifacts
pnpm validate:world       # Validate zone manifests (builds deps first)
pnpm optimize:assets      # Analyze asset budgets
pnpm analyze:client       # Build game client, check bundle size
pnpm test:server          # Typecheck server + test health endpoint

# Run a single app
pnpm --filter @dracor/web dev
pnpm --filter @dracor/game-client dev
pnpm --filter @dracor/game-server dev

# Build a single package
pnpm --filter @dracor/shared build
pnpm --filter @dracor/netcode build
pnpm --filter @dracor/game-server build

# Type-check a single package
pnpm --filter @dracor/game-server typecheck
pnpm --filter @dracor/game-client typecheck
```

No test runner is configured yet.

## CLI Tools Available

| CLI | Purpose | Auth Status |
|-----|---------|-------------|
| `gh` | GitHub CLI — create repos, PRs, issues | Logged in as byronwade |
| `vercel` | Vercel CLI — deploy, manage env vars, domains | Logged in to wades-web-dev |
| `railway` | Railway CLI — deploy game server, manage vars | Logged in as Byron Wade |
| `supabase` | Supabase CLI — push migrations, link project | Linked to project qxpsbrruxdvscfmlihzt |

### Deployment Commands

```bash
# Push to GitHub (auto-deploys if Vercel/Railway have git integration)
git push origin main

# Deploy web app to Vercel
rm -rf .vercel && vercel link --yes --project thedracor && vercel deploy --prod --yes

# Deploy game client to Vercel
rm -rf .vercel && vercel link --yes --project dracor-game && vercel deploy --prod --yes

# Deploy game server to Railway
railway link -p thedracor -s Dracor
railway up --detach

# Push Supabase migration
supabase db push

# Set Vercel env var (link to project first)
vercel env add VARIABLE_NAME production <<< "value"

# Set Railway env var
railway variables --set "KEY=value"

# Check Railway deployment status
railway deployment list

# Check Railway health
curl -s https://dracor-production.up.railway.app/health
```

## Architecture

pnpm + Turborepo monorepo with 3 apps, 10 packages, and 3 tools.

### Apps

- **`apps/web`** — Next.js 14, App Router. Supabase auth, character creation, marketing pages, dev portal. Host-based middleware for subdomain routing. Styled with Tailwind CSS. Deployed to Vercel as project "thedracor".
- **`apps/game-client`** — Vite + Babylon.js 7. Procedural Ironvale Outskirts scene (terrain, foliage, shrine, mountains, fog, post-processing). Connects to Colyseus via `colyseus.js`. Quality tier auto-detection (WebGPU/WebGL2). F3 performance overlay. Deployed to Vercel as project "dracor-game".
- **`apps/game-server`** — Express + Colyseus 0.15. `WorldRoom` with 50-player cap, 20Hz fixed-tick simulation, input-based movement validation, chat with rate limiting (5 msgs/10s), name sanitization, join/leave system messages. Deployed to Railway.

### Packages

| Package | Description |
|---------|-------------|
| `packages/shared` | TypeScript types: character, player, item, contract, zone, NPC, enemy, events, analytics |
| `packages/config` | Constants (TICK_RATE, WORLD_BOUNDS, etc.), base tsconfig, domain URL helpers |
| `packages/netcode` | ClientInputMessage format, tick rate constants, input validation, snapshot interpolation |
| `packages/physics-core` | Kinematic CharacterMotor, collision layers, procedural terrain height sampling |
| `packages/renderer-core` | Engine bootstrap, quality tiers, PBR/emissive materials, instancing, post-processing, performance monitoring |
| `packages/world-data` | Zone manifests (IRONVALE_OUTSKIRTS), terrain chunks, biomes, foliage, landmarks, asset manifests |
| `packages/asset-pipeline` | Asset manifest types, texture/mesh budgets, compression targets, zone validation |
| `packages/database` | Supabase client (browser + server), typed CRUD for characters/profiles |
| `packages/game-data` | Static game content: NPCs, items, weapons, contracts, zones, enemies, lore |
| `packages/ui` | Shared React components: Button, Card, Badge, Input, PageShell |

### Tools

| Tool | Command | Description |
|------|---------|-------------|
| `tools/world-validator` | `pnpm validate:world` | Validates zone manifests (13 checks) |
| `tools/asset-optimizer` | `pnpm optimize:assets` | Analyzes asset budgets, reports scores |
| `tools/terrain-tools` | `tsx tools/terrain-tools/src/index.ts` | Terrain analysis (vertices, triangles, memory) |

## Data Flow

1. Player authenticates via Supabase on the web app (`account.thedracor.com`), creates a character (persisted to Postgres with RLS).
2. Player clicks Play → launches game client (`game.thedracor.com`) with `?name=CharacterName` in the URL.
3. Game client connects to Colyseus game server via WebSocket (`wss://dracor-production.up.railway.app`).
4. Client sends `"input"` messages (seq, moveX, moveZ, yaw, sprint, jump, dt) at 20Hz. Server validates, simulates movement at 20Hz fixed tick, broadcasts state via Colyseus schema sync.
5. Client sends `"chat"` messages. Server sanitizes (strips control chars, max 250 chars), rate-limits (5/10s), and adds to state.messages. System messages broadcast on join/leave.
6. Remote players rendered as blue-gray capsules with floating name labels. Positions interpolated via lerp. Chat deduplication via seenMessageIds Set.

### Key Colyseus Details

- Room: `"world_room"` defined in `apps/game-server/src/server/createGameServer.ts`
- Schema: `WorldState` (MapSchema<PlayerState>, ArraySchema<ChatState>, tick, worldTime)
- PlayerState fields: id, name, x, y, z, yaw, health, maxHealth, level, weapon, memory, isMoving, lastInputSeq, userId, characterId
- ChatState fields: id, senderId, senderName, content, timestamp. System messages use senderId `"__system__"`.
- Movement bounds: X/Z [-500, 500], Y [-10, 100]
- Name validation: 2-24 chars, `[a-zA-Z0-9_ -']` only, unique per room (suffix appended on collision)
- Chat rate limit: 5 messages per 10-second window per player

## Database

**Supabase project:** qxpsbrruxdvscfmlihzt (us-east-2)

Migrations in `supabase/migrations/`:
- `0001_initial_schema.sql` — Tables: profiles, characters, items, inventory_items, contracts, character_contracts, world_events, player_deeds. RLS on all tables. Seed data: 8 items, 3 contracts.
- `0002_unique_display_names.sql` — Unique indexes on profiles.display_name and characters.name (case-insensitive). Username column on profiles with `^[a-zA-Z0-9_]{3,20}$` validation. Length constraints on display_name (2-24) and character name (2-24).

Push migrations with: `supabase db push`

Supabase credentials are in `.env.local` (git-ignored) and in Vercel env vars for production.

## Web App Route Structure

```
/                          Landing page (server component)
/play                      Play portal — launch game client (client component)
/account                   Account dashboard (client component, AuthGuard)
/account/login             Login / signup (client component)
/account/characters        Character list (client component, AuthGuard)
/account/characters/new    Character creation (client component, AuthGuard)
/dev                       Developer portal index (server component)
/dev/architecture          Architecture docs (server component)
/dev/visual-pipeline       Visual pipeline docs (server component)
/dev/netcode               Netcode docs (server component)
/dev/roadmap               Roadmap milestones (server component)
/world                     World overview (server component)
/technology                Technology page (server component)
```

Legacy routes (`/login`, `/dashboard`, `/characters`, `/characters/new`) still exist alongside `/account/*` equivalents.

### Middleware

`apps/web/src/middleware.ts` rewrites subdomain requests to path prefixes in production:
- `play.thedracor.com/` → `/play`
- `account.thedracor.com/login` → `/account/login`
- `dev.thedracor.com/roadmap` → `/dev/roadmap`

Skips rewrite if pathname already starts with the prefix (prevents `/play/play`). Skips localhost, LAN IPs, `/_next`, `/api`, and static assets.

## Environment Variables

Copy `.env.example` to `.env`. For local dev, leave NEXT_PUBLIC_ domain vars empty (code defaults to localhost). Supabase credentials go in `.env.local`.

| Variable | Where | Local Default | Production |
|----------|-------|---------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Web app | (empty) | `https://qxpsbrruxdvscfmlihzt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web app | (empty) | Set in Vercel |
| `NEXT_PUBLIC_GAME_CLIENT_URL` | Web app | `http://localhost:5173` | `https://game.thedracor.com` |
| `NEXT_PUBLIC_SITE_URL` | Web app | `http://localhost:3000` | `https://www.thedracor.com` |
| `VITE_GAME_SERVER_URL` | Game client | `ws://localhost:2567` | `wss://dracor-production.up.railway.app` |
| `VITE_DEFAULT_PLAYER_NAME` | Game client | `Wanderer` | `Dracor` |
| `GAME_SERVER_ALLOWED_ORIGINS` | Game server | (empty = allow all) | Comma-separated production domains |
| `PORT` | Game server | `2567` | `2567` (Railway may override) |

## Game Client Architecture

```
apps/game-client/src/
├── main.ts                           Entry point
├── env.ts                            Env var access
├── game/
│   ├── GameApp.ts                    Main orchestrator
│   ├── GameLoop.ts                   Render loop
│   ├── InputController.ts            WASD/Shift/Space input
│   ├── PlayerController.ts           Local character motor + mesh
│   ├── CameraController.ts           FollowCamera
│   ├── MultiplayerClient.ts          Colyseus connection + remote players + chat
│   └── ChatController.ts             Chat panel wrapper
├── scenes/
│   ├── IronvaleOutskirtsScene.ts     Scene builder + embedded types/data
│   └── SceneRegistry.ts              Scene lookup by name
├── world/                            Procedural world builders
│   ├── createTerrainFromManifest.ts
│   ├── createFoliageFromManifest.ts
│   ├── createRoadFromManifest.ts
│   ├── createShrineFromManifest.ts
│   ├── createLandmarksFromManifest.ts
│   ├── createSkyAndAtmosphere.ts
│   ├── createWater.ts
│   ├── createDistantMountains.ts
│   └── loadZoneFromManifest.ts
├── ui/                               DOM-based overlays
│   ├── createChatPanel.ts
│   ├── createConnectionStatus.ts
│   ├── createGameHud.ts
│   └── createPerformancePanel.ts
└── networking/
    ├── connectToWorldRoom.ts
    └── networkTypes.ts
```

The game client does NOT import from workspace packages at runtime (Vite can't resolve workspace dist/ during dev). All types from renderer-core, world-data, etc. are embedded locally in `IronvaleOutskirtsScene.ts`.

## Game Server Architecture

```
apps/game-server/src/
├── index.ts                          Bootstrap + graceful shutdown
├── env.ts                            Env validation + startup logging
├── server/
│   ├── createHttpServer.ts           Express + multi-origin CORS
│   ├── createGameServer.ts           Colyseus Server + WebSocketTransport
│   └── routes.ts                     GET /, /health, /status
├── rooms/
│   └── WorldRoom.ts                  Main room: tick loop, input/chat handlers, name validation
├── schema/
│   ├── WorldState.ts                 MapSchema<PlayerState> + ArraySchema<ChatState>
│   ├── PlayerState.ts                @colyseus/schema with @type decorators
│   └── ChatState.ts                  Chat message schema
├── simulation/
│   ├── fixedTickLoop.ts              20Hz setInterval loop
│   ├── simulatePlayerMovement.ts     Yaw-relative movement + terrain snap + bounds clamping
│   ├── validatePlayerInput.ts        Netcode validation + rate limiting + sequence tracking
│   └── worldBounds.ts                Coordinate constants + clamping
├── persistence/
│   ├── persistenceQueue.ts           Batched position saves (30s flush)
│   └── saveCharacterSnapshot.ts      Placeholder for Supabase integration
└── logging/
    └── logger.ts                     Structured console logger
```

Server uses `module: "commonjs"` in tsconfig. Packages it imports (netcode, physics-core) also compile to CJS.

## Security Model

- **Server-authoritative:** Client sends inputs, never positions/health/gold/XP. Server validates all movement.
- **Name sanitization:** Strip control chars, enforce 2-24 char length, `[a-zA-Z0-9_ -']` only. Unique per room.
- **Chat rate limiting:** 5 messages per 10-second window per player. Content stripped of control chars, max 250 chars.
- **Input rate limiting:** Max 30 inputs per second per player. Sequence numbers must increase.
- **CORS:** Production game server only accepts requests from listed origins. No wildcard.
- **Database RLS:** Users can only read/write their own profiles, characters, inventory, contracts. Items and contracts are publicly readable.
- **DB constraints:** Unique indexes on profiles.display_name and characters.name (case-insensitive). Username format: `^[a-zA-Z0-9_]{3,20}$`.

## Engineering Principles

### Code Quality
- **No dead code.** If a function, component, file, or import is not used, delete it. Do not comment it out. Do not leave "for future use" stubs that do nothing.
- **No unused database tables, columns, or rows.** Every table must have a purpose in the current codebase. If a migration adds a table that no code reads or writes, remove it. Seed data must be referenced by actual game logic.
- **Clean naming.** Variables, functions, files, routes, database columns, and env vars must have clear, consistent names. Use `camelCase` for TypeScript, `snake_case` for database columns, `SCREAMING_SNAKE` for constants, `kebab-case` for file names where conventional (CSS, routes).
- **No placeholder files.** Every file must contain real, working code. No empty files, no "TODO: implement" stubs, no files that just re-export nothing.
- **Audit before committing.** Run `pnpm typecheck` and `pnpm build` before committing. If either fails, fix it first.

### Security
- **Server owns truth. Client is untrusted.** Never trust client-sent values for health, XP, gold, inventory, position, or any game-state mutation. The server validates everything.
- **Sanitize all input.** Player names: strip control chars, enforce length, whitelist characters, enforce uniqueness. Chat: strip control chars, enforce length, rate-limit. Movement: validate numeric bounds, reject NaN/Infinity, clamp to world bounds, rate-limit input frequency.
- **No wildcard CORS in production.** The game server must list every allowed origin explicitly. Unknown origins get no CORS headers.
- **No secrets in client bundles.** `NEXT_PUBLIC_*` and `VITE_*` vars are baked into JavaScript and visible to anyone. Never put API secret keys, service role keys, or database passwords in these vars.
- **Database RLS everywhere.** Every table must have Row Level Security policies. Users must only be able to read/write their own data. Public tables (items, contracts, world_events) are read-only for anonymous users.
- **Validate at the boundary.** Validate user input on the server, not just the client. Client validation is for UX; server validation is for security.
- **Unique constraints in the database.** Usernames, display names, and character names must be unique (case-insensitive). Use database constraints, not just application-level checks, because the database is the final authority.

### Architecture
- Babylon.js uses deep imports for tree-shaking: `@babylonjs/core/Engines/engine`, not `@babylonjs/core`.
- Colyseus schemas use `@type()` decorators with `experimentalDecorators: true`.
- Web app uses App Router (not Pages Router). Server components by default, `"use client"` only when hooks are needed.
- Game client does NOT import from workspace packages at runtime. Embed types locally.
- Game server uses CommonJS output. Packages it imports must also compile to CJS.

## Current Status

Working vertical slice: Supabase auth, character creation, real-time multiplayer movement, chat (deduplicated, rate-limited, with join/leave notifications), procedural Ironvale Outskirts scene, quality tier detection, performance overlay, subdomain routing.

See `docs/ROADMAP.md` for milestone plan. See `docs/` for architecture, visual pipeline, netcode, physics, world streaming, art direction, deployment, and domain strategy documentation.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add a new web page | `apps/web/src/app/<route>/page.tsx` |
| Change game server logic | `apps/game-server/src/rooms/WorldRoom.ts` |
| Add Colyseus schema field | `apps/game-server/src/schema/PlayerState.ts` (add `@type` decorator) |
| Change game client scene | `apps/game-client/src/scenes/IronvaleOutskirtsScene.ts` |
| Add world element | `apps/game-client/src/world/create*.ts` |
| Change movement physics | `apps/game-server/src/simulation/simulatePlayerMovement.ts` (server) + `apps/game-client/src/game/PlayerController.ts` (client) |
| Add database table | `supabase/migrations/0003_*.sql` then `supabase db push` |
| Change chat behavior | `apps/game-server/src/rooms/WorldRoom.ts` (server) + `apps/game-client/src/game/MultiplayerClient.ts` (client) |
| Add domain URL | `packages/config/src/domains.ts` + `apps/web/src/lib/domain-config.ts` + `apps/web/src/middleware.ts` |
| Set Vercel env var | `vercel link --yes --project <name> && vercel env add KEY production <<< "value"` |
| Deploy to Railway | `railway link -p thedracor -s Dracor && railway up --detach` |
