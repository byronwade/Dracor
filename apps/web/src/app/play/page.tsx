"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";

const GAME_CLIENT_URL =
  process.env.NEXT_PUBLIC_GAME_CLIENT_URL || "http://localhost:5173";

interface SelectedCharacter {
  id: string;
  name: string;
  level: number;
  weapon: string;
  memory: string;
  ancestry: string;
  zone_id: string;
}

function PlayContent() {
  const searchParams = useSearchParams();
  const characterIdParam = searchParams.get("characterId");
  const characterNameParam = searchParams.get("name");
  const [character, setCharacter] = useState<SelectedCharacter | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCharacter() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setCharacter({
          id: "mock-1",
          name: characterNameParam || "Kael Ashborn",
          level: 12,
          weapon: "blade",
          memory: "ember",
          ancestry: "dracor",
          zone_id: "ironvale_town",
        });
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        let query = supabase
          .from("characters")
          .select("id, name, level, weapon, memory, ancestry, zone_id")
          .eq("user_id", user.id);

        if (characterIdParam) {
          query = query.eq("id", characterIdParam);
        } else if (characterNameParam) {
          query = query.eq("name", characterNameParam);
        }

        const { data, error } = await query.limit(1).single();

        if (error || !data) {
          const { data: fallback } = await supabase
            .from("characters")
            .select("id, name, level, weapon, memory, ancestry, zone_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (fallback) setCharacter(fallback);
        } else {
          setCharacter(data);
        }
      } catch (err) {
        console.error("Failed to load character:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCharacter();
  }, [characterIdParam, characterNameParam]);

  function launchGame() {
    if (!character) return;
    const url = new URL(GAME_CLIENT_URL);
    url.searchParams.set("name", character.name);
    url.searchParams.set("characterId", character.id);
    if (userId) url.searchParams.set("userId", userId);
    url.searchParams.set("weapon", character.weapon);
    url.searchParams.set("memory", character.memory);
    url.searchParams.set("level", String(character.level));
    url.searchParams.set("race", character.ancestry);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🐉</div>
          <p className="text-stone-400">Loading character...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-20 pb-12">
        <div className="card-dark flex flex-col items-center py-16 text-center">
          <div className="mb-4 text-5xl">🐉</div>
          <h1 className="mb-2 text-2xl font-bold text-stone-100">
            No Character Selected
          </h1>
          <p className="mb-6 text-stone-400">
            You need to create or select a character before entering the world.
          </p>
          <Link href="/account/characters" className="btn-primary">
            Go to Characters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-20 pb-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-stone-100">Enter the World</h1>
        <p className="text-stone-400">
          Your character is ready. Launch the game client to step into Ironvale.
        </p>
      </div>

      <div className="card-dark mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
            {character.weapon === "blade" ? "⚔️" : character.weapon === "bow" ? "🏹" : "🪄"}
          </div>
          <div className="flex-1">
            <p className="text-sm text-stone-400">Playing as</p>
            <p className="text-xl font-semibold text-stone-100">
              {character.name}
            </p>
            <p className="text-xs text-stone-500">
              Level {character.level} {character.ancestry} &bull; {character.memory} memory &bull; {character.weapon}
            </p>
          </div>
          <Link
            href="/account/characters"
            className="text-sm text-orange-500 transition-colors hover:text-orange-400"
          >
            Change
          </Link>
        </div>
      </div>

      <div className="card-dark text-center">
        <button
          onClick={launchGame}
          className="btn-primary mb-6 px-12 py-4 text-xl"
        >
          Launch Game
        </button>

        <div className="space-y-3 text-left">
          <h3 className="font-semibold text-stone-200">How It Works</h3>
          <ol className="list-inside list-decimal space-y-2 text-sm text-stone-400">
            <li>
              Click <strong className="text-stone-200">Launch Game</strong> to
              open the game client in a new tab.
            </li>
            <li>
              The client will connect with your character data automatically.
            </li>
            <li>
              Use WASD to move, Shift to sprint, and Space to jump.
            </li>
            <li>
              Press F3 for the performance overlay.
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card-dark flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-sm text-stone-300">Web App Connected</span>
        </div>
        <div className="card-dark flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-stone-600" />
          <span className="text-sm text-stone-400">
            Game Server (click Launch)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <AuthGuard>
      <PlayContent />
    </AuthGuard>
  );
}
