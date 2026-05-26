const milestones = [
  {
    phase: "0",
    title: "Foundation",
    status: "complete" as const,
    description:
      "Project scaffolding, monorepo setup, and core infrastructure. Next.js web app, Babylon.js game client skeleton, Colyseus server with basic room, and Supabase database schema with RLS policies.",
    items: [
      "Turborepo monorepo with pnpm workspaces",
      "Next.js web app with auth, characters, and play launcher",
      "Babylon.js scene initialization with PBR pipeline",
      "Colyseus room with player join/leave and state sync",
      "Supabase schema: users, characters, contracts tables",
      "Subdomain architecture and middleware routing",
    ],
  },
  {
    phase: "1",
    title: "Walking the World",
    status: "in-progress" as const,
    description:
      "Basic movement, terrain rendering, and multiplayer presence. Players can move through a terrain chunk, see other players, and interact with the environment at a basic level.",
    items: [
      "WASD movement with server-authoritative position",
      "Terrain chunk loading with heightmap and splat maps",
      "Hardware-instanced trees and foliage",
      "Player name plates and basic animation",
      "Client-side interpolation for smooth remote player movement",
      "Performance overlay (F3) for debugging",
    ],
  },
  {
    phase: "2",
    title: "Ironvale Comes Alive",
    status: "planned" as const,
    description:
      "The town of Ironvale with NPCs, basic interaction, and the contract board. Players can accept contracts, talk to NPCs, and begin structured gameplay loops.",
    items: [
      "Ironvale town zone with buildings and interior spaces",
      "NPC dialogue system with branching responses",
      "Contract board: accept, track, complete, and turn-in",
      "Basic inventory system",
      "Town services: forge, healer, tavern, market",
      "Day-night cycle with lighting transitions",
    ],
  },
  {
    phase: "3",
    title: "Combat & Contracts",
    status: "planned" as const,
    description:
      "The core gameplay loop: accept contracts, venture into the wilderness, fight enemies, and return to town. Combat is action-based with weapon-specific movesets.",
    items: [
      "Melee combat: blade, staff attack combos",
      "Ranged combat: bow aiming and projectile physics",
      "Enemy AI: patrol, aggro, attack patterns, retreating",
      "Dragon memory abilities tied to lineage choice",
      "Contract types: hunt, escort, gather, explore",
      "Death and respawn mechanics",
    ],
  },
  {
    phase: "4",
    title: "Living World",
    status: "planned" as const,
    description:
      "The deed system, public events, and town evolution. Player actions have visible consequences — the town grows, the wilderness changes, and the community shapes the world.",
    items: [
      "Deed board: public record of player accomplishments",
      "Town evolution based on collective player progress",
      "Public events: invasions, trade caravans, festivals",
      "Reputation system affecting NPC behavior",
      "Player housing and town building contributions",
      "World-state persistence across server restarts",
    ],
  },
  {
    phase: "5",
    title: "Polish & Content",
    status: "planned" as const,
    description:
      "Content expansion, visual polish, audio, and the cosmetic shop. Preparing for a wider audience with stability, performance, and a complete new-player experience.",
    items: [
      "Additional zones: Wolfpine Woods, Ashroot Mine, The Old Road",
      "Music and ambient sound design",
      "Particle effects: fire, magic, weather",
      "Cosmetic shop with direct pricing (no loot boxes)",
      "Tutorial and onboarding flow for new players",
      "Performance optimization pass for low-end hardware",
    ],
  },
  {
    phase: "6",
    title: "Open Beta",
    status: "planned" as const,
    description:
      "Public release with full gameplay loop, multiple zones, and community features. Focus on server stability, anti-abuse measures, and player feedback integration.",
    items: [
      "Public access at thedracor.com",
      "Horizontal scaling: multiple room instances",
      "Moderation tools and reporting system",
      "Analytics and telemetry for balancing",
      "Community feedback pipeline",
      "Ongoing live ops and content cadence",
    ],
  },
];

function statusBadge(status: "complete" | "in-progress" | "planned") {
  switch (status) {
    case "complete":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          Complete
        </span>
      );
    case "in-progress":
      return (
        <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
          In Progress
        </span>
      );
    case "planned":
      return (
        <span className="inline-flex items-center rounded-full bg-stone-700/50 px-2.5 py-0.5 text-xs font-medium text-stone-400">
          Planned
        </span>
      );
  }
}

export default function RoadmapPage() {
  return (
    <div>
      <h1 className="ember-gradient-text mb-6 text-4xl font-black tracking-tight">
        Roadmap
      </h1>
      <p className="mb-12 max-w-2xl text-lg text-stone-400">
        Development milestones from project foundation through open beta. Each
        phase builds on the previous, adding depth to the gameplay loop, the
        world, and the platform.
      </p>

      <div className="space-y-8">
        {milestones.map((milestone) => (
          <div key={milestone.phase} className="card-dark">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="mr-3 text-sm font-medium text-stone-500">
                  Phase {milestone.phase}
                </span>
                <h2 className="inline text-xl font-bold text-stone-100">
                  {milestone.title}
                </h2>
              </div>
              {statusBadge(milestone.status)}
            </div>

            <p className="mb-4 text-sm leading-relaxed text-stone-400">
              {milestone.description}
            </p>

            <ul className="grid gap-2 sm:grid-cols-2">
              {milestone.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-stone-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
