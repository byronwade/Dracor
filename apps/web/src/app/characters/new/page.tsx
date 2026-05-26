"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/AuthGuard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RaceId, WeaponType, DragonMemory } from "@dracor/shared";
import { RACES, getRaceById, DRAGON_MEMORIES, STARTER_WEAPONS } from "@dracor/game-data";

const CharacterViewer = dynamic(
  () => import("@/components/CharacterViewer").then((mod) => mod.CharacterViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-ember-500/30 border-t-ember-500" />
          <p className="font-display text-xs tracking-widest text-stone-600 uppercase">Summoning</p>
        </div>
      </div>
    ),
  }
);

type WizardStep = "race" | "memory" | "weapon" | "appearance" | "name";

const STEPS: WizardStep[] = ["race", "memory", "weapon", "appearance", "name"];
const STEP_TITLES: Record<WizardStep, string> = {
  race: "Choose Your Lineage",
  memory: "Awaken Your Memory",
  weapon: "Claim Your Weapon",
  appearance: "Shape Your Form",
  name: "Speak Your Name",
};
const STEP_LORE: Record<WizardStep, string> = {
  race: "The blood of five peoples flows through the frontier. Each carries a different legacy from before the Sundering.",
  memory: "Every descendant of the frontier carries a fragment of draconic power — an echo of the dragons who died shaping this world.",
  weapon: "You awaken on the Old Road with a single weapon in hand. It chose you as much as you chose it.",
  appearance: "Your form tells a story before you speak a word. The frontier reads faces, scars, and markings like maps.",
  name: "A name is power on the frontier. It is the first thing enemies learn, and the last thing they forget.",
};

function StepNav({ currentStep, steps }: { currentStep: WizardStep; steps: WizardStep[] }) {
  const idx = steps.indexOf(currentStep);
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
              i < idx ? "bg-ember-500" : i === idx ? "bg-ember-500/60 animate-glow-pulse" : "bg-stone-800"
            }`}
          />
          {i < steps.length - 1 && <div className="w-0.5" />}
        </div>
      ))}
    </div>
  );
}

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  tank:       { bg: "bg-amber-500/15", text: "text-amber-400", label: "Tank" },
  striker:    { bg: "bg-red-500/15", text: "text-red-400", label: "Striker" },
  caster:     { bg: "bg-violet-500/15", text: "text-violet-400", label: "Caster" },
  skirmisher: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Skirmisher" },
  support:    { bg: "bg-sky-500/15", text: "text-sky-400", label: "Support" },
};

const STAT_META: { key: keyof typeof RACES[0]["baseStats"]; label: string; full: string; color: string }[] = [
  { key: "strength", label: "STR", full: "Strength", color: "#ef4444" },
  { key: "agility", label: "AGI", full: "Agility", color: "#22c55e" },
  { key: "vitality", label: "VIT", full: "Vitality", color: "#f59e0b" },
  { key: "spirit", label: "SPI", full: "Spirit", color: "#a855f7" },
  { key: "focus", label: "FOC", full: "Focus", color: "#3b82f6" },
];

function RadarChart({ stats, max = 14 }: { stats: { [k: string]: number }; max?: number }) {
  const cx = 90, cy = 90, r = 70;
  const keys = STAT_META.map(s => s.key);
  const n = keys.length;

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (val / max) * r;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = keys.map((k, i) => getPoint(i, stats[k] || 0));
  const polygon = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[200px] mx-auto">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={keys.map((_, i) => { const p = getPoint(i, max * level); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
      ))}
      {keys.map((_, i) => {
        const p = getPoint(i, max);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
      })}
      <polygon points={polygon} fill="rgba(249,115,22,0.12)" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={STAT_META[i].color} />
      ))}
      {keys.map((_, i) => {
        const p = getPoint(i, max + 3);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="fill-stone-500 text-[9px] font-bold uppercase">{STAT_META[i].label}</text>
        );
      })}
    </svg>
  );
}

function DifficultyPips({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`h-2 w-2 rounded-sm transition-all ${
          i <= level ? "bg-ember-500" : "bg-stone-800"
        }`} />
      ))}
    </div>
  );
}

function RaceSelectionStep({
  selectedRace,
  onSelect,
}: {
  selectedRace: RaceId | null;
  onSelect: (id: RaceId) => void;
}) {
  const race = selectedRace ? getRaceById(selectedRace) : null;
  const [loreExpanded, setLoreExpanded] = useState(false);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Race list */}
      <div className="wizard-panel flex flex-col gap-1 overflow-y-auto border-r border-stone-800/30 p-3 lg:w-72">
        {RACES.map((r) => {
          const isActive = selectedRace === r.id;
          const roleInfo = ROLE_COLORS[r.role] || ROLE_COLORS.striker;
          return (
            <button
              key={r.id}
              onClick={() => { onSelect(r.id); setLoreExpanded(false); }}
              className={`group relative rounded-lg border p-2.5 text-left transition-all duration-200 ${
                isActive
                  ? "border-ember-500/40 bg-gradient-to-r from-ember-500/8 to-transparent"
                  : "border-transparent hover:bg-white/[0.02]"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-ember-500" />
              )}
              <div className="flex items-center gap-2.5 pl-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[13px] font-bold truncate ${isActive ? "text-ember-400" : "text-stone-300 group-hover:text-stone-100"}`}>
                      {r.name}
                    </h3>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${roleInfo.bg} ${roleInfo.text}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-stone-600 truncate">{r.tagline}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Center: 3D Viewer */}
      <div className="relative flex-1 min-h-[300px]">
        {selectedRace ? (
          <CharacterViewer raceId={selectedRace} autoRotate />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-950">
            <div className="text-center">
              <p className="font-display text-lg text-stone-700 tracking-wider">Choose a Lineage</p>
            </div>
          </div>
        )}
        {race && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent p-6 pt-20">
            <h2 className="font-display text-3xl font-bold tracking-wide text-stone-100 text-shadow-sm">
              {race.name}
            </h2>
            <p className="mt-1 text-sm italic text-ember-400/80">{race.tagline}</p>
          </div>
        )}
      </div>

      {/* Right: Race details */}
      {race && (
        <div className="wizard-panel flex flex-col gap-4 overflow-y-auto border-l border-stone-800/30 p-4 lg:w-[400px] animate-fade-in" key={race.id}>
          {/* Header: Role + Difficulty */}
          <div className="flex items-center gap-3">
            <span className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${ROLE_COLORS[race.role]?.bg} ${ROLE_COLORS[race.role]?.text}`}>
              {ROLE_COLORS[race.role]?.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-stone-600">Difficulty</span>
              <DifficultyPips level={race.difficulty} />
            </div>
          </div>

          {/* Playstyle */}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3">
            <p className="text-[12px] font-medium leading-relaxed text-stone-300">{race.playstyle}</p>
          </div>

          {/* Radar Chart + Stat numbers side by side */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <RadarChart stats={race.baseStats as unknown as { [k: string]: number }} />
              </div>
              <div className="flex-1 space-y-2">
                {STAT_META.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[11px] text-stone-500">{s.full}</span>
                    </div>
                    <span className="text-[13px] font-black tabular-nums text-stone-200">{race.baseStats[s.key]}</span>
                  </div>
                ))}
                <div className="border-t border-white/[0.04] pt-2 mt-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-stone-600">Total Power</span>
                    <span className="text-[13px] font-black tabular-nums text-ember-400">
                      {Object.values(race.baseStats).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Abilities */}
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
              Racial Abilities
            </h3>
            <div className="space-y-2">
              {race.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="group rounded-lg border border-white/[0.04] bg-white/[0.015] p-3 transition-all hover:border-white/[0.08]"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      ability.type === "passive"
                        ? "bg-emerald-500/10 ring-1 ring-emerald-500/20"
                        : "bg-sky-500/10 ring-1 ring-sky-500/20"
                    }`}>
                      <span className={`text-[10px] font-black uppercase ${
                        ability.type === "passive" ? "text-emerald-400" : "text-sky-400"
                      }`}>
                        {ability.type === "passive" ? "P" : "A"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-bold text-stone-200">{ability.name}</h4>
                        {ability.cooldown && (
                          <span className="ml-auto shrink-0 rounded-full bg-stone-800/60 px-2 py-0.5 text-[9px] font-bold tabular-nums text-stone-500">
                            {ability.cooldown}s CD
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{ability.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lore */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
              Lore
            </h3>
            <p className="text-[12px] leading-relaxed text-stone-400">{race.description}</p>
            <div className="mt-3">
              <p className="text-[11px] italic leading-relaxed text-stone-500">
                {loreExpanded ? race.lore : race.lore.slice(0, 200) + "..."}
              </p>
              {race.lore.length > 200 && (
                <button
                  onClick={() => setLoreExpanded(!loreExpanded)}
                  className="mt-1 text-[10px] font-medium text-ember-500 hover:text-ember-400 transition-colors"
                >
                  {loreExpanded ? "Show less" : "Read full lore"}
                </button>
              )}
            </div>
          </div>

          {/* Traits */}
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
              Physical Traits
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {race.traits.map((trait, i) => (
                <div key={i} className="flex items-start gap-2 rounded bg-white/[0.015] px-3 py-1.5">
                  <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-ember-500/50" />
                  <p className="text-[11px] text-stone-400">{trait}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MEMORY_DATA: Record<string, {
  icon: string; color: string; bgActive: string; ring: string; text: string;
  lore: string; synergy: string;
  statBoosts: { label: string; value: string }[];
}> = {
  ember: {
    icon: "🔥", color: "#f97316", bgActive: "bg-orange-500/8", ring: "ring-orange-500/40", text: "text-orange-400",
    lore: "The Ember burns brightest in those who refuse to be extinguished. It is rage made purpose, fury given form. In the darkest moments, when all seems lost, the Ember ignites — and everything burns.",
    synergy: "Best with: Blade (sustained DPS) or Staff (fire amplification). Strong on Dracor, Grukhar, Bloodfane.",
    statBoosts: [
      { label: "Fire Damage", value: "+5%" },
      { label: "Crit Damage", value: "+2%" },
      { label: "Burn Duration", value: "+1s" },
    ],
  },
  stone: {
    icon: "🪨", color: "#d97706", bgActive: "bg-amber-500/8", ring: "ring-amber-600/40", text: "text-amber-400",
    lore: "The Stone remembers what mountains remember: that all things pass, that patience outlasts fury, that the world breaks itself against those who will not move. It is the quiet power of endurance.",
    synergy: "Best with: Blade (frontline tank) or any weapon. Essential for Ironborn, Stoneguard, Ashwalker.",
    statBoosts: [
      { label: "Defense", value: "+5%" },
      { label: "Max Health", value: "+3%" },
      { label: "Stagger Resist", value: "+10%" },
    ],
  },
  storm: {
    icon: "⚡", color: "#0ea5e9", bgActive: "bg-sky-500/8", ring: "ring-sky-500/40", text: "text-sky-400",
    lore: "The Storm does not announce itself — it simply arrives. Those who carry its memory move like lightning: there and gone, leaving only the thunder of their passing. Speed is not haste. It is precision at velocity.",
    synergy: "Best with: Bow (rapid shots) or Blade (fast combos). Deadly on Sylvhari, Skrix, Bloodfane.",
    statBoosts: [
      { label: "Attack Speed", value: "+5%" },
      { label: "Move Speed", value: "+3%" },
      { label: "Dodge Chance", value: "+2%" },
    ],
  },
};

function MemorySelectionStep({
  selectedMemory,
  selectedRace,
  onSelect,
}: {
  selectedMemory: DragonMemory | null;
  selectedRace: RaceId;
  onSelect: (id: DragonMemory) => void;
}) {
  const selected = selectedMemory ? MEMORY_DATA[selectedMemory] : null;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} autoRotate />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent p-8 pt-20">
          {selected && (
            <p className="mx-auto max-w-md text-center text-[13px] italic leading-relaxed text-stone-400 animate-fade-in">
              &ldquo;{selected.lore}&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="wizard-panel flex flex-col gap-4 overflow-y-auto border-l border-stone-800/30 p-4 lg:w-[400px]">
        <div>
          <h2 className="font-display text-xl tracking-wide text-stone-100">Dragon Memory</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            A fragment of ancient power burns within you. Which memory stirs in your blood?
          </p>
        </div>

        {DRAGON_MEMORIES.map((mem) => {
          const isSelected = selectedMemory === mem.id;
          const md = MEMORY_DATA[mem.id];
          if (!md) return null;

          return (
            <button
              key={mem.id}
              onClick={() => onSelect(mem.id as DragonMemory)}
              className={`relative rounded-lg border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? `border-transparent ring-2 ${md.ring} ${md.bgActive}`
                  : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? md.bgActive + " ring-1 " + md.ring : "bg-stone-800/60"
                }`}>
                  <span className="text-2xl">{md.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-display text-base tracking-wide ${isSelected ? md.text : "text-stone-200"}`}>
                      {mem.name}
                    </h3>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                      isSelected ? md.bgActive + " " + md.text : "bg-stone-800/60 text-stone-500"
                    }`}>
                      {mem.element}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{mem.description}</p>
                </div>
              </div>

              {/* Stat boosts */}
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {md.statBoosts.map((b) => (
                  <div key={b.label} className="rounded bg-white/[0.03] px-2 py-1.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">{b.label}</p>
                    <p className={`text-[12px] font-black tabular-nums ${isSelected ? md.text : "text-stone-300"}`}>{b.value}</p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}

        {/* Synergy info */}
        {selected && (
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 animate-fade-in">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-1">Synergy</h4>
            <p className="text-[11px] leading-relaxed text-stone-400">{selected.synergy}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const WEAPON_EXTRA: Record<string, {
  playstyle: string; bestWith: string; scaling: string;
}> = {
  blade: {
    playstyle: "Melee brawler. Balanced damage and speed. Parry mechanic rewards timing. Best all-around choice.",
    bestWith: "Ember (sustained burn) or Stone (frontline durability)",
    scaling: "Strength + Agility",
  },
  bow: {
    playstyle: "Ranged kiter. High damage ceiling but punishes missed shots. Positioning is everything.",
    bestWith: "Storm (rapid fire) or Ember (burning arrows)",
    scaling: "Agility + Focus",
  },
  staff: {
    playstyle: "Channeled caster. Slow but devastating burst. Staff orb amplifies Dragon Memory element.",
    bestWith: "Ember (fire storms) or Storm (chain lightning)",
    scaling: "Spirit + Focus",
  },
};

function WeaponSelectionStep({
  selectedWeapon,
  selectedRace,
  selectedMemory,
  onSelect,
}: {
  selectedWeapon: WeaponType | null;
  selectedRace: RaceId;
  selectedMemory: DragonMemory | null;
  onSelect: (id: WeaponType) => void;
}) {
  const weaponLore: Record<string, string> = {
    blade: "Steel speaks a simple language: cut, parry, riposte. The blade is civilization's answer to chaos — order imposed one edge at a time.",
    bow: "Distance is safety. Distance is power. The bow turns patience into lethality and turns a single archer into an army's nightmare.",
    staff: "Wood and will. The staff channels what the body cannot contain — raw elemental force shaped by focus into devastation.",
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} weapon={selectedWeapon || undefined} autoRotate />
        {selectedWeapon && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent p-8 pt-20">
            <p className="mx-auto max-w-md text-center text-[13px] italic leading-relaxed text-stone-400 animate-fade-in">
              &ldquo;{weaponLore[selectedWeapon]}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="wizard-panel flex flex-col gap-4 overflow-y-auto border-l border-stone-800/30 p-4 lg:w-[400px]">
        <div>
          <h2 className="font-display text-xl tracking-wide text-stone-100">Your Weapon</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            You awaken with one weapon in hand. It will define how you meet the world.
          </p>
        </div>

        {STARTER_WEAPONS.map((w) => {
          const weaponId = w.metadata?.weaponClass as WeaponType;
          const isSelected = selectedWeapon === weaponId;
          const extra = WEAPON_EXTRA[weaponId];

          return (
            <button
              key={w.id}
              onClick={() => onSelect(weaponId)}
              className={`relative rounded-lg border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-transparent ring-2 ring-ember-500/40 bg-ember-500/5"
                  : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-ember-500/15 ring-1 ring-ember-500/30" : "bg-stone-800/60"
                }`}>
                  <span className="text-2xl">
                    {weaponId === "blade" ? "⚔️" : weaponId === "bow" ? "🏹" : "🪄"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-display text-base tracking-wide ${isSelected ? "text-ember-400" : "text-stone-200"}`}>
                    {w.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{w.description}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                <div className="rounded bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">Damage</p>
                  <p className="text-[13px] font-black tabular-nums text-stone-200">{w.damageMin}–{w.damageMax}</p>
                </div>
                <div className="rounded bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">Speed</p>
                  <p className="text-[13px] font-black tabular-nums text-stone-200">{(w.metadata?.attackSpeed as number)?.toFixed(1)}x</p>
                </div>
                <div className="rounded bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">DPS</p>
                  <p className="text-[13px] font-black tabular-nums text-ember-400">
                    {(((w.damageMin || 0) + (w.damageMax || 0)) / 2 * (w.metadata?.attackSpeed as number || 1)).toFixed(1)}
                  </p>
                </div>
                <div className="rounded bg-white/[0.03] px-2 py-1.5 text-center">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">Scales</p>
                  <p className="text-[10px] font-bold text-stone-300">{extra?.scaling.split(" + ").map(s => s.slice(0,3)).join("+")}</p>
                </div>
              </div>

              {/* Playstyle on selected */}
              {isSelected && extra && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  <p className="text-[11px] leading-relaxed text-stone-400">{extra.playstyle}</p>
                  <div className="rounded bg-white/[0.02] px-3 py-1.5">
                    <p className="text-[10px] text-stone-500"><span className="text-stone-600 font-bold">Pairs with:</span> {extra.bestWith}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppearanceStep({
  selectedRace,
  selectedMemory,
  appearance,
  onUpdate,
}: {
  selectedRace: RaceId;
  selectedMemory: DragonMemory | null;
  appearance: { eyeColor: string; skinTone: string; marking: string; hairStyle: string; uniqueFeature: string };
  onUpdate: (field: string, value: string) => void;
}) {
  const race = getRaceById(selectedRace);
  if (!race) return null;
  const opts = race.appearance;

  const categories = [
    { label: "Eye Color", options: opts.eyeColors, field: "eyeColor", selected: appearance.eyeColor },
    { label: "Skin Tone", options: opts.skinTones, field: "skinTone", selected: appearance.skinTone },
    { label: "Markings", options: opts.markings, field: "marking", selected: appearance.marking },
    { label: "Hair Style", options: opts.hairStyles, field: "hairStyle", selected: appearance.hairStyle },
    { label: opts.uniqueFeature, options: opts.uniqueFeatureOptions, field: "uniqueFeature", selected: appearance.uniqueFeature },
  ];

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} appearance={appearance} autoRotate />
      </div>

      <div className="wizard-panel flex flex-col gap-4 overflow-y-auto border-l border-stone-800/30 p-4 lg:w-[400px]">
        <div>
          <h2 className="font-display text-xl tracking-wide text-stone-100">Appearance</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Shape your physical form. Every mark tells a story on the frontier.
          </p>
        </div>

        {categories.map((cat) => (
          <div key={cat.field}>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
                {cat.label}
              </label>
              <span className="text-[10px] text-stone-700">{cat.selected || "None"}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {cat.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onUpdate(cat.field, opt)}
                  className={`rounded border px-2.5 py-2 text-[11px] font-medium transition-all duration-150 ${
                    cat.selected === opt
                      ? "border-ember-500/40 bg-ember-500/8 text-ember-400"
                      : "border-white/[0.04] bg-white/[0.015] text-stone-500 hover:bg-white/[0.03] hover:text-stone-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NameStep({
  name,
  onNameChange,
  selectedRace,
  selectedMemory,
  selectedWeapon,
  appearance,
}: {
  name: string;
  onNameChange: (name: string) => void;
  selectedRace: RaceId;
  selectedMemory: DragonMemory | null;
  selectedWeapon: WeaponType | null;
  appearance: any;
}) {
  const race = getRaceById(selectedRace);
  const memoryData = DRAGON_MEMORIES.find((m) => m.id === selectedMemory);
  const weaponData = STARTER_WEAPONS.find((w) => w.metadata?.weaponClass === selectedWeapon);
  const roleInfo = race ? ROLE_COLORS[race.role] : null;
  const memInfo = selectedMemory ? MEMORY_DATA[selectedMemory] : null;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer
          raceId={selectedRace}
          memory={selectedMemory || undefined}
          weapon={selectedWeapon || undefined}
          appearance={appearance}
          autoRotate
        />
        {name && (
          <div className="absolute left-1/2 top-6 -translate-x-1/2 animate-fade-in">
            <div className="rounded-lg border border-ember-500/20 bg-stone-950/80 px-8 py-3 backdrop-blur-md">
              <p className="text-center font-display text-xl font-bold tracking-wider text-ember-400 text-shadow-ember">
                {name}
              </p>
              <p className="mt-0.5 text-center text-[10px] uppercase tracking-[0.3em] text-stone-500">
                {race?.name} &bull; {memoryData?.name}
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent p-8 pt-20">
          <p className="mx-auto max-w-lg text-center text-[13px] italic leading-relaxed text-stone-500">
            &ldquo;You awaken on the Old Road with nothing but fragmented memories and a single weapon. What will you become?&rdquo;
          </p>
        </div>
      </div>

      <div className="wizard-panel flex flex-col gap-4 overflow-y-auto border-l border-stone-800/30 p-4 lg:w-[400px]">
        <div>
          <h2 className="font-display text-xl tracking-wide text-stone-100">Your Name</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            A name is the first thing your enemies will learn, and the last they will forget.
          </p>
        </div>

        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Speak your name..."
            maxLength={24}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 font-display text-lg tracking-wide text-stone-100 placeholder-stone-700 transition-all focus:border-ember-500/40 focus:outline-none focus:ring-2 focus:ring-ember-500/10"
          />
          <p className="mt-2 text-[10px] tabular-nums text-stone-700">{name.length}/24</p>
        </div>

        {/* Character sheet */}
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Character Sheet</h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Lineage</span>
              <div className="flex items-center gap-2">
                {roleInfo && (
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${roleInfo.bg} ${roleInfo.text}`}>
                    {roleInfo.label}
                  </span>
                )}
                <span className="text-[13px] font-bold text-stone-200">{race?.name}</span>
              </div>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Dragon Memory</span>
              <span className={`text-[13px] font-bold ${memInfo?.text || "text-stone-200"}`}>
                {memInfo?.icon} {memoryData?.name}
              </span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Weapon</span>
              <span className="text-[13px] font-bold text-stone-200">{weaponData?.name}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Starting Zone</span>
              <span className="text-[13px] font-bold text-stone-200">Ironvale</span>
            </div>
          </div>

          {race && (
            <div className="mt-4 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-24">
                  <RadarChart stats={race.baseStats as unknown as { [k: string]: number }} max={14} />
                </div>
                <div className="flex-1 grid grid-cols-5 gap-1">
                  {STAT_META.map(s => (
                    <div key={s.key} className="text-center">
                      <div className="h-1.5 w-1.5 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color }} />
                      <p className="text-[8px] font-bold text-stone-600">{s.label}</p>
                      <p className="text-[12px] font-black tabular-nums text-stone-200">{race.baseStats[s.key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CharacterCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("race");
  const [selectedRace, setSelectedRace] = useState<RaceId | null>("dracor");
  const [selectedMemory, setSelectedMemory] = useState<DragonMemory | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType | null>(null);
  const [name, setName] = useState("");
  const defaultRace = getRaceById("dracor")!;
  const [appearance, setAppearance] = useState({
    eyeColor: defaultRace.appearance.eyeColors[0],
    skinTone: defaultRace.appearance.skinTones[0],
    marking: defaultRace.appearance.markings[0],
    hairStyle: defaultRace.appearance.hairStyles[0],
    uniqueFeature: defaultRace.appearance.uniqueFeatureOptions[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStepIdx = STEPS.indexOf(step);

  const canProceed = useCallback(() => {
    switch (step) {
      case "race": return !!selectedRace;
      case "memory": return !!selectedMemory;
      case "weapon": return !!selectedWeapon;
      case "appearance": return !!appearance.eyeColor && !!appearance.skinTone;
      case "name": return name.trim().length >= 2 && name.trim().length <= 24;
    }
  }, [step, selectedRace, selectedMemory, selectedWeapon, appearance, name]);

  const handleNext = () => {
    if (currentStepIdx < STEPS.length - 1) setStep(STEPS[currentStepIdx + 1]);
  };

  const handleBack = () => {
    if (currentStepIdx > 0) setStep(STEPS[currentStepIdx - 1]);
  };

  const handleRaceSelect = (id: RaceId) => {
    setSelectedRace(id);
    const race = getRaceById(id);
    if (race) {
      setAppearance({
        eyeColor: race.appearance.eyeColors[0],
        skinTone: race.appearance.skinTones[0],
        marking: race.appearance.markings[0],
        hairStyle: race.appearance.hairStyles[0],
        uniqueFeature: race.appearance.uniqueFeatureOptions[0],
      });
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!selectedRace || !selectedMemory || !selectedWeapon || !name.trim()) {
      setError("Complete all steps before creating your character.");
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 24) {
      setError("Name must be between 2 and 24 characters.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setError("Unable to connect."); setLoading(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be logged in."); setLoading(false); return; }

      const { error: insertError } = await supabase.from("characters").insert({
        user_id: user.id,
        name: name.trim(),
        ancestry: selectedRace,
        weapon: selectedWeapon,
        memory: selectedMemory,
        appearance: {
          eyeColor: appearance.eyeColor,
          skinTone: appearance.skinTone,
          marking: appearance.marking,
          hairStyle: appearance.hairStyle,
          uniqueFeature: appearance.uniqueFeature,
        },
        zone_id: "ironvale_town",
        position_x: 0, position_y: 0, position_z: 0,
      });

      if (insertError) {
        setError(insertError.code === "23505" ? "That name is already taken." : insertError.message);
        setLoading(false);
        return;
      }
      router.push("/characters");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-950">
      {/* Top bar — minimal, cinematic */}
      <div className="relative z-10 flex items-center justify-between border-b border-stone-800/30 bg-stone-950/80 px-5 py-3 backdrop-blur-xl">
        <button
          onClick={() => router.push("/characters")}
          className="flex items-center gap-2 text-[11px] text-stone-600 transition-colors hover:text-stone-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Exit
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
            {STEP_TITLES[step]}
          </p>
        </div>

        <StepNav currentStep={step} steps={STEPS} />
      </div>

      {/* Lore subtitle */}
      <div className="border-b border-stone-800/20 bg-stone-950/60 px-6 py-2">
        <p className="text-center text-[11px] italic text-stone-600 animate-fade-in" key={step}>
          {STEP_LORE[step]}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-6 py-2">
          <p className="text-center text-[12px] text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {step === "race" && <RaceSelectionStep selectedRace={selectedRace} onSelect={handleRaceSelect} />}
        {step === "memory" && selectedRace && <MemorySelectionStep selectedMemory={selectedMemory} selectedRace={selectedRace} onSelect={setSelectedMemory} />}
        {step === "weapon" && selectedRace && <WeaponSelectionStep selectedWeapon={selectedWeapon} selectedRace={selectedRace} selectedMemory={selectedMemory} onSelect={setSelectedWeapon} />}
        {step === "appearance" && selectedRace && <AppearanceStep selectedRace={selectedRace} selectedMemory={selectedMemory} appearance={appearance} onUpdate={(f, v) => setAppearance((p) => ({ ...p, [f]: v }))} />}
        {step === "name" && selectedRace && <NameStep name={name} onNameChange={setName} selectedRace={selectedRace} selectedMemory={selectedMemory} selectedWeapon={selectedWeapon} appearance={appearance} />}
      </div>

      {/* Bottom nav — cinematic */}
      <div className="relative z-10 flex items-center justify-between border-t border-stone-800/30 bg-stone-950/80 px-6 py-4 backdrop-blur-xl">
        <button
          onClick={handleBack}
          disabled={currentStepIdx === 0}
          className="rounded-lg border border-stone-800/50 bg-stone-900/30 px-5 py-2.5 text-[12px] font-medium text-stone-400 transition-all hover:border-stone-700 hover:bg-stone-800/50 hover:text-stone-200 disabled:pointer-events-none disabled:opacity-20"
        >
          Back
        </button>

        <p className="text-[10px] tabular-nums text-stone-700">
          {currentStepIdx + 1} / {STEPS.length}
        </p>

        {step === "name" ? (
          <button
            onClick={handleCreate}
            disabled={!canProceed() || loading}
            className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-ember-600 to-orange-500 px-8 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-ember-500/20 transition-all hover:shadow-xl hover:shadow-ember-500/30 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="relative z-10 font-display tracking-wider">
              {loading ? "Creating..." : "Begin Your Journey"}
            </span>
            {!loading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-ember-600 to-orange-500 px-7 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-ember-500/20 transition-all hover:shadow-xl hover:shadow-ember-500/30 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="relative z-10 font-display tracking-wider">Continue</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewCharacterPage() {
  return (
    <AuthGuard>
      <CharacterCreationWizard />
    </AuthGuard>
  );
}
