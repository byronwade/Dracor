# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Dracor landing page from a generic dark-mode SaaS layout into an atmospheric, cinematic experience using monochrome design, monumental typography, and game renders as the sole visual richness.

**Architecture:** Pure CSS/HTML/React redesign. No new dependencies. One font family (Inter) used expressively via tracking and weight. Scroll-aware navbar using IntersectionObserver. Game render placeholders (dark gradient images) that will be replaced with Babylon.js captures. Tailwind config updated with new monochrome design tokens.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS 3.4, React 18, Inter font (already loaded)

---

### Task 1: Update Tailwind Config — New Design Tokens

**Files:**
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Replace the Tailwind color config**

Remove the old ember/ash/gold palette. Add the new monochrome + surgical accent tokens:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0a",
          raised: "#0d0d0d",
          overlay: "#111111",
        },
        line: {
          subtle: "rgba(255,255,255,0.05)",
          muted: "rgba(255,255,255,0.1)",
        },
        content: {
          primary: "#e8e8e8",
          secondary: "#999999",
          muted: "#666666",
          dim: "#444444",
          faint: "#333333",
        },
        ember: {
          DEFAULT: "#f97316",
          hover: "#fb923c",
          glow: "rgba(249,115,22,0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        monument: "0.3em",
        headline: "0.15em",
        subtitle: "0.2em",
        label: "0.25em",
        nav: "0.1em",
      },
      fontSize: {
        hero: "clamp(80px, 12vw, 160px)",
        section: "clamp(32px, 5vw, 56px)",
        statement: "clamp(24px, 3vw, 36px)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Verify config compiles**

Run: `pnpm --filter @dracor/web dev` briefly, check no Tailwind errors in terminal. Kill the server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat(web): update tailwind config with atmospheric minimalism design tokens"
```

---

### Task 2: Rewrite globals.css — New Design System

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  ::selection {
    background-color: rgba(249, 115, 22, 0.3);
    color: #e8e8e8;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #0a0a0a;
  }

  ::-webkit-scrollbar-thumb {
    background: #222;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #333;
  }

  html {
    scrollbar-color: #222 #0a0a0a;
    scrollbar-width: thin;
    scroll-behavior: smooth;
  }

  body {
    background: #0a0a0a;
    color: #e8e8e8;
  }
}

@layer components {
  /* Utility: surgical ember accent for inline text */
  .text-accent {
    color: #f97316;
  }

  /* Button: outlined CTA (hero, secondary actions) */
  .cta-outline {
    @apply inline-flex items-center justify-center
      border border-white/20 px-10 py-4
      text-[13px] font-medium uppercase tracking-subtitle text-content-primary
      transition-all duration-300;
  }
  .cta-outline:hover {
    @apply border-ember text-ember;
  }

  /* Button: filled CTA (final action, max 1 per page) */
  .cta-filled {
    @apply inline-flex items-center justify-center
      bg-ember px-12 py-[18px]
      text-[13px] font-semibold uppercase tracking-subtitle text-surface
      transition-all duration-300;
  }
  .cta-filled:hover {
    @apply bg-ember-hover;
  }

  /* Card: minimal dark card for non-landing pages (account, play, etc.) */
  .card-dark {
    @apply border border-line-subtle bg-surface-raised p-6 transition-colors hover:border-line-muted;
  }

  /* Input: dark form input for non-landing pages */
  .input-dark {
    @apply w-full border border-line-muted bg-surface-raised px-4 py-3
      text-content-primary placeholder-content-muted
      transition-colors focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember;
  }
}
```

- [ ] **Step 2: Verify styles compile**

Run: `pnpm --filter @dracor/web dev` briefly, check no build errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): rewrite globals.css with atmospheric minimalism design system"
```

---

### Task 3: Create Placeholder Game Render Images

**Files:**
- Create: `apps/web/public/renders/hero-shrine.jpg`
- Create: `apps/web/public/renders/road-dawn.jpg`
- Create: `apps/web/public/renders/shrine-closeup.jpg`

These are temporary dark gradient placeholder images. They'll be replaced with actual Babylon.js captures later.

- [ ] **Step 1: Create the public/renders directory and generate placeholder images**

```bash
mkdir -p apps/web/public/renders
```

Use Node.js to create minimal dark gradient SVGs as placeholders (these will be replaced with actual game renders):

Create file `apps/web/public/renders/hero-shrine.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="g" cx="50%" cy="60%" r="60%">
      <stop offset="0%" stop-color="#1a1008"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
  </defs>
  <rect fill="url(#g)" width="1920" height="1080"/>
</svg>
```

Create file `apps/web/public/renders/road-dawn.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0d0d"/>
      <stop offset="50%" stop-color="#1a1008"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect fill="url(#g)" width="1920" height="1080"/>
</svg>
```

Create file `apps/web/public/renders/shrine-closeup.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="g" cx="40%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1f1209"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
  </defs>
  <rect fill="url(#g)" width="1920" height="1080"/>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/public/renders/
git commit -m "feat(web): add placeholder game render images for landing page"
```

---

### Task 4: Rewrite the Navbar — Scroll-Aware Transparent → Sticky

**Files:**
- Modify: `apps/web/src/components/Navbar.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Rewrite Navbar.tsx**

The navbar must:
- Be transparent over the hero (no background, no border)
- Transition to a sticky blurred bar after scrolling past the hero
- Use an IntersectionObserver on a sentinel element
- Match the new typography system (12px uppercase tracked nav links)

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/world", label: "World" },
  { href: "/technology", label: "Technology" },
  { href: "/account", label: "Account" },
  { href: "/play", label: "Play" },
  { href: "/dev", label: "Dev" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoggedIn(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session);
      });
      return () => subscription.unsubscribe();
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    router.push("/");
  }

  const isHome = pathname === "/";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isHome
            ? "bg-surface/80 backdrop-blur-xl border-b border-line-subtle"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-8 lg:px-12">
          <Link
            href="/"
            className="text-sm font-bold tracking-label text-content-dim transition-colors hover:text-content-primary"
          >
            DRACOR
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-medium uppercase tracking-nav transition-colors ${
                  pathname === link.href
                    ? "text-content-primary"
                    : "text-content-muted hover:text-content-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="text-xs font-medium uppercase tracking-nav text-content-muted transition-colors hover:text-content-primary"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium uppercase tracking-nav text-content-muted transition-colors hover:text-content-primary"
              >
                Login
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center text-content-muted transition-colors hover:text-content-primary md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-8 bg-surface/95 backdrop-blur-xl md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium uppercase tracking-headline transition-colors ${
                  pathname === link.href
                    ? "text-content-primary"
                    : "text-content-muted hover:text-content-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="w-12 border-line-subtle" />
            {isLoggedIn ? (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="text-lg font-medium uppercase tracking-headline text-content-muted transition-colors hover:text-content-primary"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium uppercase tracking-headline text-content-muted transition-colors hover:text-content-primary"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Update layout.tsx — remove Navbar wrapper, add padding-free main**

The layout needs to render the Navbar as a fixed overlay (not pushing content down) and ensure the body has the right font variables.

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Dracor: First Road",
  description:
    "Awaken the dragon memory. Rebuild Ironvale. Walk the First Road. A dark fantasy MMO where every contract matters and your deeds shape a living world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-surface text-content-primary antialiased`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

Note: We remove the Cinzel font import (not used in the new design). The navbar is `position: fixed` so it overlays content — no top padding needed on `<main>` for the landing page (the hero is full viewport). Other pages that need top padding will add `pt-16` themselves.

- [ ] **Step 3: Verify navbar renders**

Run: `pnpm --filter @dracor/web dev`
Open `http://localhost:3000` — navbar should appear transparent. Scrolling should trigger the blurred background.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Navbar.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): rewrite navbar as scroll-aware transparent overlay"
```

---

### Task 5: Rewrite the Landing Page

**Files:**
- Modify: `apps/web/src/app/page.tsx`

This is the core task. The landing page is a server component (no interactivity needed) with 7 sections.

- [ ] **Step 1: Rewrite page.tsx completely**

```tsx
import Link from "next/link";
import Image from "next/image";

const PILLARS = [
  {
    number: "01",
    title: "Short Meaningful Contracts",
    description:
      "Every quest is a contract with real stakes. Complete objectives in focused sessions that respect your time.",
  },
  {
    number: "02",
    title: "A Living Frontier Town",
    description:
      "Ironvale grows based on collective player actions. Build, fortify, and watch it transform.",
  },
  {
    number: "03",
    title: "Public Deeds",
    description:
      "Your actions echo through the world. Every deed shapes the shared story of Ironvale.",
  },
  {
    number: "04",
    title: "Dragon Memory Progression",
    description:
      "Your weapon grows with your lineage. Ember, Stone, or Storm — each path offers unique mastery.",
  },
  {
    number: "05",
    title: "No Pay-to-Win",
    description:
      "Skill and dedication determine power. The First Road is earned, not bought.",
  },
  {
    number: "06",
    title: "Social Town Life",
    description:
      "Gather at the tavern, trade at the market, duel in the arena. Relationships matter.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ──── Hero ──── */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
        {/* Background: game render with slow drift */}
        <div className="absolute inset-0">
          <Image
            src="/renders/hero-shrine.svg"
            alt=""
            fill
            priority
            className="object-cover opacity-30 animate-hero-drift"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-8">
          <h1 className="text-hero font-extrabold uppercase tracking-monument text-content-primary mb-6"
              style={{ textIndent: "0.3em" }}>
            DRACOR
          </h1>
          <p className="text-sm sm:text-base font-normal uppercase tracking-subtitle text-content-muted mb-12">
            Awaken the Dragon Memory
          </p>
          <Link href="/play" className="cta-outline">
            Enter Ironvale
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-transparent to-content-dim" />
      </section>

      {/* ──── Statement ──── */}
      <section className="mx-auto max-w-[900px] px-8 py-32 sm:py-40">
        <p className="text-statement font-light leading-relaxed text-content-secondary">
          A dark fantasy where{" "}
          <strong className="font-medium text-content-primary">
            every contract matters
          </strong>
          . No endless grind. No pay-to-win. Just a living frontier town shaped
          by{" "}
          <em className="not-italic text-ember">your deeds</em>, a weapon that
          grows with your lineage, and twenty-minute sessions that respect your
          time while delivering real narrative weight.
        </p>
      </section>

      {/* ──── Visual Break 1 ──── */}
      <section className="relative h-[60vh] overflow-hidden border-y border-line-subtle">
        <Image
          src="/renders/road-dawn.svg"
          alt="The road through Ironvale Outskirts"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-transparent to-surface/60" />
      </section>

      {/* ──── Pillars ──── */}
      <section className="mx-auto max-w-[1200px] px-8 py-24 sm:py-32 lg:px-12">
        <div className="mb-16 sm:mb-20">
          <h2 className="text-[11px] font-semibold uppercase tracking-label text-content-muted mb-4">
            Six Pillars
          </h2>
          <div className="h-px w-12 bg-content-faint" />
        </div>

        <div className="grid grid-cols-1 gap-px bg-line-subtle border border-line-subtle sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar.number} className="bg-surface p-8 sm:p-12">
              <span className="text-[11px] font-semibold tracking-label text-ember mb-4 block">
                {pillar.number}
              </span>
              <h3 className="text-lg font-semibold text-content-primary mb-3 tracking-wide">
                {pillar.title}
              </h3>
              <p className="text-sm leading-relaxed text-content-muted">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Visual Break 2 ──── */}
      <section className="relative h-[60vh] overflow-hidden border-y border-line-subtle">
        <Image
          src="/renders/shrine-closeup.svg"
          alt="The shrine, shrouded in fog"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-transparent to-surface/60" />
      </section>

      {/* ──── Final CTA ──── */}
      <section className="py-32 sm:py-40 text-center px-8">
        <h2 className="text-section font-bold uppercase tracking-headline text-content-primary mb-6">
          Walk the First Road
        </h2>
        <p className="text-[15px] text-content-muted mb-12 tracking-wide">
          Create your character. Choose your lineage. Enter Ironvale.
        </p>
        <Link href="/play" className="cta-filled">
          Play Now
        </Link>
      </section>

      {/* ──── Footer ──── */}
      <footer className="border-t border-line-subtle">
        <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center sm:items-end justify-between gap-8 px-8 py-16 lg:px-12">
          <div>
            <p className="text-xs font-bold tracking-label text-content-dim mb-2">
              DRACOR
            </p>
            <p className="text-xs text-content-faint">
              A Waybound Production
            </p>
          </div>
          <div className="flex gap-8">
            {["World", "Technology", "Developer", "Roadmap"].map((label) => (
              <Link
                key={label}
                href={
                  label === "Developer"
                    ? "/dev"
                    : label === "Roadmap"
                      ? "/dev/roadmap"
                      : `/${label.toLowerCase()}`
                }
                className="text-xs text-content-dim transition-colors hover:text-content-secondary tracking-wide"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Add the hero drift animation to globals.css**

Append this keyframe animation to the end of `globals.css`:

```css
@keyframes hero-drift {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}

.animate-hero-drift {
  animation: hero-drift 30s ease-in-out infinite alternate;
}
```

- [ ] **Step 3: Verify the landing page renders**

Run: `pnpm --filter @dracor/web dev`
Open `http://localhost:3000`. Check:
- Hero fills the viewport with massive "DRACOR" title
- Statement section has large light text with ember accent on "your deeds"
- Visual breaks show the gradient placeholders
- Pillar grid is 2-column on desktop, 1-column on mobile
- Final CTA has the single filled ember button
- Footer is minimal

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css
git commit -m "feat(web): rewrite landing page with atmospheric minimalism design"
```

---

### Task 6: Fix Non-Landing Pages — Add Top Padding

**Files:**
- Modify: `apps/web/src/app/account/page.tsx`
- Modify: `apps/web/src/app/play/page.tsx`
- Modify: `apps/web/src/app/world/page.tsx`
- Modify: `apps/web/src/app/technology/page.tsx`
- Modify: `apps/web/src/app/dev/page.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/account/login/page.tsx`
- Modify: `apps/web/src/app/account/characters/page.tsx`
- Modify: `apps/web/src/app/characters/page.tsx`
- Modify: `apps/web/src/app/characters/new/page.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

Since the navbar is now `position: fixed` instead of `sticky`, it no longer pushes content down. The landing page hero handles this by being full-viewport. All other pages need `pt-16` added to their outermost wrapper so content isn't hidden behind the fixed nav.

- [ ] **Step 1: Add pt-16 to each non-landing page's outer wrapper**

For each page file, find the outermost `<div>` returned by the component and add `pt-16` to its className. Example patterns:

- `account/page.tsx`: change `<div className="mx-auto max-w-6xl px-4 py-12">` → `<div className="mx-auto max-w-6xl px-4 py-12 pt-20">`
- `play/page.tsx`: change `<div className="mx-auto max-w-2xl px-4 py-12">` → `<div className="mx-auto max-w-2xl px-4 py-12 pt-20">`
- And so on for each page.

The exact `pt-20` value (80px) gives breathing room below the fixed 64px nav.

- [ ] **Step 2: Verify a few pages**

Run: `pnpm --filter @dracor/web dev`
Check `/account`, `/play`, `/world` — content should not be hidden behind the nav.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/
git commit -m "fix(web): add top padding to non-landing pages for fixed navbar"
```

---

### Task 7: Typecheck and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter @dracor/web typecheck
```

Fix any TypeScript errors.

- [ ] **Step 2: Run build**

```bash
pnpm --filter @dracor/web build
```

Fix any build errors.

- [ ] **Step 3: Visual verification in browser**

Run: `pnpm --filter @dracor/web dev`

Check the following pages and confirm they render correctly:
- `http://localhost:3000` — landing page (hero, statement, visual breaks, pillars, CTA, footer)
- `http://localhost:3000/account` — account dashboard (content visible below nav)
- `http://localhost:3000/play` — play portal (content visible below nav)
- `http://localhost:3000/world` — world page (content visible below nav)
- `http://localhost:3000/dev` — dev portal (content visible below nav)

Check responsive at mobile width (375px) — hero title should scale down, pillars should be single column, nav should show hamburger.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(web): typecheck and build fixes for landing page redesign"
```
