import type { Metadata } from "next";
import { ArmoryGallery } from "./ArmoryGallery";

export const metadata: Metadata = {
  title: "Armory — Dracor",
  description:
    "Every weapon on the First Road has a name and a history. From slim ember-daggers to two-handed greatswords, each is forged for a different style of survival.",
};

export default function ArmoryPage() {
  return (
    <main className="relative min-h-screen bg-surface">
      <section className="relative border-b border-line-subtle px-8 py-32 text-center lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06),transparent_60%)]" />
        <div className="relative">
          <p className="font-display text-xs font-bold uppercase tracking-label text-ember-500/80">
            Codex · The Armory
          </p>
          <h1 className="mt-6 font-display text-section font-extrabold uppercase tracking-headline text-content-primary">
            Weapons of the First Road
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-content-secondary">
            Every weapon has a name and a history. From slim ember-daggers to two-handed greatswords —
            each is forged for a different style of survival. Hover any to see how it sits in hand.
          </p>
        </div>
      </section>

      <ArmoryGallery />
    </main>
  );
}
