import Link from "next/link";

const devPages = [
  {
    href: "/dev/architecture",
    title: "Architecture",
    description:
      "System overview of the Next.js web app, Babylon.js game client, Colyseus authoritative server, and Supabase persistence layer. How the four services communicate and scale.",
  },
  {
    href: "/dev/visual-pipeline",
    title: "Visual Pipeline",
    description:
      "Rendering pipeline details: PBR materials, hardware instancing, terrain streaming, LOD management, and post-processing effects that push browser visuals toward standalone quality.",
  },
  {
    href: "/dev/netcode",
    title: "Netcode",
    description:
      "Multiplayer networking architecture: authoritative server model, input-based messaging, fixed tick simulation, client-side interpolation, and binary delta state sync.",
  },
  {
    href: "/dev/roadmap",
    title: "Roadmap",
    description:
      "Development milestones from project foundation through open beta. Current progress, upcoming features, and long-term vision for the Dracor platform.",
  },
];

export default function DevPortalPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <h1 className="ember-gradient-text mb-4 text-4xl font-black tracking-tight sm:text-5xl">
          Developer Portal
        </h1>
        <p className="max-w-2xl text-lg text-stone-400">
          Technical documentation and architecture references for the Dracor
          platform. Everything a contributor needs to understand how the system
          is built and where it is headed.
        </p>
      </div>

      {/* Page links */}
      <div className="grid gap-6 sm:grid-cols-2">
        {devPages.map((page) => (
          <Link key={page.href} href={page.href} className="card-dark group">
            <h3 className="mb-2 text-lg font-semibold text-stone-100 group-hover:text-orange-400">
              {page.title}
            </h3>
            <p className="text-sm leading-relaxed text-stone-400">
              {page.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
