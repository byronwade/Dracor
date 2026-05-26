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
      {/* Hero */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
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

        <div className="relative z-10 text-center px-8">
          <h1
            className="text-hero font-extrabold uppercase tracking-monument text-content-primary mb-6"
            style={{ textIndent: "0.3em" }}
          >
            DRACOR
          </h1>
          <p className="text-sm sm:text-base font-normal uppercase tracking-subtitle text-content-muted mb-12">
            Awaken the Dragon Memory
          </p>
          <Link href="/play" className="cta-outline">
            Enter Ironvale
          </Link>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-transparent to-content-dim" />
      </section>

      {/* Statement */}
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

      {/* Visual Break 1 */}
      <section className="relative h-[60vh] overflow-hidden border-y border-line-subtle">
        <Image
          src="/renders/road-dawn.svg"
          alt="The road through Ironvale Outskirts"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-transparent to-surface/60" />
      </section>

      {/* Pillars */}
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

      {/* Visual Break 2 */}
      <section className="relative h-[60vh] overflow-hidden border-y border-line-subtle">
        <Image
          src="/renders/shrine-closeup.svg"
          alt="The shrine, shrouded in fog"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-transparent to-surface/60" />
      </section>

      {/* Final CTA */}
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

      {/* Footer */}
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
