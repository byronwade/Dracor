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

function AnimatedStatBar({
  label,
  value,
  max = 12,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), 100 + delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);

  return (
    <div className="group flex items-center gap-2">
      <span className="w-10 text-[10px] font-bold uppercase tracking-wider text-stone-500 group-hover:text-stone-300 transition-colors">
        {label}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800/80">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${width}%`, transitionDelay: `${delay}ms` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full blur-sm opacity-50 ${color}`}
          style={{ width: `${width}%`, transitionDelay: `${delay}ms`, transition: "width 700ms ease-out" }}
        />
      </div>
      <span className="w-5 text-right text-[11px] font-black text-stone-300 tabular-nums">{value}</span>
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

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Race list */}
      <div className="wizard-panel flex flex-col gap-1.5 border-r p-4 lg:w-72">
        {RACES.map((r) => {
          const isActive = selectedRace === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`group relative rounded-lg border p-3 text-left transition-all duration-300 ${
                isActive
                  ? "border-ember-500/60 bg-gradient-to-r from-ember-500/10 to-transparent shadow-lg shadow-ember-500/5"
                  : "border-transparent bg-stone-900/20 hover:border-stone-700/50 hover:bg-stone-800/30"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-ember-500" />
              )}
              <h3 className={`font-display text-sm tracking-wide ${isActive ? "text-ember-400 text-shadow-ember" : "text-stone-300 group-hover:text-stone-100"}`}>
                {r.name}
              </h3>
              <p className="mt-0.5 text-[10px] text-stone-600 leading-relaxed">{r.tagline}</p>
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
              <p className="mt-1 text-xs text-stone-800">Select from the races of the frontier</p>
            </div>
          </div>
        )}
        {/* Bottom gradient overlay with race name */}
        {race && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent p-6 pt-16">
            <h2 className="font-display text-3xl font-bold tracking-wide text-stone-100 text-shadow-sm">
              {race.name}
            </h2>
            <p className="mt-1 text-sm italic text-ember-400/80">{race.tagline}</p>
          </div>
        )}
      </div>

      {/* Right: Race details */}
      {race && (
        <div className="wizard-panel flex flex-col gap-5 overflow-y-auto border-l p-5 lg:w-[380px] animate-fade-in">
          {/* Lore */}
          <div className="relative">
            <p className="text-[13px] leading-relaxed text-stone-400">{race.description}</p>
            <div className="mt-3 border-l-2 border-ember-500/30 pl-3">
              <p className="text-[11px] italic leading-relaxed text-stone-500">{race.lore.slice(0, 180)}...</p>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-lg border border-stone-800/50 bg-stone-900/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
                Attributes
              </h3>
              <span className="text-[10px] tabular-nums text-stone-600">
                {Object.values(race.baseStats).reduce((a, b) => a + b, 0)} total
              </span>
            </div>
            <div className="space-y-2.5">
              <AnimatedStatBar label="STR" value={race.baseStats.strength} color="bg-red-500" delay={0} />
              <AnimatedStatBar label="AGI" value={race.baseStats.agility} color="bg-emerald-500" delay={80} />
              <AnimatedStatBar label="VIT" value={race.baseStats.vitality} color="bg-amber-500" delay={160} />
              <AnimatedStatBar label="SPI" value={race.baseStats.spirit} color="bg-violet-500" delay={240} />
              <AnimatedStatBar label="FOC" value={race.baseStats.focus} color="bg-sky-500" delay={320} />
            </div>
          </div>

          {/* Abilities */}
          <div>
            <h3 className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Racial Powers
            </h3>
            <div className="space-y-2.5">
              {race.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="rounded-lg border border-stone-800/40 bg-stone-900/20 p-3 transition-colors hover:border-stone-700/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        ability.type === "passive" ? "bg-emerald-400" : "bg-sky-400"
                      }`}
                    />
                    <h4 className="text-[13px] font-bold text-stone-200">{ability.name}</h4>
                    {ability.cooldown && (
                      <span className="ml-auto rounded bg-stone-800/80 px-1.5 py-0.5 text-[9px] text-stone-500">
                        {ability.cooldown}s
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">{ability.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Traits */}
          <div>
            <h3 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Distinguishing Traits
            </h3>
            <div className="space-y-1.5">
              {race.traits.map((trait, i) => (
                <p key={i} className="flex items-start gap-2 text-[11px] text-stone-500">
                  <span className="mt-1 block h-1 w-1 flex-shrink-0 rounded-full bg-ember-500/60" />
                  {trait}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemorySelectionStep({
  selectedMemory,
  selectedRace,
  onSelect,
}: {
  selectedMemory: DragonMemory | null;
  selectedRace: RaceId;
  onSelect: (id: DragonMemory) => void;
}) {
  const memoryLore: Record<string, string> = {
    ember: "The Ember burns brightest in those who refuse to be extinguished. It is rage made purpose, fury given form. In the darkest moments, when all seems lost, the Ember ignites — and everything burns.",
    stone: "The Stone remembers what mountains remember: that all things pass, that patience outlasts fury, that the world breaks itself against those who will not move. It is the quiet power of endurance.",
    storm: "The Storm does not announce itself — it simply arrives. Those who carry its memory move like lightning: there and gone, leaving only the thunder of their passing. Speed is not haste. It is precision at velocity.",
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} autoRotate />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent p-8 pt-20">
          {selectedMemory && (
            <p className="mx-auto max-w-md text-center text-[13px] italic leading-relaxed text-stone-400 animate-fade-in">
              &ldquo;{memoryLore[selectedMemory]}&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="wizard-panel flex flex-col gap-4 border-l p-6 lg:w-[400px]">
        <div className="mb-2">
          <h2 className="font-display text-xl tracking-wide text-stone-100">Dragon Memory</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            A fragment of ancient power burns within you. Which memory stirs in your blood?
          </p>
        </div>

        {DRAGON_MEMORIES.map((mem) => {
          const isSelected = selectedMemory === mem.id;
          const colorSchemes: Record<string, { ring: string; glow: string; text: string; bg: string }> = {
            ember: { ring: "ring-orange-500/50", glow: "shadow-orange-500/20", text: "text-orange-400", bg: "bg-orange-500/8" },
            stone: { ring: "ring-amber-600/50", glow: "shadow-amber-600/20", text: "text-amber-400", bg: "bg-amber-500/8" },
            storm: { ring: "ring-sky-500/50", glow: "shadow-sky-500/20", text: "text-sky-400", bg: "bg-sky-500/8" },
          };
          const cs = colorSchemes[mem.id] || colorSchemes.ember;

          return (
            <button
              key={mem.id}
              onClick={() => onSelect(mem.id as DragonMemory)}
              className={`relative rounded-xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? `border-transparent ring-2 ${cs.ring} ${cs.bg} shadow-xl ${cs.glow}`
                  : "border-stone-800/50 bg-stone-900/20 hover:border-stone-700/60 hover:bg-stone-800/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                  isSelected ? cs.bg + " ring-1 " + cs.ring : "bg-stone-800/60"
                }`}>
                  <span className="text-xl">
                    {mem.id === "ember" ? "🔥" : mem.id === "stone" ? "🪨" : "⚡"}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-display text-base tracking-wide ${isSelected ? cs.text : "text-stone-200"}`}>
                    {mem.name}
                  </h3>
                  <p className="text-[11px] text-stone-600">Element: {mem.element}</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-stone-500">{mem.description}</p>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-stone-800/30 px-3 py-2">
                <div className={`h-1 w-1 rounded-full ${isSelected ? "bg-current " + cs.text : "bg-stone-600"}`} />
                <p className="text-[11px] font-medium text-stone-400">{mem.passiveBonus}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
        <CharacterViewer
          raceId={selectedRace}
          memory={selectedMemory || undefined}
          weapon={selectedWeapon || undefined}
          autoRotate
        />
        {selectedWeapon && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent p-8 pt-20">
            <p className="mx-auto max-w-md text-center text-[13px] italic leading-relaxed text-stone-400 animate-fade-in">
              &ldquo;{weaponLore[selectedWeapon]}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="wizard-panel flex flex-col gap-4 border-l p-6 lg:w-[400px]">
        <div className="mb-2">
          <h2 className="font-display text-xl tracking-wide text-stone-100">Your Weapon</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            You awaken with one weapon in hand. It will define how you meet the world.
          </p>
        </div>

        {STARTER_WEAPONS.map((w) => {
          const weaponId = w.metadata?.weaponClass as WeaponType;
          const isSelected = selectedWeapon === weaponId;

          return (
            <button
              key={w.id}
              onClick={() => onSelect(weaponId)}
              className={`relative rounded-xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? "border-transparent ring-2 ring-ember-500/40 bg-ember-500/5 shadow-xl shadow-ember-500/10"
                  : "border-stone-800/50 bg-stone-900/20 hover:border-stone-700/60 hover:bg-stone-800/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-all ${
                  isSelected ? "bg-ember-500/15 ring-1 ring-ember-500/30" : "bg-stone-800/60"
                }`}>
                  <span className="text-2xl">
                    {weaponId === "blade" ? "⚔️" : weaponId === "bow" ? "🏹" : "🪄"}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-display text-base tracking-wide ${isSelected ? "text-ember-400" : "text-stone-200"}`}>
                    {w.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{w.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-stone-800/40 p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-600">Damage</p>
                  <p className="mt-0.5 text-sm font-black tabular-nums text-stone-200">
                    {w.damageMin}–{w.damageMax}
                  </p>
                </div>
                <div className="rounded-lg bg-stone-800/40 p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-600">Speed</p>
                  <p className="mt-0.5 text-sm font-black tabular-nums text-stone-200">
                    {(w.metadata?.attackSpeed as number)?.toFixed(1)}x
                  </p>
                </div>
                <div className="rounded-lg bg-stone-800/40 p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-600">Class</p>
                  <p className="mt-0.5 text-sm font-black capitalize text-stone-200">{weaponId}</p>
                </div>
              </div>
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

  function OptionGrid({ label, options, selected, field }: { label: string; options: string[]; selected: string; field: string }) {
    return (
      <div>
        <label className="mb-2 block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
          {label}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onUpdate(field, opt)}
              className={`rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-all duration-200 ${
                selected === opt
                  ? "border-ember-500/50 bg-ember-500/8 text-ember-400 shadow-sm shadow-ember-500/10"
                  : "border-stone-800/40 bg-stone-900/20 text-stone-500 hover:border-stone-700/50 hover:text-stone-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative flex-1 min-h-[300px]">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} appearance={appearance} autoRotate />
      </div>

      <div className="wizard-panel flex flex-col gap-5 overflow-y-auto border-l p-5 lg:w-[400px]">
        <div>
          <h2 className="font-display text-xl tracking-wide text-stone-100">Appearance</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Shape your physical form. Every mark tells a story on the frontier.
          </p>
        </div>

        <OptionGrid label="Eye Color" options={opts.eyeColors} selected={appearance.eyeColor} field="eyeColor" />
        <OptionGrid label="Skin Tone" options={opts.skinTones} selected={appearance.skinTone} field="skinTone" />
        <OptionGrid label="Markings" options={opts.markings} selected={appearance.marking} field="marking" />
        <OptionGrid label="Hair Style" options={opts.hairStyles} selected={appearance.hairStyle} field="hairStyle" />
        <OptionGrid label={opts.uniqueFeature} options={opts.uniqueFeatureOptions} selected={appearance.uniqueFeature} field="uniqueFeature" />
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
            &ldquo;You awaken on the Old Road with nothing but fragmented memories and a single weapon. The dragon blood stirs within you — not as a curse, but as a question. What will you become?&rdquo;
          </p>
        </div>
      </div>

      <div className="wizard-panel flex flex-col gap-5 border-l p-6 lg:w-[400px]">
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
            className="w-full rounded-xl border border-stone-700/50 bg-stone-900/50 px-5 py-4 font-display text-lg tracking-wide text-stone-100 placeholder-stone-700 transition-all focus:border-ember-500/50 focus:outline-none focus:ring-2 focus:ring-ember-500/15 focus:shadow-lg focus:shadow-ember-500/5"
          />
          <p className="mt-2 text-[10px] tabular-nums text-stone-700">
            {name.length}/24
          </p>
        </div>

        {/* Final Summary */}
        <div className="rounded-xl border border-stone-800/30 bg-stone-900/20 p-5">
          <h3 className="mb-4 font-display text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">
            Character Sheet
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Lineage</span>
              <span className="font-display text-[13px] font-bold text-stone-200">{race?.name}</span>
            </div>
            <div className="h-px bg-stone-800/50" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Dragon Memory</span>
              <span className="font-display text-[13px] font-bold text-stone-200">
                {memoryData?.name} <span className="text-stone-600">({memoryData?.element})</span>
              </span>
            </div>
            <div className="h-px bg-stone-800/50" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Weapon</span>
              <span className="font-display text-[13px] font-bold text-stone-200">{weaponData?.name}</span>
            </div>
            <div className="h-px bg-stone-800/50" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-stone-500">Starting Zone</span>
              <span className="font-display text-[13px] font-bold text-stone-200">Ironvale</span>
            </div>
          </div>

          {race && (
            <div className="mt-5 pt-4 border-t border-stone-800/30">
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(race.baseStats).map(([key, val]) => (
                  <div key={key} className="rounded-lg bg-stone-800/30 p-2 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-stone-600">{key.slice(0, 3)}</p>
                    <p className="text-[14px] font-black tabular-nums text-stone-200">{val}</p>
                  </div>
                ))}
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
