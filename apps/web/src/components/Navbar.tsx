"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/world", label: "World" },
  { href: "/races", label: "Races" },
  { href: "/armory", label: "Armory" },
  { href: "/technology", label: "Technology" },
  { href: "/account", label: "Account" },
  { href: "/play", label: "Play" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 100);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    async function checkAuth() {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoggedIn(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session);
      });
      subscription = sub;
    }

    checkAuth();
    return () => { subscription?.unsubscribe(); };
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    router.push("/");
  }

  const isHome = pathname === "/";
  const isFullscreenPage = pathname === "/characters/new" || pathname === "/account/characters/new";

  if (isFullscreenPage) return null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isHome
            ? "bg-surface/80 backdrop-blur-xl border-b border-line-subtle"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-8 lg:px-12">
          <Link
            href="/"
            className="font-display text-sm font-bold tracking-label text-content-dim transition-colors hover:text-content-primary"
          >
            DRACOR
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-medium uppercase tracking-nav transition-colors ${
                  pathname === link.href
                    ? "text-content-primary"
                    : "text-content-muted hover:text-content-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="text-xs font-medium uppercase tracking-nav text-content-muted transition-colors hover:text-content-primary"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/account/login"
                className="text-xs font-medium uppercase tracking-nav text-content-muted transition-colors hover:text-content-primary"
              >
                Login
              </Link>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center text-content-muted transition-colors hover:text-content-primary md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-8 bg-surface/95 backdrop-blur-xl md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium uppercase tracking-headline transition-colors ${
                  pathname === link.href
                    ? "text-content-primary"
                    : "text-content-muted hover:text-content-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="w-12 border-line-subtle" />
            {isLoggedIn ? (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="text-lg font-medium uppercase tracking-headline text-content-muted transition-colors hover:text-content-primary"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/account/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium uppercase tracking-headline text-content-muted transition-colors hover:text-content-primary"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
