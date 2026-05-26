# Dracor: Deployment Guide

A step-by-step guide to get the Dracor monorepo running locally, pushed to GitHub, and deployed to production on Vercel, Railway, and Supabase.

This guide assumes you are comfortable with a terminal, have used Git before, and have basic knowledge of web deployment — but have never deployed this exact stack (pnpm monorepo + Next.js + Vite + Colyseus + Supabase).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create the GitHub Repository](#2-create-the-github-repository)
3. [Push the Monorepo to GitHub](#3-push-the-monorepo-to-github)
4. [Install pnpm and Dependencies](#4-install-pnpm-and-dependencies)
5. [Create the Supabase Project](#5-create-the-supabase-project)
6. [Apply the SQL Migration](#6-apply-the-sql-migration)
7. [Set Environment Variables Locally](#7-set-environment-variables-locally)
8. [Run the Project Locally](#8-run-the-project-locally)
9. [Test Auth (Sign Up and Log In)](#9-test-auth-sign-up-and-log-in)
10. [Test Character Creation](#10-test-character-creation)
11. [Test the Colyseus Game Server](#11-test-the-colyseus-game-server)
12. [Test the Babylon.js Game Client](#12-test-the-babylonjs-game-client)
13. [Test Multiplayer with Two Tabs](#13-test-multiplayer-with-two-tabs)
14. [Deploy the Next.js Web App to Vercel](#14-deploy-the-nextjs-web-app-to-vercel)
15. [Deploy the Colyseus Game Server to Railway](#15-deploy-the-colyseus-game-server-to-railway)
16. [Deploy the Vite Game Client](#16-deploy-the-vite-game-client)
17. [Update URLs After All Services Are Live](#17-update-urls-after-all-services-are-live)
18. [Common Deployment Errors and Fixes](#18-common-deployment-errors-and-fixes)

---

## 1. Prerequisites

Install these before you start. All are free.

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 or higher | https://nodejs.org (use the LTS installer) |
| pnpm | 9 or higher | See step 4 below |
| Git | Any recent | https://git-scm.com |
| GitHub account | Free tier | https://github.com |
| Supabase account | Free tier | https://supabase.com |
| Vercel account | Free tier (Hobby) | https://vercel.com |
| Railway account | Free trial / $5 plan | https://railway.app |

**Verify Node is installed:**

```bash
node --version
# Should print v20.x.x or higher
```

If you see a version below 20, upgrade Node before continuing. The project uses features that require Node 20+.

---

## 2. Create the GitHub Repository

**Option A — GitHub web UI:**

1. Go to https://github.com/new
2. Repository name: `dracor` (or whatever you prefer)
3. Description: `Dracor: First Road — A browser-first social action RPG`
4. Set to **Public** or **Private** (your choice)
5. Do NOT initialize with a README (you already have one)
6. Do NOT add .gitignore (you already have one)
7. Click **Create repository**
8. Keep this page open — you need the remote URL in the next step

**Option B — GitHub CLI:**

```bash
gh repo create dracor --public --description "Dracor: First Road — A browser-first social action RPG"
```

---

## 3. Push the Monorepo to GitHub

From the root of your Dracor project directory:

```bash
cd /path/to/dracor

# Initialize git if not already done
git init

# Stage all files
git add -A

# Verify what you are about to commit (sanity check)
git status

# Create the first commit
git commit -m "Initial scaffold: Dracor First Road monorepo"

# Set the default branch to main
git branch -M main

# Add your GitHub repo as the remote
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/dracor.git

# Push
git push -u origin main
```

Refresh your GitHub repo page. You should see the full monorepo with `apps/`, `packages/`, `docs/`, `supabase/`, and all root config files.

---

## 4. Install pnpm and Dependencies

**Install pnpm globally (if you do not have it):**

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm --version
# Should print 9.x.x or higher
```

**Install all project dependencies:**

```bash
cd /path/to/dracor
pnpm install
```

This reads `pnpm-workspace.yaml` and installs dependencies for every package and app in the monorepo. It creates a single `node_modules` at the root plus per-package symlinks.

If `pnpm install` fails with an error about the engine version, make sure your Node version is 20+.

---

## 5. Create the Supabase Project

1. Go to https://supabase.com and sign in (or create an account)
2. Click **New Project**
3. Choose your organization (it creates a default "Personal" org)
4. Fill in:
   - **Project name:** `dracor` (or any name you want)
   - **Database password:** Generate a strong password. Save it somewhere — you cannot recover it later.
   - **Region:** Pick the one closest to you or your players
   - **Pricing plan:** Free tier is fine
5. Click **Create new project**
6. Wait 1–2 minutes for provisioning to complete

**Get your API credentials:**

1. In the Supabase dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API** under "Configuration"
3. You need two values:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

Leave this page open. You will paste these values in Step 7.

---

## 6. Apply the SQL Migration

Supabase does not automatically run migration files from your repo. You must apply the schema manually through the SQL editor.

1. In the Supabase dashboard, click **SQL Editor** (left sidebar, looks like a terminal icon)
2. Click **New query** (top right)
3. Open the file `supabase/migrations/0001_initial_schema.sql` from this repo in a text editor
4. Select all the contents (382 lines) and copy them
5. Paste into the Supabase SQL editor
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

You should see `Success. No rows returned` — that is correct. The migration creates tables, not rows (except the seed data at the bottom).

**Verify the migration worked:**

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `profiles`
   - `characters`
   - `items` (should have 8 rows of seed data)
   - `inventory_items`
   - `contracts` (should have 3 rows of seed data)
   - `character_contracts`
   - `world_events`
   - `player_deeds`

If you see all 8 tables, the migration succeeded.

**If the migration fails:**

- Read the error message. The most common cause is running it twice — the tables already exist. If you need to start over, run `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;` first, then re-run the migration.
- Make sure you pasted the entire file, including the seed data at the bottom.

---

## 7. Set Environment Variables Locally

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in the Supabase values from Step 5:

```env
# Supabase — paste your values here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-full-key

# Game Client — leave as default for local dev
NEXT_PUBLIC_GAME_CLIENT_URL=http://localhost:5173
VITE_GAME_SERVER_URL=ws://localhost:2567
VITE_DEFAULT_PLAYER_NAME=Dracor

# Game Server — leave as default for local dev
GAME_SERVER_ALLOWED_ORIGIN=http://localhost:5173
PORT=2567
```

**Important:** The `.env` file is git-ignored. It never gets pushed to GitHub. Each deployment target (Vercel, Railway) gets its own environment variables set through their dashboards.

---

## 8. Run the Project Locally

Start all three apps with one command:

```bash
pnpm dev
```

Turborepo runs these in parallel:

| App | URL | What It Is |
|-----|-----|-----------|
| Web app | http://localhost:3000 | Next.js — auth, characters, landing page |
| Game client | http://localhost:5173 | Vite + Babylon.js — 3D game in the browser |
| Game server | ws://localhost:2567 | Colyseus — multiplayer state server |

Wait until you see output from all three (Next.js compiles, Vite starts, and the game server prints `Listening on 0.0.0.0:2567`).

**If port 3000 is already in use** (common if you run other Next.js projects): kill the other process first with `lsof -ti:3000 | xargs kill` or change the port in `apps/web/package.json`.

---

## 9. Test Auth (Sign Up and Log In)

1. Open http://localhost:3000 in your browser
2. You should see the Dracor landing page with a dark fantasy theme
3. Click **Begin Your Journey** or the **Login** button in the nav
4. Switch to **Sign Up** mode
5. Enter an email and a password (6+ characters)
6. Click **Create Account**

**What happens next depends on your Supabase email settings:**

- **By default**, Supabase sends a confirmation email. Check your inbox (and spam folder) for a confirmation link. Click it to verify your account.
- **To skip email confirmation for development:** Go to Supabase dashboard → **Authentication** → **Providers** → **Email** → Turn OFF "Confirm email". Now sign-ups are instant.

After confirming (or with confirmation disabled), go back to http://localhost:3000/login, enter the same email and password, and click **Sign In**. You should be redirected to the Dashboard.

**If you see "Supabase is not configured":** Double-check your `.env` file. The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values must be filled in. After editing `.env`, restart `pnpm dev`.

---

## 10. Test Character Creation

1. From the Dashboard (http://localhost:3000/dashboard), click **Characters**
2. Click **+ Create New Character**
3. Fill in:
   - **Name:** Any name (2–24 characters)
   - **Weapon:** Click one of the three cards (Blade, Bow, or Staff)
   - **Dragon Memory:** Click one (Ember, Stone, or Storm)
   - **Appearance:** Pick eye color, scale marking, and horn style
4. Click **Create Character**
5. You should be redirected to the characters list showing your new character

**Verify in Supabase:**

Go to Supabase dashboard → **Table Editor** → `characters`. You should see a row with your character's data, including the JSONB `appearance` field containing `{"eyeColor": "...", "scaleMarking": "...", "hornStyle": "..."}`.

---

## 11. Test the Colyseus Game Server

The game server starts automatically with `pnpm dev`. Verify it is running:

**Check the health endpoint:**

```bash
curl http://localhost:2567/health
```

Expected response:

```json
{
  "status": "healthy",
  "uptime": 42.123,
  "players": 0,
  "timestamp": "2026-05-25T..."
}
```

**Check the root endpoint:**

```bash
curl http://localhost:2567/
```

Expected response:

```json
{
  "name": "Dracor Game Server",
  "status": "online",
  "version": "0.1.0"
}
```

If both return valid JSON, the game server is working.

---

## 12. Test the Babylon.js Game Client

1. Open http://localhost:5173 in your browser
2. You should see:
   - A dark 3D scene with a ground plane
   - Several box-shaped "buildings" (placeholder Ironvale)
   - Cone-shaped "trees" around the edges
   - An orange capsule (your player character)
   - A chat box in the bottom-left corner
   - An FPS counter in the top-right corner

3. Press **W/A/S/D** to move your character around
4. Hold **Shift** while moving to sprint
5. Click the chat input, type a message, and press **Enter** to send

**If you see a black screen:** Check the browser console (F12 → Console) for errors. The most common cause is the game server not running — the client logs a warning but still renders the scene in offline mode.

**If you see "Could not connect to game server"** in the console: This is a warning, not a crash. The client runs in offline mode. Make sure the game server is running on port 2567.

---

## 13. Test Multiplayer with Two Tabs

This is the moment of truth for the real-time multiplayer stack.

1. Make sure `pnpm dev` is running (all three apps)
2. Open http://localhost:5173 in **Tab A**
3. Open http://localhost:5173 in **Tab B** (same browser, new tab)
4. Both tabs should connect to the game server. Check the game server terminal — you should see:

   ```
   [WorldRoom] Player joined: Dracor (session-id-1)
   [WorldRoom] Player joined: Dracor (session-id-2)
   ```

5. In Tab A, move with WASD. Look at Tab B — you should see a **blue-gray capsule** moving in real time (that is Tab A's player rendered as a remote player)
6. In Tab B, move with WASD. Look at Tab A — same thing, a blue-gray capsule moves
7. Type a chat message in Tab A. It should appear in Tab B's chat

**If remote players do not appear:**

- Check the browser console in both tabs for WebSocket errors
- Make sure `VITE_GAME_SERVER_URL=ws://localhost:2567` is in your `.env` file
- Restart `pnpm dev` after changing `.env`

**If players appear but do not move:**

- This usually means the Colyseus state synchronization listener is not firing. Check the browser console for schema-related errors
- Ensure the game server and game client are using compatible Colyseus versions (both should be 0.15.x)

---

## 14. Deploy the Next.js Web App to Vercel

Vercel is a free hosting platform that is purpose-built for Next.js.

### Connect the repo

1. Go to https://vercel.com and sign in (create an account if needed — sign in with GitHub for easy repo access)
2. Click **Add New** → **Project**
3. Find your `dracor` repository in the list and click **Import**

### Configure the project

4. **Framework Preset:** Vercel should auto-detect **Next.js**
5. **Root Directory:** Click **Edit** and set it to `apps/web`
   - This is critical. Vercel needs to know which directory contains the Next.js app
6. **Build Command:** Leave as default (`next build` — Vercel handles this)
7. **Output Directory:** Leave as default

### Set environment variables

8. Expand **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `NEXT_PUBLIC_GAME_CLIENT_URL` | Leave blank for now (you will fill this after deploying the game client) |

9. Click **Deploy**
10. Wait 1–3 minutes for the build to complete

**After deployment:**

- Vercel gives you a URL like `https://dracor-abc123.vercel.app`
- Open it in your browser. You should see the Dracor landing page
- Save this URL — you need it for Railway's CORS config later

### Vercel monorepo note

If the build fails with "Cannot find module '@dracor/shared'" or similar:

1. Go to your project settings in Vercel → **General**
2. Under **Root Directory**, confirm it says `apps/web`
3. Go to **Settings** → **General** → scroll to **Install Command**
4. Set it to: `pnpm install`
5. Redeploy

Vercel runs `pnpm install` at the monorepo root (even though the root directory is `apps/web`), which resolves all workspace dependencies. The `transpilePackages` setting in `next.config.js` handles the rest.

---

## 15. Deploy the Colyseus Game Server to Railway

Railway hosts persistent Node.js processes — exactly what Colyseus needs (it cannot run on serverless/edge platforms like Vercel).

### Create the service

1. Go to https://railway.app and sign in (create an account if needed)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `dracor` repository
4. Railway will create a service

### Configure the build

5. Click on the service to open its settings
6. Go to **Settings** tab
7. Under **Build**:
   - **Builder:** Nixpacks (should be default)
   - **Root Directory:** Leave empty (needs the full monorepo root for workspace resolution)
   - **Build Command:** `pnpm --filter @dracor/shared build && pnpm --filter @dracor/game-server build`
   - If Railway auto-detected a different build command, replace it with the above
8. Under **Deploy**:
   - **Start Command:** `pnpm --filter @dracor/game-server start`

### Set environment variables

9. Go to the **Variables** tab and add:

   | Key | Value |
   |-----|-------|
   | `PORT` | `2567` |
   | `GAME_SERVER_ALLOWED_ORIGIN` | Your Vercel URL from step 14, e.g. `https://dracor-abc123.vercel.app` |

   Note: Railway also sets its own `PORT` variable automatically. If there is a conflict, remove your manually set `PORT` and let Railway assign one — the game server reads `process.env.PORT` either way.

10. Click **Deploy** (or Railway may auto-deploy on push)

### Get your Railway URL

11. After deployment succeeds, go to **Settings** → **Networking**
12. Under **Public Networking**, click **Generate Domain**
13. Railway gives you a URL like `https://dracor-game-server-production.up.railway.app`
14. Test it: open `https://your-railway-url.up.railway.app/health` in a browser. You should see:

    ```json
    {"status":"healthy","uptime":12.3,"players":0,"timestamp":"..."}
    ```

Save this URL — you need it for the game client build.

### Important: WebSocket URL format

Your Railway URL uses HTTPS. For WebSocket connections, the game client needs the `wss://` protocol (not `ws://`):

- HTTP health check: `https://your-railway-url.up.railway.app/health`
- WebSocket URL for game client: `wss://your-railway-url.up.railway.app`

---

## 16. Deploy the Vite Game Client

The game client compiles to static HTML/JS/CSS files. You can host it anywhere that serves static files. The easiest options are Vercel or Cloudflare Pages.

### Option A — Deploy to Vercel (as a second project)

1. Go to Vercel → **Add New** → **Project**
2. Select the same `dracor` repo
3. **Framework Preset:** Select **Vite**
4. **Root Directory:** Set to `apps/game-client`
5. **Build Command:** `vite build`
   - Note: Skip the `tsc &&` prefix — Vercel may not have the workspace tsconfig. Just `vite build` is enough for deployment.
6. **Output Directory:** `dist`
7. Add environment variable:

   | Key | Value |
   |-----|-------|
   | `VITE_GAME_SERVER_URL` | `wss://your-railway-url.up.railway.app` |
   | `VITE_DEFAULT_PLAYER_NAME` | `Dracor` |

   **Important:** Vite bakes environment variables into the build at compile time. The `VITE_` prefix means they are embedded in the JavaScript bundle. They are not secret.

8. Click **Deploy**

After deployment, Vercel gives you a URL like `https://dracor-game-client-abc.vercel.app`. Save this.

### Option B — Build locally and deploy to any static host

```bash
# Set the production game server URL at build time
VITE_GAME_SERVER_URL=wss://your-railway-url.up.railway.app \
VITE_DEFAULT_PLAYER_NAME=Dracor \
pnpm --filter @dracor/game-client build
```

The output is in `apps/game-client/dist/`. Upload this folder to:
- **Cloudflare Pages** — free, fast global CDN
- **Netlify** — free tier, drag-and-drop deploy
- **AWS S3 + CloudFront** — more setup, full control
- **GitHub Pages** — free, but requires some config for SPA routing

---

## 17. Update URLs After All Services Are Live

Now that all three services are deployed, you need to update cross-references so they point to each other.

### Update Vercel (web app) with the game client URL

1. Go to Vercel → your web app project → **Settings** → **Environment Variables**
2. Add or update:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_GAME_CLIENT_URL` | `https://your-game-client-url.vercel.app` |

3. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy**

### Update Railway (game server) CORS origin

If you deployed the game client to a different domain than the web app:

1. Go to Railway → your game server service → **Variables**
2. Update `GAME_SERVER_ALLOWED_ORIGIN` to match where players will open the game client from

   If the game client is at `https://dracor-client.vercel.app`, set:
   ```
   GAME_SERVER_ALLOWED_ORIGIN=https://dracor-client.vercel.app
   ```

   If players access the game client from multiple domains, you can use `*` temporarily during development (but restrict this for production).

3. Railway auto-redeploys when variables change

### Final URL map

When everything is deployed, your architecture looks like this:

```
Player opens:         https://dracor.vercel.app          (web app)
  ├── Auth:           https://xyz.supabase.co            (Supabase)
  ├── Play button →   https://dracor-client.vercel.app   (game client)
  │     └── WS →      wss://dracor-server.railway.app    (game server)
  └── DB queries →    https://xyz.supabase.co            (Supabase)
```

---

## 18. Common Deployment Errors and Fixes

### "Cannot find module '@dracor/shared'" (Vercel build)

**Cause:** Vercel is not resolving workspace packages.

**Fix:** Make sure the Root Directory in Vercel is set to `apps/web` (not the monorepo root). Vercel still runs `pnpm install` from the workspace root, but it knows which app to build. The `transpilePackages` in `next.config.js` handles the imports.

If it persists, add a custom **Install Command** in Vercel project settings:
```
pnpm install
```

---

### "ERR_PNPM_OUTDATED_LOCKFILE" (Vercel or Railway)

**Cause:** The lockfile does not match `package.json`.

**Fix:** Run locally:
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "Update lockfile"
git push
```

---

### CORS error: "Access-Control-Allow-Origin" (game client → game server)

**Cause:** The game server rejects connections from the game client's domain.

**Fix:** Set `GAME_SERVER_ALLOWED_ORIGIN` on Railway to the exact URL of your deployed game client, including protocol:
```
GAME_SERVER_ALLOWED_ORIGIN=https://dracor-client.vercel.app
```

Do not include a trailing slash. The protocol matters (`https` not `http`).

---

### "WebSocket connection failed" (game client cannot reach game server)

**Cause:** Wrong WebSocket URL or Railway is not exposing the port.

**Fix checklist:**
1. Verify `VITE_GAME_SERVER_URL` uses `wss://` (not `ws://`) for production
2. Verify Railway has a public domain enabled (Settings → Networking → Generate Domain)
3. Verify the Railway service is running (check the deploy logs)
4. Test the health endpoint: open `https://your-railway-url/health` in a browser
5. Remember: Vite bakes env vars at build time. After changing `VITE_GAME_SERVER_URL`, you must **rebuild and redeploy** the game client

---

### "relation 'characters' does not exist" (Supabase query fails)

**Cause:** The SQL migration was not applied.

**Fix:** Go to Supabase SQL Editor, paste the full contents of `supabase/migrations/0001_initial_schema.sql`, and run it.

---

### Supabase auth returns "Invalid API key"

**Cause:** Wrong environment variable value.

**Fix checklist:**
1. The key should be the **anon/public** key, not the **service_role** key
2. Copy the full key — it is very long (starts with `eyJ`)
3. Make sure there are no extra spaces or newlines
4. On Vercel, make sure the variable name is exactly `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Railway build fails with "command not found: pnpm"

**Cause:** Nixpacks did not detect pnpm.

**Fix:** Make sure `pnpm-lock.yaml` exists in the repo root. Nixpacks uses the lockfile to determine the package manager. If missing:
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "Add lockfile"
git push
```

---

### Railway build fails with "@dracor/config" not found

**Cause:** The build command does not install workspace dependencies.

**Fix:** Make sure the Railway Root Directory is empty (repo root), NOT set to `apps/game-server`. The full monorepo root is needed so pnpm can resolve `workspace:*` references.

---

### Game client shows black screen with no errors

**Cause:** Babylon.js requires WebGL. Some browsers or environments block it.

**Fix:**
1. Check `chrome://gpu` — WebGL must be enabled
2. Try a different browser
3. Check that no browser extension is blocking WebGL (privacy extensions sometimes do)
4. In an incognito window, open the game client URL

---

### "ExperimentalWarning: ... decorators" in game server logs

**Cause:** Node.js printing a warning about TypeScript decorators.

**Fix:** This is harmless. The Colyseus schema decorators work correctly despite the warning. If it bothers you, start the server with:
```bash
NODE_OPTIONS="--no-warnings" node dist/index.js
```

---

### Next.js build warning: "useSearchParams() should be wrapped in Suspense"

**Cause:** Next.js 14 warns when `useSearchParams` is used without a Suspense boundary.

**Fix:** This is a warning, not an error. The app works correctly. To suppress it, you can wrap the page component that uses `useSearchParams` in a `<Suspense>` boundary. This is a cosmetic fix for the Next.js 14 strict mode.

---

## Deployment Checklist

Use this as a final verification after all services are deployed:

- [ ] **Supabase:** Tables exist. Seed data in `items` (8 rows) and `contracts` (3 rows).
- [ ] **Web app (Vercel):** Landing page loads. Login works. Character creation works.
- [ ] **Game server (Railway):** `https://your-railway-url/health` returns JSON with `"status":"healthy"`.
- [ ] **Game client:** 3D scene loads. Player capsule visible. WASD movement works.
- [ ] **End-to-end:** Open game client in two browser tabs. Both connect. Movement in one tab appears in the other. Chat messages sync.
- [ ] **CORS:** No `Access-Control-Allow-Origin` errors in browser console.
- [ ] **Auth flow:** Sign up on web app → create character → click Play → game client opens with character name in URL.
