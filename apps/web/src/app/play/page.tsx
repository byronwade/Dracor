"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";

const GAME_CLIENT_URL =
  process.env.NEXT_PUBLIC_GAME_CLIENT_URL || "http://localhost:5173";

function PlayContent() {
  const searchParams = useSearchParams();
  const characterName = searchParams.get("name");
  const [hasCharacters, setHasCharacters] = useState<boolean | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    characterName
  );

  useEffect(() => {
    async function checkCharacters() {
      const supabase = getSupabaseClient();

      if (!supabase) {
        setHasCharacters(true);
        if (!selectedCharacter) {
          setSelectedCharacter("Kael Ashborn");
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("characters")
        .select("name")
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        console.error("Error checking characters:", error);
        setHasCharacters(false);
        return;
      }

      setHasCharacters(data && data.length > 0);
      if (data && data.length > 0 && !selectedCharacter) {
        setSelectedCharacter(data[0].name);
      }
    }

    checkCharacters();
  }, [selectedCharacter]);

  function launchGame() {
    const url = new URL(GAME_CLIENT_URL);
    if (selectedCharacter) {
      url.searchParams.set("name", selectedCharacter);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  if (hasCharacters === false || (!selectedCharacter && hasCharacters !== null)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
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
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-stone-100">Enter the World</h1>
        <p className="text-stone-400">
          Select a character and launch the game client to step into Ironvale.
        </p>
      </div>

      {/* Character info */}
      <div className="card-dark mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-2xl">
            🗡️
          </div>
          <div>
            <p className="text-sm text-stone-400">Playing as</p>
            <p className="text-xl font-semibold text-stone-100">
              {selectedCharacter || "Unknown"}
            </p>
          </div>
          <Link
            href="/account/characters"
            className="ml-auto text-sm text-orange-500 transition-colors hover:text-orange-400"
          >
            Change
          </Link>
        </div>
      </div>

      {/* Launch button */}
      <div className="card-dark text-center">
        <button
          onClick={launchGame}
          className="btn-primary mb-6 px-12 py-4 text-xl"
        >
          Launch Game
        </button>

        <div className="space-y-3 text-left">
          <h3 className="font-semibold text-stone-200">Connection Instructions</h3>
          <ol className="list-inside list-decimal space-y-2 text-sm text-stone-400">
            <li>
              Click <strong className="text-stone-200">Launch Game</strong> to
              open the game client in a new tab.
            </li>
            <li>
              The client will automatically connect using your selected
              character.
            </li>
            <li>
              If the client doesn&apos;t load, ensure the game server is running
              at{" "}
              <code className="rounded bg-stone-800 px-1.5 py-0.5 text-xs text-orange-400">
                ws://localhost:2567
              </code>
            </li>
            <li>
              For local development, start all services with{" "}
              <code className="rounded bg-stone-800 px-1.5 py-0.5 text-xs text-orange-400">
                pnpm dev
              </code>
            </li>
          </ol>
        </div>
      </div>

      {/* Status indicators */}
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
