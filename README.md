# Dracor: First Road

A browser-first social action RPG for players who miss MMO wonder without MMO chores. Log in, take a contract, fight something dangerous, return to town with loot, and see your name on the deed board. All in 20 minutes. No install. No daily guilt. High-end 3D visuals rendered directly in your browser.

## Vision

- **Browser-first MMO-lite:** No downloads, no launchers. Open a URL and play in a full 3D world
- **High-end visuals:** Atmospheric dark fantasy landscapes with PBR materials, instanced foliage, and post-processing — pushing browser rendering toward standalone game quality
- **Short meaningful sessions:** 15-30 minutes of play always results in tangible progress
- **No pay-to-win:** Cosmetics only. A free player is exactly as powerful as a paying one. Direct pricing, no premium currency obfuscation

## Tech Stack

| Technology | Role |
|-----------|------|
| TypeScript | Language across all packages |
| pnpm 9 | Package manager |
| Turborepo | Monorepo build orchestration |
| Next.js 14 | Web app (auth, characters, marketing pages) |
| Babylon.js 7 | 3D game rendering (WebGPU + WebGL2) |
| Colyseus 0.15 | Authoritative multiplayer game server |
| Supabase | Auth, Postgres database, Row Level Security |
| Tailwind CSS 3 | Web app styling |
| Vite 5 | Game client bundler |
| Railway | Game server hosting (persistent process) |
| Vercel | Web app and game client hosting |

## Architecture

```
dracor/
├── apps/
│   ├── web/                    # Next.js — auth, character creation, marketing pages
│   ├── game-client/            # Vite + Babylon.js — 3D game rendered in browser
│   └── game-server/            # Colyseus — authoritative multiplayer server
├── packages/
│   ├── renderer-core/          # Engine bootstrap, quality tiers, materials, instancing, post-processing
│   ├── world-data/             # Zone manifests, terrain chunks, biomes, foliage, landmarks
│   ├── physics-core/           # Kinematic character motor, collision layers, terrain collision
│   ├── netcode/                # Input-based movement, server snapshots, interpolation, validation
│   ├── asset-pipeline/         # Asset manifests, budgets, compression targets, validation
│   ├── config/                 # Shared TypeScript and build configuration
│   ├── database/               # Supabase client, queries, types
│   ├── game-data/              # Static game data (NPCs, items, contracts, zones)
│   ├── shared/                 # Shared types (character, player, events, items)
│   └── ui/                     # Shared UI components
├── tools/
│   ├── world-validator/        # Validates zone manifests against schema and budget constraints
│   ├── asset-optimizer/        # Analyzes asset sizes and reports budget violations
│   └── terrain-tools/          # Terrain heightmap analysis and chunk generation utilities
├── supabase/
│   └── migrations/             # SQL schema migrations
├── docs/                       # Architecture documentation
├── turbo.json                  # Turborepo task configuration
├── pnpm-workspace.yaml         # Workspace definition
└── package.json                # Root package with dev scripts
```

## Domain Architecture

| Domain | Service | Local Equivalent |
|--------|---------|-----------------|
| thedracor.com | Web app (Vercel) | http://localhost:3000 |
| play.thedracor.com | Web app — play portal | http://localhost:3000/play |
| account.thedracor.com | Web app — account | http://localhost:3000/account |
| dev.thedracor.com | Web app — dev portal | http://localhost:3000/dev |
| game.thedracor.com | Game client (Vercel) | http://localhost:5173 |
| server.thedracor.com | Game server (Railway) | ws://localhost:2567 |

In production, `thedracor.com`, `play.`, `account.`, and `dev.` all point to the same Vercel deployment. Next.js middleware rewrites requests based on the hostname. The game client and game server are deployed separately.

See [docs/DOMAIN_STRATEGY.md](docs/DOMAIN_STRATEGY.md) for DNS configuration details.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step deployment instructions.

### Packages

| Package | Description |
|---------|-------------|
| `renderer-core` | Babylon.js engine initialization, WebGPU/WebGL2 detection, quality tier system, PBR material presets, emissive materials for magic effects, hardware instancing for foliage, post-processing pipeline (bloom, SSAO, vignette, tonemapping), performance monitoring |
| `world-data` | Zone manifest definitions, terrain chunk specifications, biome regions with foliage assignments, landmark positions, road waypoints, asset lists per zone, streaming cell boundaries |
| `physics-core` | Kinematic CharacterMotor (position, velocity, gravity, ground snap, jump, slope limits), collision layer bitmasks, terrain height sampling, trigger volumes (sphere/box), interactable prompts |
| `netcode` | Input message format (seq, moveX, moveZ, yaw, sprint, jump, dt), server tick rate constants, snapshot buffering, interpolation for remote players, input validation and rate limiting |
| `asset-pipeline` | Asset manifest types, mesh and texture budget definitions, compression target specifications (Draco, KTX2), manifest validation against performance budgets |

### Tools

| Tool | Description |
|------|-------------|
| `world-validator` | Validates zone manifests — checks terrain chunk completeness, asset references, spawn point validity, budget compliance |
| `asset-optimizer` | Analyzes asset manifests against tier budgets — reports oversized meshes, uncompressed textures, missing LODs |
| `terrain-tools` | Terrain heightmap analysis — chunk boundary validation, slope calculation, height range verification |

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **pnpm 9+** — Install with `npm install -g pnpm`
- **A Supabase project** — Free tier works. [supabase.com](https://supabase.com)

## Quick Start

```bash
pnpm install
pnpm dev
```

| App | URL | Description |
|-----|-----|-------------|
| Web (marketing) | http://localhost:3000 | Next.js — landing page (thedracor.com) |
| Web (play) | http://localhost:3000/play | Play portal (play.thedracor.com) |
| Web (account) | http://localhost:3000/account | Account dashboard (account.thedracor.com) |
| Web (dev) | http://localhost:3000/dev | Developer portal (dev.thedracor.com) |
| Game Client | http://localhost:5173 | Vite + Babylon.js — 3D game (game.thedracor.com) |
| Game Server | ws://localhost:2567 | Colyseus — multiplayer server (server.thedracor.com) |

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Run TypeScript type checking across the monorepo |
| `pnpm lint` | Run linting across all packages |
| `pnpm clean` | Remove all build artifacts |
| `pnpm validate:world` | Validate zone manifests against schema and budgets |
| `pnpm optimize:assets` | Analyze asset manifests for budget violations |
| `pnpm analyze:client` | Build the game client and report bundle size |
| `pnpm test:server` | Typecheck the game server and test the health endpoint |

## Testing Multiplayer

1. Run `pnpm dev` to start all services
2. Open http://localhost:5173 in one browser tab
3. Open http://localhost:5173 in a second tab (or a different browser)
4. Both clients connect to the same Colyseus WorldRoom
5. Move in one tab — see the movement reflected in the other
6. Type a chat message — see it appear in both tabs

## Performance Overlay

Press **F3** in the game client to toggle the performance overlay. It displays:

- FPS and frame time
- Draw call count
- Visible triangle count
- Texture memory usage
- Active foliage instances
- Current quality tier
- Network message rates

## Deployment

The project deploys as three separate services:

- **Web App** → Vercel (serverless Next.js) — serves thedracor.com, play., account., and dev. subdomains from one deployment
- **Game Client** → Vercel or Cloudflare Pages (static files) — serves game.thedracor.com
- **Game Server** → Railway (persistent Node.js process) — serves server.thedracor.com

For production deployment with custom domains, DNS configuration, and environment variables, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

For the original step-by-step walkthrough covering local setup, Supabase configuration, and first deployment, see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

## Architecture Docs

| Document | Description |
|----------|-------------|
| [TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) | System overview, why each service exists, how they connect |
| [VISUAL_PIPELINE.md](docs/VISUAL_PIPELINE.md) | Rendering pipeline, PBR workflow, terrain chunking, LOD, post-processing |
| [ART_DIRECTION.md](docs/ART_DIRECTION.md) | Visual identity, color palette, lighting, silhouette readability, UI aesthetic |
| [PHYSICS_ARCHITECTURE.md](docs/PHYSICS_ARCHITECTURE.md) | Kinematic motor, collision layers, terrain collision, trigger volumes |
| [NETCODE_ARCHITECTURE.md](docs/NETCODE_ARCHITECTURE.md) | Authoritative server, input messages, tick loop, interpolation, anti-cheat |
| [WORLD_STREAMING.md](docs/WORLD_STREAMING.md) | Zone manifests, terrain chunks, streaming cells, loading priorities |
| [PERFORMANCE_BUDGET.md](docs/PERFORMANCE_BUDGET.md) | Quality tier budgets (Ultra/High/Medium/Low), network budget, server budget |
| [GAME_DESIGN.md](docs/GAME_DESIGN.md) | Core loop, session design, contract board, weapon and memory progression |
| [LORE.md](docs/LORE.md) | The Dracor race, dragon memories, Ironvale, the Waybound |
| [ROADMAP.md](docs/ROADMAP.md) | Milestones 0-6, current progress, future plans |
| [MONETIZATION_PRINCIPLES.md](docs/MONETIZATION_PRINCIPLES.md) | No pay-to-win policy, allowed cosmetics, pricing philosophy |
| [LIVE_OPS.md](docs/LIVE_OPS.md) | Live operations, content rotation, event scheduling |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment with custom domains, DNS, environment variables |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Full deployment walkthrough for Supabase, Vercel, Railway |
| [DOMAIN_STRATEGY.md](docs/DOMAIN_STRATEGY.md) | Subdomain architecture, DNS records, local development mapping |

## Current Scope

What is playable right now:

- Multiplayer movement synchronization (20Hz server tick)
- Real-time chat between all connected players
- 3D scene with Babylon.js (terrain, environment, player meshes, atmospheric lighting)
- Server-authoritative position validation
- Character creation with weapon and memory selection
- Supabase auth integration (sign up, log in)
- Up to 50 players per room
- Performance-tiered rendering (quality auto-detection)

## What's Next

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full milestone breakdown:

- **Milestone 1** — Contract board, persisted progress, NPC interactions
- **Milestone 2** — Basic combat, enemy spawns, health and damage
- **Milestone 3** — Loot, inventory, XP, level progression
- **Milestone 4** — First public event (cooperative defense)
- **Milestone 5** — Reputation system, public deeds
- **Milestone 6** — Housing and social expression
