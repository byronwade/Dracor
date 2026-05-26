"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/AuthGuard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RaceId, WeaponType, DragonMemory } from "@dracor/shared";
import { RACES, getRaceById, DRAGON_MEMORIES, STARTER_WEAPONS } from "@dracor/game-data";

const CharacterViewer = dynamic(
  () => import("@/components/CharacterViewer").then((mod) => mod.CharacterViewer),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500 border-t-transparent" /></div> }
);

type WizardStep = "race" | "memory" | "weapon" | "appearance" | "name";

const STEPS: WizardStep[] = ["race", "memory", "weapon", "appearance", "name"];
const STEP_LABELS: Record<WizardStep, string> = {
  race: "Lineage",
  memory: "Dragon Memory",
  weapon: "Weapon",
  appearance: "Appearance",
  name: "Identity",
};

function StepIndicator({ currentStep, steps }: { currentStep: WizardStep; steps: WizardStep[] }) {
  const currentIdx = steps.indexOf(currentStep);
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
              idx < currentIdx
                ? "bg-ember-500 text-white"
                : idx === currentIdx
                  ? "border-2 border-ember-500 bg-ember-500/20 text-ember-400"
                  : "border border-stone-700 bg-stone-800/50 text-stone-500"
            }`}
          >
            {idx < currentIdx ? "✓" : idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 w-6 transition-all duration-300 ${
                idx < currentIdx ? "bg-ember-500" : "bg-stone-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StatBar({ label, value, max = 12, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-medium text-stone-400 uppercase tracking-wider">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-bold text-stone-300">{value}</span>
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
      <div className="flex flex-col gap-2 overflow-y-auto border-r border-stone-800/50 p-4 lg:w-80">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
          Choose Your Lineage
        </h2>
        {RACES.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`group relative rounded-lg border p-3 text-left transition-all duration-200 ${
              selectedRace === r.id
                ? "border-ember-500/80 bg-ember-500/10 shadow-lg shadow-ember-500/5"
                : "border-stone-800 bg-stone-900/30 hover:border-stone-600 hover:bg-stone-800/50"
            }`}
          >
            <h3 className={`text-sm font-bold ${selectedRace === r.id ? "text-ember-400" : "text-stone-200"}`}>
              {r.name}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">{r.tagline}</p>
          </button>
        ))}
      </div>

      {/* Center: 3D Viewer */}
      <div className="relative flex-1">
        {selectedRace ? (
          <CharacterViewer raceId={selectedRace} autoRotate />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-stone-500 italic">Select a lineage to preview</p>
          </div>
        )}
      </div>

      {/* Right: Race details */}
      {race && (
        <div className="overflow-y-auto border-l border-stone-800/50 p-5 lg:w-96">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-stone-100">{race.name}</h2>
            <p className="text-sm italic text-ember-400">{race.tagline}</p>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-stone-400">{race.description}</p>

          {/* Stats */}
          <div className="mb-5 rounded-lg border border-stone-800 bg-stone-900/50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">
              Base Attributes
            </h3>
            <div className="space-y-2">
              <StatBar label="STR" value={race.baseStats.strength} color="bg-red-500" />
              <StatBar label="AGI" value={race.baseStats.agility} color="bg-green-500" />
              <StatBar label="VIT" value={race.baseStats.vitality} color="bg-amber-500" />
              <StatBar label="SPI" value={race.baseStats.spirit} color="bg-purple-500" />
              <StatBar label="FOC" value={race.baseStats.focus} color="bg-blue-500" />
            </div>
            <p className="mt-2 text-center text-xs text-stone-600">
              Total: {Object.values(race.baseStats).reduce((a, b) => a + b, 0)} points
            </p>
          </div>

          {/* Abilities */}
          <div className="mb-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-500">
              Racial Abilities
            </h3>
            <div className="space-y-3">
              {race.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="rounded-lg border border-stone-800 bg-stone-900/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        ability.type === "passive"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-sky-500/20 text-sky-400"
                      }`}
                    >
                      {ability.type}
                    </span>
                    <h4 className="text-sm font-bold text-stone-200">{ability.name}</h4>
                    {ability.cooldown && (
                      <span className="ml-auto text-xs text-stone-600">{ability.cooldown}s CD</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{ability.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Traits */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
              Physical Traits
            </h3>
            <ul className="space-y-1">
              {race.traits.map((trait, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                  <span className="mt-0.5 text-ember-500">◆</span>
                  {trait}
                </li>
              ))}
            </ul>
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
  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Center: 3D Viewer */}
      <div className="relative flex-1">
        <CharacterViewer raceId={selectedRace} memory={selectedMemory || undefined} autoRotate />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950 to-transparent p-6">
          <p className="text-center text-sm text-stone-400">
            Your Dragon Memory determines your elemental affinity and progression path
          </p>
        </div>
      </div>

      {/* Right: Memory selection */}
      <div className="flex flex-col gap-4 overflow-y-auto border-l border-stone-800/50 p-6 lg:w-[420px]">
        <div className="mb-2">
          <h2 className="text-xl font-black text-stone-100">Dragon Memory</h2>
          <p className="text-sm text-stone-400">
            A fragment of ancient draconic power burns within every Dracor descendant. Choose which memory stirs in your blood.
          </p>
        </div>

        {DRAGON_MEMORIES.map((mem) => {
          const isSelected = selectedMemory === mem.id;
          const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
            ember: { border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-400", glow: "shadow-orange-500/20" },
            stone: { border: "border-amber-600", bg: "bg-amber-600/10", text: "text-amber-500", glow: "shadow-amber-600/20" },
            storm: { border: "border-sky-500", bg: "bg-sky-500/10", text: "text-sky-400", glow: "shadow-sky-500/20" },
          };
          const colors = colorMap[mem.id] || colorMap.ember;

          return (
            <button
              key={mem.id}
              onClick={() => onSelect(mem.id as DragonMemory)}
              className={`relative rounded-xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
                  : "border-stone-800 bg-stone-900/30 hover:border-stone-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isSelected ? colors.bg : "bg-stone-800"
                  }`}
                >
                  <span className="text-2xl">
                    {mem.id === "ember" ? "🔥" : mem.id === "stone" ? "🪨" : "⚡"}
                  </span>
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isSelected ? colors.text : "text-stone-200"}`}>
                    {mem.name}
                  </h3>
                  <p className="text-xs text-stone-500">Element: {mem.element}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-400">{mem.description}</p>
              <div className="mt-3 rounded-md bg-stone-800/50 px-3 py-2">
                <p className="text-xs font-medium text-stone-300">
                  <span className="text-stone-500">Passive:</span> {mem.passiveBonus}
                </p>
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
  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Center: 3D Viewer */}
      <div className="relative flex-1">
        <CharacterViewer
          raceId={selectedRace}
          memory={selectedMemory || undefined}
          weapon={selectedWeapon || undefined}
          autoRotate
        />
      </div>

      {/* Right: Weapon selection */}
      <div className="flex flex-col gap-4 overflow-y-auto border-l border-stone-800/50 p-6 lg:w-[420px]">
        <div className="mb-2">
          <h2 className="text-xl font-black text-stone-100">Choose Your Weapon</h2>
          <p className="text-sm text-stone-400">
            You awaken on the Old Road with a single weapon in hand. This will define your combat style.
          </p>
        </div>

        {STARTER_WEAPONS.map((w) => {
          const weaponId = w.metadata?.weaponClass as WeaponType;
          const isSelected = selectedWeapon === weaponId;
          const iconMap: Record<string, string> = {
            blade: "⚔️",
            bow: "🏹",
            staff: "🪄",
          };

          return (
            <button
              key={w.id}
              onClick={() => onSelect(weaponId)}
              className={`relative rounded-xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? "border-ember-500/80 bg-ember-500/10 shadow-lg shadow-ember-500/10"
                  : "border-stone-800 bg-stone-900/30 hover:border-stone-600"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-lg ${
                    isSelected ? "bg-ember-500/20" : "bg-stone-800"
                  }`}
                >
                  <span className="text-3xl">{iconMap[weaponId] || "⚔️"}</span>
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-bold ${isSelected ? "text-ember-400" : "text-stone-200"}`}
                  >
                    {w.name}
                  </h3>
                  <p className="text-xs text-stone-500">{w.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-md bg-stone-800/50 p-2 text-center">
                  <p className="text-xs text-stone-500">Damage</p>
                  <p className="text-sm font-bold text-stone-200">
                    {w.damageMin}-{w.damageMax}
                  </p>
                </div>
                <div className="rounded-md bg-stone-800/50 p-2 text-center">
                  <p className="text-xs text-stone-500">Speed</p>
                  <p className="text-sm font-bold text-stone-200">
                    {(w.metadata?.attackSpeed as number)?.toFixed(1)}x
                  </p>
                </div>
                <div className="rounded-md bg-stone-800/50 p-2 text-center">
                  <p className="text-xs text-stone-500">Type</p>
                  <p className="text-sm font-bold text-stone-200 capitalize">{weaponId}</p>
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
  appearance: {
    eyeColor: string;
    skinTone: string;
    marking: string;
    hairStyle: string;
    uniqueFeature: string;
  };
  onUpdate: (field: string, value: string) => void;
}) {
  const race = getRaceById(selectedRace);
  if (!race) return null;

  const opts = race.appearance;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Center: 3D Viewer */}
      <div className="relative flex-1">
        <CharacterViewer
          raceId={selectedRace}
          memory={selectedMemory || undefined}
          appearance={appearance}
          autoRotate
        />
      </div>

      {/* Right: Appearance options */}
      <div className="flex flex-col gap-5 overflow-y-auto border-l border-stone-800/50 p-6 lg:w-[420px]">
        <div className="mb-1">
          <h2 className="text-xl font-black text-stone-100">Customize Appearance</h2>
          <p className="text-sm text-stone-400">
            Shape your physical form. These traits mark you as unique among your kind.
          </p>
        </div>

        {/* Eye Color */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            Eye Color
          </label>
          <div className="grid grid-cols-3 gap-2">
            {opts.eyeColors.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate("eyeColor", color)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  appearance.eyeColor === color
                    ? "border-ember-500 bg-ember-500/10 text-ember-400"
                    : "border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            Skin Tone
          </label>
          <div className="grid grid-cols-3 gap-2">
            {opts.skinTones.map((tone) => (
              <button
                key={tone}
                onClick={() => onUpdate("skinTone", tone)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  appearance.skinTone === tone
                    ? "border-ember-500 bg-ember-500/10 text-ember-400"
                    : "border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600"
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Markings */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            Markings
          </label>
          <div className="grid grid-cols-3 gap-2">
            {opts.markings.map((mark) => (
              <button
                key={mark}
                onClick={() => onUpdate("marking", mark)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  appearance.marking === mark
                    ? "border-ember-500 bg-ember-500/10 text-ember-400"
                    : "border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600"
                }`}
              >
                {mark}
              </button>
            ))}
          </div>
        </div>

        {/* Hair Style */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            Hair Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {opts.hairStyles.map((style) => (
              <button
                key={style}
                onClick={() => onUpdate("hairStyle", style)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  appearance.hairStyle === style
                    ? "border-ember-500 bg-ember-500/10 text-ember-400"
                    : "border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Unique Feature */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-500">
            {opts.uniqueFeature}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {opts.uniqueFeatureOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => onUpdate("uniqueFeature", opt)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  appearance.uniqueFeature === opt
                    ? "border-ember-500 bg-ember-500/10 text-ember-400"
                    : "border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
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
  const weaponData = STARTER_WEAPONS.find(
    (w) => w.metadata?.weaponClass === selectedWeapon
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Center: 3D Viewer */}
      <div className="relative flex-1">
        <CharacterViewer
          raceId={selectedRace}
          memory={selectedMemory || undefined}
          weapon={selectedWeapon || undefined}
          appearance={appearance}
          autoRotate
        />
        {name && (
          <div className="absolute left-1/2 top-8 -translate-x-1/2">
            <div className="rounded-lg border border-ember-500/30 bg-stone-950/80 px-6 py-2 backdrop-blur-sm">
              <p className="text-center text-lg font-black text-ember-400">{name}</p>
              <p className="text-center text-xs text-stone-400">
                {race?.name} • {memoryData?.name} Memory
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Name and summary */}
      <div className="flex flex-col gap-5 overflow-y-auto border-l border-stone-800/50 p-6 lg:w-[420px]">
        <div>
          <h2 className="text-xl font-black text-stone-100">Name Your Character</h2>
          <p className="text-sm text-stone-400">
            Choose a name that will be known throughout Ironvale and beyond.
          </p>
        </div>

        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your name (2-24 characters)"
            maxLength={24}
            className="w-full rounded-xl border border-stone-700 bg-stone-800/80 px-5 py-4 text-lg font-bold text-stone-100 placeholder-stone-600 transition-all focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
          />
          <p className="mt-2 text-xs text-stone-600">
            {name.length}/24 characters • Letters, numbers, spaces, hyphens, apostrophes
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-500">
            Character Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Lineage</span>
              <span className="text-sm font-bold text-stone-200">{race?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Dragon Memory</span>
              <span className="text-sm font-bold text-stone-200">{memoryData?.name} ({memoryData?.element})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Weapon</span>
              <span className="text-sm font-bold text-stone-200">{weaponData?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-400">Starting Zone</span>
              <span className="text-sm font-bold text-stone-200">Ironvale</span>
            </div>
          </div>

          {race && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
                Base Stats
              </h4>
              <div className="grid grid-cols-5 gap-2 text-center">
                {Object.entries(race.baseStats).map(([key, val]) => (
                  <div key={key} className="rounded-md bg-stone-800/50 p-2">
                    <p className="text-[10px] uppercase text-stone-500">{key.slice(0, 3)}</p>
                    <p className="text-sm font-bold text-stone-200">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-stone-800/50 bg-stone-900/30 p-4">
          <p className="text-center text-xs italic text-stone-500">
            &quot;You awaken on the Old Road with nothing but fragmented memories and a single weapon. The dragon blood stirs within you — not as a curse, but as a question. What will you become?&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

function CharacterCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("race");
  const [selectedRace, setSelectedRace] = useState<RaceId | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<DragonMemory | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType | null>(null);
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState({
    eyeColor: "",
    skinTone: "",
    marking: "",
    hairStyle: "",
    uniqueFeature: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStepIdx = STEPS.indexOf(step);

  const canProceed = useCallback(() => {
    switch (step) {
      case "race":
        return !!selectedRace;
      case "memory":
        return !!selectedMemory;
      case "weapon":
        return !!selectedWeapon;
      case "appearance":
        return !!appearance.eyeColor && !!appearance.skinTone;
      case "name":
        return name.trim().length >= 2 && name.trim().length <= 24;
    }
  }, [step, selectedRace, selectedMemory, selectedWeapon, appearance, name]);

  const handleNext = () => {
    if (currentStepIdx < STEPS.length - 1) {
      setStep(STEPS[currentStepIdx + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setStep(STEPS[currentStepIdx - 1]);
    }
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

  const handleAppearanceUpdate = (field: string, value: string) => {
    setAppearance((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setError(null);

    if (!selectedRace || !selectedMemory || !selectedWeapon || !name.trim()) {
      setError("Please complete all steps before creating your character.");
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 24) {
      setError("Name must be between 2 and 24 characters.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();

    if (!supabase) {
      setError("Unable to connect. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to create a character.");
        setLoading(false);
        return;
      }

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
        position_x: 0,
        position_y: 0,
        position_z: 0,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("A character with that name already exists. Choose another.");
        } else {
          setError(insertError.message);
        }
        setLoading(false);
        return;
      }

      router.push("/characters");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-950">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-stone-800/50 bg-stone-950/90 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/characters")}
            className="text-xs text-stone-500 transition-colors hover:text-stone-300"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-stone-800" />
          <h1 className="text-sm font-bold text-stone-300">Character Creation</h1>
        </div>
        <StepIndicator currentStep={step} steps={STEPS} />
        <div className="text-xs text-stone-600">
          {STEP_LABELS[step]}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2">
          <p className="text-center text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {step === "race" && (
          <RaceSelectionStep selectedRace={selectedRace} onSelect={handleRaceSelect} />
        )}
        {step === "memory" && selectedRace && (
          <MemorySelectionStep
            selectedMemory={selectedMemory}
            selectedRace={selectedRace}
            onSelect={setSelectedMemory}
          />
        )}
        {step === "weapon" && selectedRace && (
          <WeaponSelectionStep
            selectedWeapon={selectedWeapon}
            selectedRace={selectedRace}
            selectedMemory={selectedMemory}
            onSelect={setSelectedWeapon}
          />
        )}
        {step === "appearance" && selectedRace && (
          <AppearanceStep
            selectedRace={selectedRace}
            selectedMemory={selectedMemory}
            appearance={appearance}
            onUpdate={handleAppearanceUpdate}
          />
        )}
        {step === "name" && selectedRace && (
          <NameStep
            name={name}
            onNameChange={setName}
            selectedRace={selectedRace}
            selectedMemory={selectedMemory}
            selectedWeapon={selectedWeapon}
            appearance={appearance}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between border-t border-stone-800/50 bg-stone-950/90 px-6 py-4 backdrop-blur-sm">
        <button
          onClick={handleBack}
          disabled={currentStepIdx === 0}
          className="rounded-lg border border-stone-700 bg-stone-800 px-5 py-2.5 text-sm font-medium text-stone-300 transition-all hover:border-stone-600 hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Previous
        </button>

        <div className="text-xs text-stone-600">
          Step {currentStepIdx + 1} of {STEPS.length}
        </div>

        {step === "name" ? (
          <button
            onClick={handleCreate}
            disabled={!canProceed() || loading}
            className="rounded-lg bg-gradient-to-r from-ember-600 to-orange-500 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-ember-500/20 transition-all hover:from-ember-500 hover:to-orange-400 hover:shadow-ember-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </span>
            ) : (
              "⚔️ Create Character"
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="rounded-lg bg-gradient-to-r from-ember-600 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-ember-500/20 transition-all hover:from-ember-500 hover:to-orange-400 hover:shadow-ember-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
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
