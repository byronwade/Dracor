# Technical Architecture

## System Overview

Dracor uses a split architecture: a web application for account management, a dedicated game server for real-time simulation, and a managed database for persistence.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js Web   │     │   Game Client    │     │   Game Server   │
│   (Vercel)      │     │   (Static/CDN)   │     │   (Railway)     │
│                 │     │                  │     │                 │
│ - Marketing     │     │ - Babylon.js     │◄───►│ - Colyseus      │
│ - Auth          │     │ - Colyseus.js    │ WS  │ - WorldRoom     │
│ - Characters    │     │ - Input/Render   │     │ - State sync    │
│ - Account       │     │                  │     │ - Validation    │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                         │
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Supabase (Managed)                           │
│  - Postgres (characters, inventory, contracts, deeds)               │
│  - Auth (user accounts, JWT tokens)                                 │
│  - Row Level Security                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Why Next.js is NOT the Game Server

Next.js handles:
- Marketing pages and landing content
- User authentication flow (sign up, log in, password reset)
- Character creation and management UI
- Account settings and profile pages

Next.js cannot handle real-time game simulation because:
- **Serverless functions are stateless** — they spin up per-request and cannot hold persistent connections
- **No WebSocket support** — edge/serverless environments don't maintain long-lived bidirectional connections
- **No tick loop** — game simulation requires a persistent process running at 20+ ticks/second
- **No shared memory** — each serverless invocation is isolated, so players can't share a world state

## Why Colyseus Owns Live State

Colyseus is a Node.js multiplayer framework purpose-built for authoritative game servers.

- **Room-based architecture:** Each WorldRoom is a self-contained game instance with its own state and tick loop
- **Built-in state synchronization:** `@colyseus/schema` automatically encodes and patches state to all connected clients — only deltas are sent
- **Handles reconnection:** Clients can drop and reconnect without losing their session (within a timeout window)
- **Scales per-room:** Each room holds up to 50 players. Multiple rooms can exist simultaneously
- **Authoritative model:** The server is the source of truth. Client sends inputs, server validates and applies them. No client-side cheating of position or stats

## Why Supabase Owns Persisted State

Supabase provides a managed Postgres database with auth and real-time subscriptions.

- **Postgres for durable data:** Characters, inventory, contract history, deeds, profiles — anything that must survive a server restart
- **Row Level Security (RLS):** Players can only read/write their own data. Policies enforced at the database level
- **Auth for user management:** Email/password sign-up, JWT tokens, session management — handled entirely by Supabase Auth
- **No live ticks:** Supabase is not involved in the game loop. It handles CRUD operations for saving/loading state between sessions

## How the Game Client Connects

1. **Build:** Vite compiles TypeScript + Babylon.js into static assets (HTML, JS, CSS)
2. **Deploy:** Static assets served from a CDN (Vercel or Cloudflare Pages)
3. **Load:** Player opens the client URL in a browser
4. **Connect:** Client establishes a WebSocket connection to the Colyseus game server
5. **Sync:** Colyseus sends the full room state. Client receives and renders all players/objects
6. **Render:** Babylon.js renders the 3D scene — ground, environment, player meshes, other players
7. **Input:** Player presses movement keys or types chat. Client sends messages to the server (`move`, `chat`)
8. **Validate:** Server checks all input — clamps positions, sanitizes chat, rejects invalid data
9. **Broadcast:** Server applies valid state changes. Colyseus automatically syncs deltas to all clients

## Deployment Architecture

| Component | Platform | Type | URL (local) |
|-----------|----------|------|-------------|
| Web App | Vercel | Serverless (Next.js) | http://localhost:3000 |
| Game Client | Vercel / Cloudflare Pages | Static files | http://localhost:5173 |
| Game Server | Railway | Persistent process | ws://localhost:2567 |
| Database | Supabase | Managed Postgres | (Supabase dashboard) |

## Scaling Notes

- Each Colyseus room holds 50 players (configured in WorldRoom)
- Multiple rooms can coexist on the same server process
- Future: shard by zone (one room per zone, players move between rooms)
- Railway can scale vertically (more CPU/RAM) or horizontally (multiple instances with a load balancer)
- Supabase scales independently — connection pooling handles concurrent database access

## Security Model

| Layer | Protection |
|-------|-----------|
| Client input | All movement clamped to bounds (-500 to 500 on X/Z, 0 to 100 on Y). Non-numeric values rejected |
| Chat | Content trimmed, max 250 characters, empty messages rejected |
| Rate limiting | Future: per-client message throttling to prevent spam |
| Auth tokens | User identity verified server-side before accessing character data from Supabase |
| Client trust | The client is never trusted. It is a view layer and input sender only. The server is authoritative |
| Database | Row Level Security ensures users can only access their own records |
| CORS | Game server only accepts connections from configured allowed origins |
