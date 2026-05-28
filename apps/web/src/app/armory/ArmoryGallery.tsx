"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { STARTER_WEAPONS } from "@dracor/game-data";
import type { WeaponType } from "@dracor/shared";
import { LazyViewerCard } from "@/components/LazyViewerCard";
import { WEAPON_GLB } from "@/components/viewer3d/anchors";

const WeaponViewer = dynamic(
  () => import("@/components/WeaponViewer").then((m) => m.WeaponViewer),
  { ssr: false },
);
const CharacterViewer = dynamic(
  () => import("@/components/CharacterViewer").then((m) => m.CharacterViewer),
  { ssr: false },
);

const CLASS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  dagger:       { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Light · 1H" },
  arming_sword: { bg: "bg-red-500/10",     text: "text-red-400",     label: "Sword · 1H" },
  longsword:    { bg: "bg-red-500/10",     text: "text-red-400",     label: "Sword · 1H" },
  greatsword:   { bg: "bg-red-500/10",     text: "text-red-400",     label: "Sword · 2H" },
  bow:          { bg: "bg-sky-500/10",     text: "text-sky-400",     label: "Ranged" },
  arrows:       { bg: "bg-sky-500/10",     text: "text-sky-400",     label: "Ranged" },
  axe:          { bg: "bg-orange-500/10",  text: "text-orange-400",  label: "Axe · 1H" },
  hammer:       { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Heavy · 1H" },
  spear:        { bg: "bg-teal-500/10",    text: "text-teal-400",    label: "Reach · 2H" },
  staff:        { bg: "bg-violet-500/10",  text: "text-violet-400",  label: "Caster · 2H" },
};

const SCALING: Record<string, string> = {
  dagger: "AGI + FOC",
  arming_sword: "STR + VIT",
  longsword: "STR + AGI",
  greatsword: "STR + VIT",
  bow: "AGI + FOC",
  arrows: "AGI + FOC",
  axe: "STR + AGI",
  hammer: "STR + VIT",
  spear: "AGI + FOC",
  staff: "SPI + FOC",
};

export function ArmoryGallery() {
  return (
    <section className="relative px-6 py-20 lg:px-12">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
        {STARTER_WEAPONS.map((w) => {
          const weaponType = w.metadata?.weaponClass as WeaponType;
          const dps = ((w.damageMin || 0) + (w.damageMax || 0)) / 2 * (w.metadata?.attackSpeed as number || 1);
          const badge = CLASS_BADGES[weaponType] ?? CLASS_BADGES.arming_sword;
          const scaling = SCALING[weaponType] ?? "—";
          const hasGLB = !!WEAPON_GLB[weaponType];

          return (
            <WeaponCard
              key={w.id}
              weaponType={weaponType}
              name={w.name}
              description={w.description}
              damageMin={w.damageMin || 0}
              damageMax={w.damageMax || 0}
              attackSpeed={(w.metadata?.attackSpeed as number) || 1}
              dps={dps}
              badge={badge}
              scaling={scaling}
              hasGLB={hasGLB}
            />
          );
        })}
      </div>
    </section>
  );
}

function WeaponCard({
  weaponType, name, description, damageMin, damageMax, attackSpeed, dps, badge, scaling, hasGLB,
}: {
  weaponType: WeaponType;
  name: string;
  description: string;
  damageMin: number;
  damageMax: number;
  attackSpeed: number;
  dps: number;
  badge: { bg: string; text: string; label: string };
  scaling: string;
  hasGLB: boolean;
}) {
  const [showHeld, setShowHeld] = useState(false);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line-subtle bg-surface-raised/40 backdrop-blur-sm transition-colors hover:border-ember-500/20">
      <LazyViewerCard className="relative aspect-[4/5] w-full overflow-hidden">
        {showHeld ? (
          <CharacterViewer raceId="dracor" weapon={weaponType} cameraAngle="three-quarter" />
        ) : (
          <WeaponViewer weapon={weaponType} />
        )}
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-headline ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          {!hasGLB && (
            <span className="inline-flex w-fit items-center rounded-full bg-stone-800/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-headline text-stone-400">
              Procedural
            </span>
          )}
        </div>
        <button
          onClick={() => setShowHeld((v) => !v)}
          className="absolute right-3 top-3 z-10 rounded-full border border-line-subtle bg-surface/70 px-3 py-1 text-[10px] font-bold uppercase tracking-headline text-content-secondary backdrop-blur transition-colors hover:border-ember-500/40 hover:text-ember-400"
        >
          {showHeld ? "Show alone" : "Show held"}
        </button>
      </LazyViewerCard>

      <div className="flex flex-1 flex-col gap-3 border-t border-line-subtle bg-surface/80 p-6">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-headline text-content-primary">
            {name.replace("Dracor ", "")}
          </h2>
          <p className="mt-1 text-[11px] uppercase tracking-headline text-content-muted">
            Scales {scaling}
          </p>
        </div>

        <p className="text-[12px] leading-relaxed text-content-secondary">{description}</p>

        <div className="grid grid-cols-3 gap-2 border-t border-line-subtle pt-3">
          <Stat label="DMG" value={`${damageMin}–${damageMax}`} />
          <Stat label="SPD" value={`${attackSpeed.toFixed(1)}x`} />
          <Stat label="DPS" value={dps.toFixed(1)} accent />
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold uppercase tracking-headline text-content-muted">{label}</p>
      <p className={`mt-0.5 font-display text-base font-extrabold tabular-nums ${accent ? "text-ember-400" : "text-content-primary"}`}>
        {value}
      </p>
    </div>
  );
}
