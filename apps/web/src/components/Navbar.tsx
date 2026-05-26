"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/world", label: "World" },
  { href: "/technology", label: "Technology" },
  { href: "/account", label: "Account" },
  { href: "/play", label: "Play" },
  { href: "/dev", label: "Dev" },
];

const HIDDEN_PATHS = ["/characters/new"];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoggedIn(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session);
      });

      return () => subscription.unsubscribe();
    }

    checkAuth();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-800 bg-stone-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="ember-gradient-text text-xl font-black tracking-tight"
        >
          DRACOR
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-stone-800 text-orange-400"
                  : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth button (desktop) */}
        <div className="hidden md:block">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-900 hover:text-stone-200 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-stone-800 bg-stone-950 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-stone-800 text-orange-400"
                    : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-stone-800" />
            {isLoggedIn ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="rounded-lg px-4 py-3 text-left text-sm font-medium text-stone-400 transition-colors hover:bg-stone-900 hover:text-stone-200"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-orange-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-orange-500"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
