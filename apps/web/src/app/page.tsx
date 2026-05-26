import Link from "next/link";

const features = [
  {
    icon: "⚔️",
    title: "Short Meaningful Contracts",
    description:
      "Every quest is a contract with real stakes. Complete objectives in focused sessions that respect your time while delivering deep narrative impact.",
  },
  {
    icon: "🏘️",
    title: "A Living Frontier Town",
    description:
      "Ironvale grows and changes based on collective player actions. Build shops, fortify walls, and watch the town transform from ruins to a thriving settlement.",
  },
  {
    icon: "📜",
    title: "Public Events & Player Deeds",
    description:
      "Your actions echo through the world. Slay a dragon threatening the pass? The town crier announces it. Every deed shapes the shared story.",
  },
  {
    icon: "🔥",
    title: "Weapon + Dragon Memory Progression",
    description:
      "Your weapon grows with you, unlocking abilities tied to your dragon lineage. Ember, Stone, or Storm — each memory path offers unique mastery.",
  },
  {
    icon: "⚖️",
    title: "No Pay-to-Win Foundation",
    description:
      "Skill and dedication determine your power. Cosmetics and convenience only — never combat advantage. The First Road is earned, not bought.",
  },
  {
    icon: "🍺",
    title: "Social Town Life",
    description:
      "Gather at the tavern, trade at the market, duel in the arena. Ironvale is a living community where relationships matter as much as combat prowess.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 text-center">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-600/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <h1 className="ember-gradient-text mb-6 text-7xl font-black tracking-tighter sm:text-8xl md:text-9xl">
            DRACOR
          </h1>
          <p className="mb-4 text-xl text-stone-300 sm:text-2xl md:text-3xl">
            Awaken the dragon memory. Rebuild Ironvale. Walk the First Road.
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-base text-stone-400 sm:text-lg">
            A dark fantasy MMO built on meaningful contracts, a living frontier
            town shaped by player deeds, and a progression system rooted in
            ancient dragon lineage. No pay-to-win. No endless grind. Just the
            road ahead and the choices you make.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/play" className="btn-primary text-lg">
              Play Now
            </Link>
            <a href="#features" className="btn-secondary text-lg">
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            className="h-6 w-6 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-stone-100 sm:text-4xl">
            The Six Pillars
          </h2>
          <p className="mb-16 text-center text-lg text-stone-400">
            What makes Dracor different from every other MMO.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card-dark">
                <div className="mb-4 text-4xl">{feature.icon}</div>
                <h3 className="mb-2 text-xl font-semibold text-stone-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-stone-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
                Play
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/play"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    Launch Game
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    Account Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
                Discover
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/world"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    The World
                  </Link>
                </li>
                <li>
                  <Link
                    href="/technology"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    Technology
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
                Developers
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dev"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    Developer Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dev/roadmap"
                    className="text-sm text-stone-400 transition-colors hover:text-stone-200"
                  >
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
                About
              </h4>
              <p className="text-sm text-stone-500">
                A Waybound Production &mdash; Forging worlds worth fighting for.
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="ember-gradient-text mb-2 text-lg font-bold">
              Dracor: First Road
            </p>
            <p className="text-sm text-stone-500">
              A Waybound Production &mdash; Forging worlds worth fighting for.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
