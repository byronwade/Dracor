# Domain Strategy

## Overview

Dracor uses a subdomain architecture to separate concerns while sharing a single Next.js deployment for the web surface.

## Domain Map

| Domain | Service | Purpose |
|--------|---------|---------|
| thedracor.com | apps/web (Vercel) | Main marketing website, landing page |
| play.thedracor.com | apps/web (Vercel) | Play portal — character select, launch game |
| account.thedracor.com | apps/web (Vercel) | Account dashboard, login, character management |
| dev.thedracor.com | apps/web (Vercel) | Developer portal, architecture docs, roadmap |
| game.thedracor.com | apps/game-client (Vercel/static) | Babylon.js 3D game client |
| server.thedracor.com | apps/game-server (Railway) | Colyseus WebSocket multiplayer server |

## How It Works

- thedracor.com, play.thedracor.com, account.thedracor.com, and dev.thedracor.com all point to the same Vercel deployment (apps/web)
- Next.js middleware detects the hostname and rewrites requests to the appropriate route prefix
- game.thedracor.com is a separate static deployment of the Vite game client
- server.thedracor.com points to Railway where the Colyseus server runs

## Local Development

In local development, everything runs on localhost with path-based routing:

| Production URL | Local Equivalent |
|---------------|-----------------|
| thedracor.com | http://localhost:3000 |
| play.thedracor.com | http://localhost:3000/play |
| account.thedracor.com | http://localhost:3000/account |
| dev.thedracor.com | http://localhost:3000/dev |
| game.thedracor.com | http://localhost:5173 |
| server.thedracor.com | ws://localhost:2567 |

## DNS Configuration

All web subdomains (play, account, dev) should be CNAME records pointing to the same Vercel deployment as the apex domain. The game subdomain points to its own deployment. The server subdomain points to Railway.

| Record | Type | Target |
|--------|------|--------|
| thedracor.com | A | Vercel IP (or ALIAS) |
| play.thedracor.com | CNAME | cname.vercel-dns.com |
| account.thedracor.com | CNAME | cname.vercel-dns.com |
| dev.thedracor.com | CNAME | cname.vercel-dns.com |
| game.thedracor.com | CNAME | cname.vercel-dns.com (separate Vercel project) |
| server.thedracor.com | CNAME | your-railway-app.up.railway.app |
