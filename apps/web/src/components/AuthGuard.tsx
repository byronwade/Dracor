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
    let subscription: { unsubscribe: () => void } | undefined;

    async function checkSession() {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (process.env.NODE_ENV === "development") {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
          router.push("/account/login");
        }
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser();

      if (user && !error) {
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
        router.push("/account/login");
      }

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setStatus("unauthenticated");
          router.push("/account/login");
        } else {
          setStatus("authenticated");
        }
      });
      subscription = sub;
    }

    checkSession();
    return () => { subscription?.unsubscribe(); };
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
