# Landing Page Redesign — Atmospheric Minimalism

## Summary

Redesign the Dracor landing page (www.thedracor.com) from a generic dark-mode SaaS layout into an atmospheric, cinematic experience. The design language is "Atmospheric Minimalism" — sparse, type-driven, with game renders as the sole source of visual richness.

## Design Principles

1. **Near-monochrome UI.** The site chrome is grayscale/stone. Ember (#f97316) appears exactly 2-3 times per page — never as decoration, only as a deliberate signal.
2. **Game art provides color.** Screenshots and renders from the Babylon.js client (captured via positioned cameras in the Ironvale scene) are the only source of visual richness. The UI never competes.
3. **Typography IS the design.** One font family used expressively — massive wide-tracked headlines, normal body, tight/heavy wordmark. No ornament needed.
4. **Every element earns its space.** No emoji icons, no rounded card borders, no gradients-as-decoration. Space, lines, and grid.
5. **One cinematic moment.** The hero has a single piece of motion (a slow-drifting game render or Ken Burns on a captured frame). Everything below is still.

## Typography System

| Role | Treatment |
|------|-----------|
| Page title (DRACOR) | 80-160px, weight 800, letter-spacing 0.3em, uppercase |
| Section headlines | 32-56px, weight 700, letter-spacing 0.15em, uppercase |
| Subtitle / tagline | 14-18px, weight 400, letter-spacing 0.2em, uppercase, color #666 |
| Statement text | 24-36px, weight 300, line-height 1.5, color #999, key phrases white/ember |
| Body / descriptions | 14px, weight 400, line-height 1.7, color #666 |
| Labels / numbers | 11px, weight 600, letter-spacing 0.2-0.3em, uppercase |
| Nav links | 12px, weight 500, letter-spacing 0.1em, uppercase |

Font: Use the system's existing Inter, or switch to Geist Sans / Instrument Sans for a slightly more refined feel. Single family throughout — the tracking and weight do the differentiation.

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg-primary | #0a0a0a | Page background |
| bg-elevated | #0d0d0d - #111 | Card/section backgrounds |
| border-subtle | rgba(255,255,255,0.05) | Grid lines, separators |
| text-primary | #e8e8e8 | Headlines, key content |
| text-secondary | #999 | Statement body text |
| text-muted | #666 | Descriptions, body copy |
| text-dim | #444 - #333 | Footer, inactive nav |
| accent-ember | #f97316 | Surgical accent — max 2-3 uses per page |
| accent-ember-hover | #fb923c | Hover states on ember elements |

## Landing Page Sections

### 1. Hero (Full Viewport)

- **Background:** Game render from Babylon.js client at low opacity (0.3). Positioned camera in Ironvale scene — the shrine at dusk with fog. Slow subtle drift animation (CSS transform scale 1→1.05 over 30s, or a Ken Burns pan).
- **Nav:** Transparent overlay at top. Wordmark "DRACOR" left (14px, weight 700, tracking 0.25em). Links right (World, Technology, Account, Play). No background, no border. Appears on scroll with a subtle bg blur.
- **Content:** Centered. Title "DRACOR" at massive scale. Subtitle "Awaken the Dragon Memory" below. Single CTA "Enter Ironvale" — outlined button (1px border, no fill). 
- **Scroll hint:** A single vertical line fading in at bottom center.
- **No sticky navbar.** Nav is part of the hero. On scroll, a minimal sticky nav fades in (just wordmark + links, blurred bg).

### 2. Statement (Typography Only)

- **Max-width 900px, centered.** Large paragraph (24-36px, weight 300) delivering the pitch.
- **Key phrases in white** (font-weight 500). One word/phrase in ember.
- **Generous padding** — 160px top/bottom.
- **No heading, no label.** The text speaks for itself.

### 3. Visual Break — Game Render (Full Bleed)

- **Height:** 60vh.
- **Content:** Full-bleed game render — the road through Ironvale Outskirts. Captured from in-engine camera at a cinematic angle.
- **Treatment:** No overlay text. Subtle top/bottom vignette to blend into the dark sections above/below.
- **Static** — no animation. The image carries itself.

### 4. Pillars Grid

- **2-column grid** separated by 1px hairline borders (rgba white at 0.05).
- **6 items** (3 rows x 2 columns).
- **Each item:** Number (01-06 in ember, small/uppercase), title (18px, weight 600), one-sentence description (14px, muted).
- **Section header:** Small uppercase label "Six Pillars" with a 48px horizontal line below.
- **No icons, no emojis, no colors** beyond the numbers.

### 5. Second Visual Break — Game Render

- **Same treatment as section 3.** Different render — the shrine close-up, atmospheric fog.
- **Static.**

### 6. Final CTA

- **Centered.** Headline "Walk the First Road" (large tracked uppercase).
- **One line of body text** below.
- **Single filled button** in ember (#f97316) — "Play Now". This is the ONE filled colored element on the entire page. Maximum contrast and intent.

### 7. Footer

- **Minimal.** Flex row — wordmark + tagline on left, navigation links on right.
- **All text is dim** (#444). No borders above except a single subtle hairline.
- **No multi-column grid.** No social icons. Just the essentials.

## Navigation Behavior

- **On hero:** Transparent overlay, no background. Fully see-through.
- **On scroll (past hero):** Sticky nav fades in — blurred background (rgba(10,10,10,0.8) + backdrop-filter: blur(20px)), same content (wordmark + links). Minimal height.
- **Active state:** White text, no background highlight.
- **Mobile:** Hamburger → full-screen overlay with centered links, large touch targets.

## Motion Budget

| Element | Animation | Duration |
|---------|-----------|----------|
| Hero background render | Scale 1→1.05 (slow drift) | 30s, infinite, CSS only |
| Scroll-triggered nav | Opacity 0→1 | 200ms, on scroll past hero |
| Hover states | Color transitions | 200-300ms |
| Everything else | None | — |

No scroll-triggered fade-ins. No parallax. No particles. The page is still and confident.

## Game Render Capture Strategy

Position cameras in the Babylon.js game client at cinematic angles:
1. **Hero:** Shrine at dusk — wide shot, fog rolling, warm ember glow from shrine flame. Camera slightly elevated, looking down the road.
2. **Visual break 1:** The road stretching through Ironvale Outskirts — dawn light, long shadows, distant mountains.
3. **Visual break 2:** Shrine close-up — atmospheric fog, ember particles from the flame, detail on stone texture.

Export as high-resolution PNGs (2560x1440 minimum) or short video loops (WebM, 10-15s, <2MB). For launch, static PNGs are sufficient — video can be added later.

## Responsive Behavior

- **Desktop (>1024px):** Full expression of the design. 2-column pillar grid, horizontal nav, massive type.
- **Tablet (768-1024px):** Pillars collapse to single column. Type scales down via clamp(). Nav stays horizontal.
- **Mobile (<768px):** All content single column. Hero title scales to ~48-60px. Nav becomes hamburger. Padding reduces to 24px. Visual breaks reduce to 40vh.

## What Gets Removed

- All emoji icons (replaced by numbered labels or nothing)
- `card-dark` class and its rounded border/blur pattern
- The bouncing scroll arrow SVG
- Feature cards with colored backgrounds
- The "Six Pillars" heading with its centered paragraph
- Multi-column footer grid
- `btn-primary` / `btn-secondary` classes (replaced by new CTA styles)
- `ember-gradient-text` class (replaced by flat ember color used surgically)

## What Gets Added

- New global CSS with the monochrome palette and typography system
- Scroll-aware nav component (transparent → sticky on scroll)
- Full-bleed image section component
- Statement/quote section component
- Pillar grid component
- Responsive type scale using CSS clamp()
- Game render assets (captured from client)

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/page.tsx` | Complete rewrite — new landing page structure |
| `apps/web/src/app/globals.css` | New design system CSS (replace component classes) |
| `apps/web/src/components/Navbar.tsx` | New scroll-aware transparent/sticky nav |
| `apps/web/tailwind.config.ts` | Updated color tokens, remove unused colors |
| `apps/web/src/app/layout.tsx` | May need adjustment for transparent nav |
| `apps/web/public/` | Add game render images |

## Out of Scope

- Account dashboard redesign (stays functional, inherits new typography/colors)
- Play portal redesign (stays functional)
- Dev portal redesign (stays functional)
- Character creation redesign
- Actual game client changes
- Video/WebM hero (future enhancement — launch with static image + CSS drift)

## Success Criteria

1. Landing page feels like a AAA game reveal, not a SaaS product.
2. Ember accent appears no more than 3 times on the page.
3. No emoji anywhere on the landing page.
4. Page loads fast — no JS-dependent animations, CSS-only motion.
5. Game renders are the sole source of color/visual richness.
6. Typography hierarchy is clear without any decorative elements.
7. Mobile experience maintains the atmospheric quality (not just a compressed desktop).
