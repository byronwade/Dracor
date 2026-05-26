"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";

const WEAPONS = [
  {
    id: "blade",
    name: "Blade",
    icon: "⚔️",
    description: "Swift strikes and precise counters. Masters the dance of steel.",
  },
  {
    id: "bow",
    name: "Bow",
    icon: "🏹",
    description: "Deadly at range with piercing volleys and enchanted arrows.",
  },
  {
    id: "staff",
    name: "Staff",
    icon: "🪄",
    description: "Channels raw dragon energy into devastating arcane assaults.",
  },
];

const MEMORIES = [
  {
    id: "ember",
    name: "Ember",
    color: "text-orange-400 border-orange-500/50",
    bgActive: "bg-orange-500/10 border-orange-500",
    description: "Fire and fury. Burn through enemies with relentless aggression.",
  },
  {
    id: "stone",
    name: "Stone",
    color: "text-amber-600 border-amber-600/50",
    bgActive: "bg-amber-600/10 border-amber-600",
    description: "Unyielding defense. Outlast any foe with ancient resilience.",
  },
  {
    id: "storm",
    name: "Storm",
    color: "text-sky-400 border-sky-500/50",
    bgActive: "bg-sky-500/10 border-sky-500",
    description: "Lightning speed. Strike before they see you coming.",
  },
];

const EYE_COLORS = ["amber", "crimson", "emerald", "sapphire", "silver"];
const SCALE_MARKINGS = ["none", "subtle", "pronounced", "radiant"];
const HORN_STYLES = ["none", "ridged", "curved", "crowned"];

function CharacterCreationContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [weapon, setWeapon] = useState("");
  const [dragonMemory, setDragonMemory] = useState("");
  const [eyeColor, setEyeColor] = useState("amber");
  const [scaleMarking, setScaleMarking] = useState("none");
  const [hornStyle, setHornStyle] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Your character needs a name.");
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 24) {
      setError("Name must be between 2 and 24 characters.");
      return;
    }

    if (!weapon) {
      setError("Choose a weapon for your character.");
      return;
    }

    if (!dragonMemory) {
      setError("Choose a dragon memory lineage.");
      return;
    }

    setLoading(true);

    const supabase = getSupabaseClient();

    if (!supabase) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/characters");
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
        weapon,
        memory: dragonMemory,
        appearance: {
          eyeColor,
          scaleMarking,
          hornStyle,
        },
        zone_id: "ironvale_town",
        position_x: 0,
        position_y: 0,
        position_z: 0,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("A character with that name already exists.");
        } else {
          setError(insertError.message);
        }
        setLoading(false);
        return;
      }

      router.push("/characters");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/characters"
          className="mb-4 inline-flex items-center text-sm text-stone-400 transition-colors hover:text-stone-200"
        >
          &larr; Back to Characters
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">
          Create New Character
        </h1>
        <p className="mt-1 text-stone-400">
          Forge a new hero to walk the First Road.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Name */}
        <div className="card-dark">
          <h2 className="mb-4 text-lg font-semibold text-stone-100">
            Character Name
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name (2-24 characters)"
            className="input-dark"
            maxLength={24}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-stone-500">
            Choose wisely — this name will be known throughout Ironvale.
          </p>
        </div>

        {/* Weapon Choice */}
        <div className="card-dark">
          <h2 className="mb-4 text-lg font-semibold text-stone-100">
            Weapon Choice
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {WEAPONS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWeapon(w.id)}
                disabled={loading}
                className={`rounded-lg border p-4 text-left transition-all ${
                  weapon === w.id
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-stone-700 bg-stone-800/50 hover:border-stone-600"
                }`}
              >
                <div className="mb-2 text-2xl">{w.icon}</div>
                <h3 className="font-semibold text-stone-100">{w.name}</h3>
                <p className="mt-1 text-xs text-stone-400">{w.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Dragon Memory */}
        <div className="card-dark">
          <h2 className="mb-4 text-lg font-semibold text-stone-100">
            Dragon Memory
          </h2>
          <p className="mb-4 text-sm text-stone-400">
            Your ancestral dragon lineage determines your progression path.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {MEMORIES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setDragonMemory(m.id)}
                disabled={loading}
                className={`rounded-lg border p-4 text-left transition-all ${
                  dragonMemory === m.id
                    ? m.bgActive
                    : "border-stone-700 bg-stone-800/50 hover:border-stone-600"
                }`}
              >
                <h3 className={`font-semibold ${m.color.split(" ")[0]}`}>
                  {m.name}
                </h3>
                <p className="mt-1 text-xs text-stone-400">{m.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="card-dark">
          <h2 className="mb-4 text-lg font-semibold text-stone-100">
            Appearance
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Eye Color */}
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-300">
                Eye Color
              </label>
              <select
                value={eyeColor}
                onChange={(e) => setEyeColor(e.target.value)}
                className="input-dark"
                disabled={loading}
              >
                {EYE_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Marking */}
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-300">
                Scale Marking
              </label>
              <select
                value={scaleMarking}
                onChange={(e) => setScaleMarking(e.target.value)}
                className="input-dark"
                disabled={loading}
              >
                {SCALE_MARKINGS.map((marking) => (
                  <option key={marking} value={marking}>
                    {marking.charAt(0).toUpperCase() + marking.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Horn Style */}
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-300">
                Horn Style
              </label>
              <select
                value={hornStyle}
                onChange={(e) => setHornStyle(e.target.value)}
                className="input-dark"
                disabled={loading}
              >
                {HORN_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Character"}
          </button>
          <Link href="/characters" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewCharacterPage() {
  return (
    <AuthGuard>
      <CharacterCreationContent />
    </AuthGuard>
  );
}
