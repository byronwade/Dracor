"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";

interface Character {
  id: string;
  name: string;
  level: number;
  weapon: string;
  memory: string;
  zone_id: string;
}

const MOCK_CHARACTERS: Character[] = [
  {
    id: "mock-1",
    name: "Kael Ashborn",
    level: 12,
    weapon: "blade",
    memory: "ember",
    zone_id: "ironvale_town",
  },
  {
    id: "mock-2",
    name: "Sera Stormcaller",
    level: 7,
    weapon: "staff",
    memory: "storm",
    zone_id: "old_road",
  },
];

function weaponIcon(weapon: string): string {
  switch (weapon.toLowerCase()) {
    case "blade":
      return "⚔️";
    case "bow":
      return "🏹";
    case "staff":
      return "🪄";
    default:
      return "🗡️";
  }
}

function memoryColor(memory: string): string {
  switch (memory.toLowerCase()) {
    case "ember":
      return "text-orange-400";
    case "stone":
      return "text-amber-600";
    case "storm":
      return "text-sky-400";
    default:
      return "text-stone-400";
  }
}

function formatZoneName(zoneId: string): string {
  switch (zoneId) {
    case "ironvale_town":
      return "Ironvale";
    case "old_road":
      return "The Old Road";
    case "wolfpine_woods":
      return "Wolfpine Woods";
    case "ashroot_mine":
      return "Ashroot Mine";
    default:
      return zoneId;
  }
}

function AccountCharactersContent() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function loadCharacters() {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setCharacters(MOCK_CHARACTERS);
        setUsingMock(true);
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("characters")
          .select("id, name, level, weapon, memory, zone_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading characters:", error);
          setCharacters(MOCK_CHARACTERS);
          setUsingMock(true);
        } else {
          setCharacters(data || []);
        }
      } catch (err) {
        console.error("Failed to load characters:", err);
        setCharacters(MOCK_CHARACTERS);
        setUsingMock(true);
      }

      setLoading(false);
    }

    loadCharacters();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🐉</div>
          <p className="text-stone-400">Loading characters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-20 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Your Characters</h1>
          <p className="mt-1 text-stone-400">
            Manage your heroes of Ironvale.
          </p>
        </div>
        <Link href="/account/characters/new" className="btn-primary">
          + Create New Character
        </Link>
      </div>

      {/* Mock data notice */}
      {usingMock && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            Showing sample characters. Connect Supabase to load your real
            character data.
          </p>
        </div>
      )}

      {/* Character list */}
      {characters.length === 0 ? (
        <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-5xl">🐉</div>
          <h2 className="mb-2 text-xl font-semibold text-stone-100">
            No Characters Yet
          </h2>
          <p className="mb-6 max-w-md text-stone-400">
            Your journey begins with a single step. Create your first character
            to begin exploring the world of Dracor.
          </p>
          <Link href="/account/characters/new" className="btn-primary">
            Create Your First Character
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <div key={character.id} className="card-dark flex flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-stone-100">
                    {character.name}
                  </h3>
                  <p className="text-sm text-stone-400">
                    Level {character.level}
                  </p>
                </div>
                <span className="text-2xl">{weaponIcon(character.weapon)}</span>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Weapon</span>
                  <span className="capitalize text-stone-200">{character.weapon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Dragon Memory</span>
                  <span className={`capitalize ${memoryColor(character.memory)}`}>
                    {character.memory}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Zone</span>
                  <span className="text-stone-200">{formatZoneName(character.zone_id)}</span>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={`/play?name=${encodeURIComponent(character.name)}`}
                  className="btn-primary w-full text-center text-sm"
                >
                  Select &amp; Play
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountCharactersPage() {
  return (
    <AuthGuard>
      <AccountCharactersContent />
    </AuthGuard>
  );
}
