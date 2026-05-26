import Link from "next/link";

const sections = [
  {
    title: "Ironvale",
    description:
      "A frontier town built where the Old Road meets the valley. Stone walls patched with fresh timber. A forge that never sleeps. A tavern where Waybound gather to trade rumors and coin. Ironvale spent years in isolation after the roads closed — bandits, wild creatures, and the collapse of neighboring settlements cut it off from the wider world. Now the roads are reopening, and the town is rebuilding. Cautiously optimistic. Desperately in need of capable hands.",
    detail:
      "The social heart of Dracor. Contract board in the town hall. Gearsmith at the forge. Healer in her hut. Information broker at the tavern. Everything a Waybound needs between contracts.",
  },
  {
    title: "Ironvale Outskirts",
    description:
      "Beyond the town walls, pine forests climb rocky hills and ancient roads disappear into the mist. The Outskirts are where contracts begin — wolves patrol the treeline, abandoned carts line the Old Road, and the wilderness reclaims what civilization left behind.",
    detail:
      "The first adventure zone. Dense foliage, mossy boulders, broken stone markers pointing toward forgotten destinations. Close enough to town to retreat. Far enough to feel the frontier.",
  },
  {
    title: "The Ironvale Reach",
    description:
      "A rugged frontier region of forested hills, ancient roads, and abandoned mines. The Reach was once densely settled — a network of towns, trade routes, and industry. Decades of isolation left much of it wild again. Roads are overgrown but passable. Buildings stand empty but intact. The wilderness reclaimed territory, and now people are taking it back.",
    detail:
      "The broader region containing Ironvale, the Old Road, Wolfpine Woods, and Ashroot Mine. Each area offers different challenges, resources, and stories waiting to be uncovered.",
  },
  {
    title: "Dracor Memory Shrines",
    description:
      "Scattered across the land, ancient shrines pulse with ember light. Tall, narrow stone structures marked with dragon script — older than any town, older than the roads themselves. They resonate with the dragon memory carried in Dracor blood.",
    detail:
      "Shrines serve as waypoints, fast-travel anchors, and memory-awakening sites. Activating a shrine strengthens your connection to your dragon lineage. Their ember glow is visible through fog, a warm beacon in cold wilderness.",
  },
  {
    title: "The Waybound Roads",
    description:
      "Once great highways connecting fallen kingdoms, now broken and overgrown. Cracked stone underfoot, moss filling the gaps between paving slabs. Waymarkers still stand at crossroads — weathered but legible if you know what to look for. The roads are reopening because people like you are walking them again.",
    detail:
      "Being Waybound is not a title given by authority. It is a description of what you do. Anyone who walks the roads, takes contracts, reconnects isolated towns, and helps civilization recover is Waybound. The road is the work. The work is the road.",
  },
];

export default function WorldPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-600/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="ember-gradient-text mb-6 text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl">
            The World of Dracor
          </h1>
          <p className="text-lg text-stone-400 sm:text-xl">
            A frontier waking from long silence. Roads reopening. Towns
            rebuilding. Wilderness yielding — slowly — to those brave enough to
            walk the old paths.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-4xl space-y-16">
          {sections.map((section) => (
            <div key={section.title} className="card-dark">
              <h2 className="mb-4 text-2xl font-bold text-stone-100">
                {section.title}
              </h2>
              <p className="mb-4 text-base leading-relaxed text-stone-300">
                {section.description}
              </p>
              <p className="text-sm leading-relaxed text-stone-500">
                {section.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-6 text-lg text-stone-400">
            The road does not wait. Neither should you.
          </p>
          <Link href="/play" className="btn-primary text-lg">
            Return to the Road
          </Link>
        </div>
      </section>
    </div>
  );
}
