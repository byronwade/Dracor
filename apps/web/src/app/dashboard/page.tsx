"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";

interface UserProfile {
  email: string;
  displayName: string;
  createdAt: string;
}

function DashboardContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setProfile({
          email: "wanderer@ironvale.com",
          displayName: "Wanderer",
          createdAt: new Date().toISOString(),
        });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setProfile({
          email: user.email || "Unknown",
          displayName:
            user.user_metadata?.display_name || user.email?.split("@")[0] || "Wanderer",
          createdAt: user.created_at,
        });
      }
    }

    loadProfile();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-20 pb-12">
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-stone-100">
          Welcome back,{" "}
          <span className="ember-gradient-text">
            {profile?.displayName || "Wanderer"}
          </span>
        </h1>
        <p className="text-stone-400">
          The road awaits. What would you like to do today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/characters" className="card-dark group">
          <div className="mb-3 text-3xl">🗡️</div>
          <h3 className="mb-1 text-lg font-semibold text-stone-100 group-hover:text-orange-400">
            Characters
          </h3>
          <p className="text-sm text-stone-400">
            Manage your heroes and create new adventurers.
          </p>
        </Link>

        <Link href="/play" className="card-dark group">
          <div className="mb-3 text-3xl">🎮</div>
          <h3 className="mb-1 text-lg font-semibold text-stone-100 group-hover:text-orange-400">
            Play Now
          </h3>
          <p className="text-sm text-stone-400">
            Launch the game client and enter Ironvale.
          </p>
        </Link>

        <div className="card-dark opacity-60">
          <div className="mb-3 text-3xl">📋</div>
          <h3 className="mb-1 text-lg font-semibold text-stone-100">
            Contracts
          </h3>
          <p className="text-sm text-stone-400">
            View available contracts and bounties. (Coming Soon)
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-12">
        <h2 className="mb-4 text-xl font-semibold text-stone-100">
          Recent Activity
        </h2>
        <div className="card-dark">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 text-4xl opacity-50">📜</div>
            <p className="text-stone-400">No recent activity yet.</p>
            <p className="mt-1 text-sm text-stone-500">
              Create a character and begin your first contract to see activity
              here.
            </p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-stone-100">
          Account Info
        </h2>
        <div className="card-dark">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-stone-400">Email</dt>
              <dd className="mt-1 text-stone-100">
                {profile?.email || "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-400">
                Display Name
              </dt>
              <dd className="mt-1 text-stone-100">
                {profile?.displayName || "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-400">
                Member Since
              </dt>
              <dd className="mt-1 text-stone-100">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Loading..."}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-400">Status</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Active
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
