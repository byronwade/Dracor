# Dracor: Production Deployment Guide

Step-by-step instructions for deploying every Dracor service to production with custom domains.

See [DOMAIN_STRATEGY.md](DOMAIN_STRATEGY.md) for the full domain architecture and DNS table.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Deploy apps/web to Vercel](#2-deploy-appsweb-to-vercel)
3. [Attach thedracor.com to apps/web](#3-attach-thedracorcom-to-appsweb)
4. [Attach play/account/dev subdomains to apps/web](#4-attach-playaccountdev-subdomains-to-appsweb)
5. [Deploy apps/game-client](#5-deploy-appsgame-client)
6. [Attach game.thedracor.com](#6-attach-gamethedracorcom)
7. [Deploy apps/game-server to Railway](#7-deploy-appsgame-server-to-railway)
8. [Attach server.thedracor.com to Railway](#8-attach-serverthedracorcom-to-railway)
9. [Environment variables for Vercel (apps/web)](#9-environment-variables-for-vercel-appsweb)
10. [Environment variables for Vercel (apps/game-client)](#10-environment-variables-for-vercel-appsgame-client)
11. [Environment variables for Railway](#11-environment-variables-for-railway)
12. [Common DNS mistakes](#12-common-dns-mistakes)
13. [Common CORS/WebSocket mistakes](#13-common-corswebsocket-mistakes)

---

## 1. Prerequisites

You need accounts and access for:

| Service | Purpose | Sign up |
|---------|---------|---------|
| Vercel | Hosts the Next.js web app and the Vite game client (two separate projects) | https://vercel.com (free Hobby tier) |
| Railway | Hosts the Colyseus game server (persistent Node.js process) | https://railway.app ($5/month plan or free trial) |
| Supabase | Auth, Postgres database, Row Level Security | https://supabase.com (free tier) |
| Domain registrar | DNS management for thedracor.com | Wherever you purchased the domain (Cloudflare, Namecheap, etc.) |
| GitHub | Source repository — Vercel and Railway deploy from here | https://github.com |

Make sure the Supabase project is created and the migration applied before deploying. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) sections 5-6 for the Supabase setup walkthrough.

---

## 2. Deploy apps/web to Vercel

This is the main Next.js application that serves the marketing site, play portal, account dashboard, and developer portal.

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New** > **Project**
3. Select the `dracor` repository and click **Import**
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Click **Edit** and set to `apps/web`
   - **Build Command:** Leave default (`next build`)
   - **Output Directory:** Leave default
5. Add environment variables (see [section 9](#9-environment-variables-for-vercel-appsweb) for the full list)
6. Click **Deploy**

After deployment, Vercel gives you a URL like `https://dracor-abc123.vercel.app`. This is the preview URL. You will attach your custom domain next.

**If the build fails with "Cannot find module '@dracor/shared'":**

1. Go to project **Settings** > **General**
2. Under **Install Command**, set: `pnpm install`
3. Confirm Root Directory is `apps/web`
4. Redeploy

Vercel runs `pnpm install` from the monorepo root, resolving all `workspace:*` dependencies. The `transpilePackages` array in `next.config.js` handles the imports at build time.

---

## 3. Attach thedracor.com to apps/web

1. In the Vercel dashboard, go to your web app project
2. Click **Settings** > **Domains**
3. Type `thedracor.com` and click **Add**
4. Vercel displays the DNS records you need to create

For an apex domain (no `www` prefix), you need an **A record** or an **ALIAS record** depending on your registrar:

| Registrar supports ALIAS/ANAME | DNS record to create |
|-------------------------------|---------------------|
| Yes (Cloudflare, DNSimple, etc.) | ALIAS `thedracor.com` -> `cname.vercel-dns.com` |
| No (most registrars) | A `thedracor.com` -> `76.76.21.21` |

If using an A record, also add the Vercel IPv6 address if your registrar supports AAAA records: `2606:50c0:8000::6f`.

5. Wait for DNS propagation (usually 1-5 minutes, can take up to 48 hours)
6. Vercel automatically provisions an SSL certificate once the DNS resolves

**Optional: www redirect**

Add `www.thedracor.com` as a second domain in Vercel. Create a CNAME record `www` pointing to `cname.vercel-dns.com`. Vercel will redirect www to the apex domain.

---

## 4. Attach play/account/dev subdomains to apps/web

All three subdomains point to the **same** Vercel project as the apex domain. Vercel serves the same deployment for all attached domains. Next.js middleware detects the hostname and rewrites requests to the correct route prefix.

For each subdomain, repeat these steps:

### play.thedracor.com

1. In Vercel project **Settings** > **Domains**, add `play.thedracor.com`
2. At your DNS registrar, create:

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | play | cname.vercel-dns.com |

### account.thedracor.com

1. Add `account.thedracor.com` in Vercel domains
2. DNS record:

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | account | cname.vercel-dns.com |

### dev.thedracor.com

1. Add `dev.thedracor.com` in Vercel domains
2. DNS record:

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | dev | cname.vercel-dns.com |

After all three are added, Vercel shows four domains attached to the same project:

```
thedracor.com           -> apps/web deployment
play.thedracor.com      -> apps/web deployment (same)
account.thedracor.com   -> apps/web deployment (same)
dev.thedracor.com       -> apps/web deployment (same)
```

The Next.js middleware inspects `request.headers.get('host')` and rewrites accordingly. In local development, path-based routing (`/play`, `/account`, `/dev`) achieves the same result without needing subdomain configuration.

---

## 5. Deploy apps/game-client

The game client is a separate Vite project that builds to static HTML/JS/CSS. It is deployed as a **second Vercel project** (not the same project as apps/web).

1. Go to Vercel > **Add New** > **Project**
2. Select the same `dracor` repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `apps/game-client`
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
4. Add environment variables (see [section 10](#10-environment-variables-for-vercel-appsgame-client))
5. Click **Deploy**

**Important:** Vite bakes `VITE_` environment variables into the JavaScript bundle at build time. They are not server-side secrets. After changing any `VITE_` variable, you must rebuild and redeploy.

**Alternative: Cloudflare Pages**

If you prefer Cloudflare Pages, connect the repo, set the build command to `cd apps/game-client && npx vite build`, output directory to `apps/game-client/dist`, and add the same `VITE_` environment variables.

---

## 6. Attach game.thedracor.com

1. In the game-client Vercel project (not the web project), go to **Settings** > **Domains**
2. Add `game.thedracor.com`
3. At your DNS registrar, create:

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | game | cname.vercel-dns.com |

4. Wait for DNS propagation and SSL provisioning
5. Verify by opening `https://game.thedracor.com` — you should see the Babylon.js 3D scene

---

## 7. Deploy apps/game-server to Railway

The Colyseus game server is a persistent Node.js process that maintains WebSocket connections. It cannot run on serverless platforms like Vercel.

1. Go to https://railway.app and sign in
2. Click **New Project** > **Deploy from GitHub repo**
3. Select the `dracor` repository
4. Click on the service to configure it

### Build settings

5. Go to the **Settings** tab
6. Under **Build**:
   - **Builder:** Nixpacks (default)
   - **Root Directory:** Leave **empty** (the full monorepo root is needed for pnpm workspace resolution)
   - **Build Command:** `pnpm --filter @dracor/shared build && pnpm --filter @dracor/game-server build`
7. Under **Deploy**:
   - **Start Command:** `pnpm --filter @dracor/game-server start`

### Environment variables

8. Go to the **Variables** tab and add the variables from [section 11](#11-environment-variables-for-railway)
9. Deploy (Railway may auto-deploy on push)

### Verify

10. After deployment, check the health endpoint:

```
https://your-railway-service.up.railway.app/health
```

Expected response:

```json
{"status": "healthy", "uptime": 12.3, "players": 0, "timestamp": "..."}
```

**If the build fails with "command not found: pnpm":** Ensure `pnpm-lock.yaml` exists in the repo root. Nixpacks uses the lockfile to detect pnpm.

**If the build fails with "@dracor/config not found":** Confirm the Root Directory is empty (repo root), NOT `apps/game-server`. The monorepo root is required so pnpm can resolve `workspace:*` dependencies.

---

## 8. Attach server.thedracor.com to Railway

1. In Railway, go to your game server service > **Settings** > **Networking**
2. Under **Public Networking**, click **Generate Domain**
3. Railway assigns a URL like `dracor-game-server-production.up.railway.app`
4. At your DNS registrar, create:

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | server | dracor-game-server-production.up.railway.app |

5. In Railway, go to **Settings** > **Networking** > **Custom Domain**
6. Add `server.thedracor.com`
7. Railway verifies the CNAME and provisions SSL

After this, the game server is reachable at:

- Health check: `https://server.thedracor.com/health`
- WebSocket: `wss://server.thedracor.com`

---

## 9. Environment Variables for Vercel (apps/web)

Set these in the Vercel dashboard for the web app project under **Settings** > **Environment Variables**. Apply to all environments (Production, Preview, Development) unless noted.

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | From Supabase dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...your-full-key` | The **anon/public** key, not service_role |
| `NEXT_PUBLIC_SITE_URL` | `https://thedracor.com` | Apex domain |
| `NEXT_PUBLIC_PLAY_URL` | `https://play.thedracor.com` | Play portal subdomain |
| `NEXT_PUBLIC_ACCOUNT_URL` | `https://account.thedracor.com` | Account subdomain |
| `NEXT_PUBLIC_DEV_URL` | `https://dev.thedracor.com` | Developer portal subdomain |
| `NEXT_PUBLIC_GAME_CLIENT_URL` | `https://game.thedracor.com` | Points to the separate game client deployment |
| `NEXT_PUBLIC_GAME_SERVER_URL` | `wss://server.thedracor.com` | WebSocket URL for the game server |

After adding or changing variables, redeploy for changes to take effect.

---

## 10. Environment Variables for Vercel (apps/game-client)

Set these in the game-client Vercel project (the second project).

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `VITE_GAME_SERVER_URL` | `wss://server.thedracor.com` | Must use `wss://` (not `ws://`) in production |
| `VITE_PUBLIC_SITE_URL` | `https://thedracor.com` | Used for links back to the main site |
| `VITE_PUBLIC_ACCOUNT_URL` | `https://account.thedracor.com` | Used for account-related links from the game |
| `VITE_DEFAULT_PLAYER_NAME` | `Dracor` | Fallback player name when not authenticated |

**Remember:** Vite embeds these at build time. Changing a `VITE_` variable requires a full rebuild and redeploy. The values are visible in the client-side JavaScript bundle.

---

## 11. Environment Variables for Railway

Set these in Railway under the game server service > **Variables** tab.

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `GAME_SERVER_ALLOWED_ORIGINS` | `https://thedracor.com,https://play.thedracor.com,https://account.thedracor.com,https://game.thedracor.com,https://dev.thedracor.com` | Comma-separated list of allowed CORS origins |
| `PORT` | `2567` | Railway may also set its own PORT — if there is a conflict, remove this and let Railway assign one |

**Use the plural form** `GAME_SERVER_ALLOWED_ORIGINS` (not the singular `GAME_SERVER_ALLOWED_ORIGIN`). The server accepts both for backward compatibility, but the plural form is canonical and supports multiple origins as a comma-separated list.

Include every domain that will make requests to the game server. Missing an origin results in CORS errors for players on that domain.

---

## 12. Common DNS Mistakes

### Wrong record type for the apex domain

The apex domain (`thedracor.com` without any prefix) cannot use a CNAME record per the DNS specification. Use an A record pointing to `76.76.21.21`, or an ALIAS/ANAME record if your registrar supports it (Cloudflare calls this a "flattened CNAME").

### Using CNAME for the apex

If you create a CNAME for `thedracor.com`, it will break MX records (email) and potentially other DNS records. Always use an A record or ALIAS for the apex.

### TTL propagation delays

After creating or changing DNS records, propagation can take anywhere from 1 minute to 48 hours depending on TTL values and upstream caching. During this window:

- Vercel may show "Invalid Configuration" for the domain
- SSL certificate provisioning will fail until DNS resolves
- Some visitors may see the old destination while others see the new one

Start with a low TTL (300 seconds / 5 minutes) when first setting up. You can increase it later for performance.

### www vs apex mismatch

If you add `www.thedracor.com` to Vercel but forget to add the apex `thedracor.com` (or vice versa), one will work and the other will not. Add both and let Vercel handle the redirect.

### Wildcard vs specific subdomains

Do not use a wildcard (`*.thedracor.com`) CNAME pointing to Vercel unless you want every possible subdomain to route there. Create specific records for `play`, `account`, `dev`, `game`, and `server`. A wildcard can interfere with email (MX), verification (TXT), and other DNS records.

### Forgetting to add the domain in Vercel/Railway

Creating the DNS record alone is not enough. You must also add the domain in the hosting platform's dashboard. The DNS record tells the internet where to route traffic; the platform configuration tells the server how to handle it.

---

## 13. Common CORS/WebSocket Mistakes

### Missing origin in GAME_SERVER_ALLOWED_ORIGINS

The most common production CORS error. The game server checks the `Origin` header of every request against the allowed list. If the requesting domain is not in the list, the browser blocks the connection.

**Fix:** Add every domain that loads the game client to `GAME_SERVER_ALLOWED_ORIGINS`. This includes:

- `https://game.thedracor.com` (the primary game client domain)
- `https://thedracor.com` (if the web app embeds or links to the game client)
- `https://play.thedracor.com` (if the play portal makes direct requests)
- Any Vercel preview URLs you want to test with (e.g., `https://dracor-abc123.vercel.app`)

### ws:// vs wss:// in production

In local development, the game client connects via `ws://localhost:2567` (unencrypted). In production, you must use `wss://` (WebSocket Secure). Browsers block mixed content — an HTTPS page cannot open a `ws://` connection.

**Fix:** Set `VITE_GAME_SERVER_URL=wss://server.thedracor.com` for the production build. The `wss://` protocol uses the same TLS certificate as HTTPS.

### Railway domain format

Railway-generated domains look like `dracor-game-server-production.up.railway.app`. When referencing this as a WebSocket URL, use `wss://dracor-game-server-production.up.railway.app` (not `https://`). The protocol matters in the connection string.

If you have attached a custom domain (`server.thedracor.com`), use `wss://server.thedracor.com` instead.

### Missing protocol in allowed origins

`GAME_SERVER_ALLOWED_ORIGINS` values must include the full protocol:

- Correct: `https://game.thedracor.com`
- Wrong: `game.thedracor.com`
- Wrong: `https://game.thedracor.com/` (no trailing slash)

### Vite env vars require rebuild

Changing `VITE_GAME_SERVER_URL` in the Vercel dashboard does **not** take effect until you redeploy the game client. Vite bakes the value into the JavaScript bundle at build time. If you update the variable, trigger a new deployment in Vercel.

### WebSocket blocked by corporate firewalls

Some corporate networks and proxies block WebSocket connections on non-standard ports. Railway and Vercel both serve WebSocket traffic on port 443 (the standard HTTPS port), which avoids most firewall issues. If you host the game server on a custom port, players behind restrictive firewalls may not be able to connect.

### CORS preflight with credentials

If the game client sends cookies or auth headers to the game server, the browser issues a CORS preflight (OPTIONS) request. The game server must respond with the correct `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` headers. Using `*` as the origin does not work when credentials are included — you must list the specific origin.
