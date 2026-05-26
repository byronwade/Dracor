"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    async function checkSession() {
      const supabase = getSupabaseClient();

      // If Supabase is not configured, allow access in dev mode
      if (!supabase) {
        if (process.env.NODE_ENV === "development") {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
          router.push("/login");
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
        router.push("/login");
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setStatus("unauthenticated");
          router.push("/login");
        } else {
          setStatus("authenticated");
        }
      });

      return () => subscription.unsubscribe();
    }

    checkSession();
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-700 border-t-orange-500" />
          <p className="text-sm text-stone-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
