"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { RACES } from "@dracor/game-data";
import { LazyViewerCard } from "@/components/LazyViewerCard";
import { SIGNATURE_WEAPON, CHARACTER_GLB } from "@/components/viewer3d/anchors";

const CharacterViewer = dynamic(
  () => import("@/components/CharacterViewer").then((m) => m.CharacterViewer),
  { ssr: false },
);

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  tank:       { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Tank" },
  striker:    { bg: "bg-red-500/10",     text: "text-red-400",     label: "Striker" },
  caster:     { bg: "bg-violet-500/10",  text: "text-violet-400",  label: "Caster" },
  skirmisher: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Skirmisher" },
  support:    { bg: "bg-sky-500/10",     text: "text-sky-400",     label: "Support" },
};

const SIGNATURE_WEAPON_LABEL: Record<string, string> = {
  dagger: "Dagger",
  arming_sword: "Sword",
  longsword: "Long Sword",
  greatsword: "Greatsword",
  bow: "Recurve Bow",
  arrows: "Arrows",
  axe: "War Axe",
  hammer: "War Hammer",
  spear: "Spear",
  staff: "Emberwood Staff",
};

export function RacesGallery() {
  return (
    <section className="relative px-6 py-20 lg:px-12">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {RACES.map((race) => {
          const role = ROLE_COLORS[race.role] ?? ROLE_COLORS.striker;
          const weapon = SIGNATURE_WEAPON[race.id];
          const hasGLB = !!CHARACTER_GLB[race.id];

          return (
            <article
              key={race.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-line-subtle bg-surface-raised/40 backdrop-blur-sm transition-colors hover:border-ember-500/20"
            >
              <LazyViewerCard className="relative aspect-[4/5] w-full overflow-hidden">
                <CharacterViewer raceId={race.id} weapon={weapon} cameraAngle="three-quarter" />
                <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-headline ${role.bg} ${role.text}`}>
                    {role.label}
                  </span>
                  {!hasGLB && (
                    <span className="inline-flex w-fit items-center rounded-full bg-stone-800/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-headline text-stone-400">
                      Procedural
                    </span>
                  )}
                </div>
              </LazyViewerCard>

              <div className="flex flex-1 flex-col gap-3 border-t border-line-subtle bg-surface/80 p-6">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase tracking-headline text-content-primary">
                    {race.name}
                  </h2>
                  <p className="mt-1 text-xs italic text-ember-400/70">{race.tagline}</p>
                </div>

                <p className="text-[13px] leading-relaxed text-content-secondary">
                  {race.description}
                </p>

                <div className="flex items-center gap-4 border-t border-line-subtle pt-3 text-[11px]">
                  <div className="flex items-baseline gap-1.5">
                    <span className="uppercase tracking-headline text-content-muted">Build</span>
                    <span className="font-medium text-content-secondary capitalize">{race.modelConfig.bodyType}</span>
                  </div>
                  <span className="text-content-faint">·</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="uppercase tracking-headline text-content-muted">Carries</span>
                    <span className="font-medium text-content-secondary">{SIGNATURE_WEAPON_LABEL[weapon] ?? weapon}</span>
                  </div>
                </div>

                <Link
                  href={`/account/characters/new?race=${race.id}`}
                  className="mt-2 inline-flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/5 px-4 py-2.5 text-[12px] font-bold uppercase tracking-headline text-ember-400 transition-all hover:border-ember-500/60 hover:bg-ember-500/10"
                >
                  <span>Become {race.name}</span>
                  <span className="text-ember-500">→</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
