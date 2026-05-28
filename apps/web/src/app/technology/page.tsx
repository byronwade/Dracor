import Link from "next/link";

const sections = [
  {
    title: "Browser-First",
    description:
      "No downloads. No launchers. No 50GB patches. Open a URL and play. Dracor renders a full 3D world directly in your browser using WebGPU and WebGL2 — the same technologies that power modern web graphics at native speed.",
    bullets: [
      "Instant access from any device with a modern browser",
      "WebGPU for cutting-edge desktop performance",
      "WebGL2 fallback ensures broad compatibility",
      "Under 10MB initial load to reach gameplay",
    ],
  },
  {
    title: "High-End Landscapes",
    description:
      "Babylon.js 7 powers Dracor's rendering pipeline — PBR materials, hardware-instanced foliage, terrain streaming, and post-processing effects that push browser visuals toward standalone game quality.",
    bullets: [
      "Physically-based rendering with metallic/roughness workflow",
      "Thousands of instanced trees and grass patches",
      "Terrain chunks stream in based on player proximity",
      "Bloom, ambient occlusion, and tonemapping post-processing",
      "Four quality tiers adapt to your hardware automatically",
    ],
  },
  {
    title: "Authoritative Multiplayer",
    description:
      "The Colyseus game server owns all game state. Clients send inputs — what keys you press — not where your character is. The server simulates movement, validates actions, and broadcasts results. Cheating is architecturally prevented, not just detected.",
    bullets: [
      "Server runs at 20Hz fixed tick rate",
      "Input-based networking: client sends intent, server decides outcome",
      "Binary delta synchronization — only changed state is transmitted",
      "Under 5KB/sec bandwidth per player",
      "50 players per room with room-based horizontal scaling",
    ],
  },
  {
    title: "Persistent World",
    description:
      "Supabase Postgres stores everything that matters — your characters, inventory, contract history, deeds, and reputation. Row Level Security ensures your data is yours. Progress saves automatically every 30 seconds.",
    bullets: [
      "PostgreSQL with Row Level Security for every table",
      "Character state persists across sessions and server restarts",
      "Contract progress tracked and resumable",
      "Public deed board stored permanently",
      "Auth handled entirely by Supabase — email, JWT, sessions",
    ],
  },
  {
    title: "Visual Goals",
    description:
      "Atmospheric dark fantasy landscapes that rival standalone games — rendered in your browser. Dense pine forests, misty valleys, ember-lit shrines, and golden hour lighting. Composition and atmosphere over raw polygon count.",
    bullets: [
      "Stylized semi-realistic art direction — not photorealistic, not cartoonish",
      "LOD system with 3 detail levels per object",
      "Baked ambient occlusion plus one dynamic directional shadow",
      "Fog, sky gradients, and lighting as primary beauty tools",
      "Performance overlay (F3) for real-time visual debugging",
    ],
  },
  {
    title: "Fair Foundation",
    description:
      "No pay-to-win. A free player has identical combat power and progression speed as a paying player. Cosmetics only. Direct pricing in real currency — no premium coins, no gem packs, no currency obfuscation.",
    bullets: [
      "Zero gameplay advantage from spending money",
      "Cosmetic weapon skins, armor appearances, housing decorations",
      "Direct pricing: items cost dollars, not invented currencies",
      "No daily quests, no login streaks, no FOMO mechanics",
      "No loot boxes with power items — ever",
    ],
  },
];

export default function TechnologyPage() {
  return (
    <div className="flex flex-col pt-20">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-600/5 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="ember-gradient-text mb-6 text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl">
            Technology
          </h1>
          <p className="text-lg text-stone-400 sm:text-xl">
            A browser-first MMO built on modern web technology. No compromises
            on visuals. No compromises on fairness.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-4xl space-y-16">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-4 text-2xl font-bold text-stone-100 sm:text-3xl">
                {section.title}
              </h2>
              <p className="mb-6 text-base leading-relaxed text-stone-400">
                {section.description}
              </p>
              {section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-3 text-sm text-stone-300"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-6 text-lg text-stone-400">
            The road is open. The world is waiting.
          </p>
          <Link href="/account/login" className="btn-primary text-lg">
            Begin Your Journey
          </Link>
        </div>
      </section>
    </div>
  );
}
