import type { Metadata } from "next";
import { RacesGallery } from "./RacesGallery";

export const metadata: Metadata = {
  title: "Lineages of the Frontier — Dracor",
  description:
    "Nine peoples walk the First Road. Each carries a different legacy from before the Sundering. Choose the blood that runs through your character.",
};

export default function RacesPage() {
  return (
    <main className="relative min-h-screen bg-surface">
      <section className="relative border-b border-line-subtle px-8 py-32 text-center lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06),transparent_60%)]" />
        <div className="relative">
          <p className="font-display text-xs font-bold uppercase tracking-label text-ember-500/80">
            Codex · The First Road
          </p>
          <h1 className="mt-6 font-display text-section font-extrabold uppercase tracking-headline text-content-primary">
            Lineages of the Frontier
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-content-secondary">
            Nine peoples survived the Sundering. Each one carries a different fragment of the world
            that came before — in their blood, in their bones, in the weapons they refuse to set down.
          </p>
        </div>
      </section>

      <RacesGallery />
    </main>
  );
}
