import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/** Hostname for the account subdomain in production. */
const ACCOUNT_HOST = "account.thedracor.com";

/**
 * Refreshes the Supabase auth session and protects routes that require
 * authentication.
 *
 * @param request       The incoming Next.js request.
 * @param effectivePath The logical pathname after subdomain-to-prefix mapping
 *                      (e.g. account.thedracor.com/login -> "/account/login").
 *                      Falls back to request.nextUrl.pathname when omitted.
 * @param isLocalHost   True when the request originates from localhost or a
 *                      private-network IP. Used to decide whether the login
 *                      redirect should target a subdomain or a path prefix.
 * @returns A NextResponse with refreshed session cookies, or a redirect to the
 *          login page for unauthenticated users on protected routes.
 */
export async function updateSession(
  request: NextRequest,
  effectivePath?: string,
  isLocalHost?: boolean
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, pass through without auth checks.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        // Forward updated cookies to the request so downstream server
        // components see them.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Re-create the response to carry the updated request cookies.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session — this silently renews expired tokens via cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use the effective (post-rewrite) pathname so that subdomain routes like
  // account.thedracor.com/characters are correctly recognised as /account/*.
  const pathname = effectivePath ?? request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/account") || pathname.startsWith("/play");
  const isLoginRoute = pathname === "/account/login";

  // Redirect unauthenticated users away from protected routes (except login).
  // On localhost, skip the server-side redirect — the Supabase client SDK stores
  // auth tokens in localStorage (not cookies), so getUser() always returns null.
  // The client-side AuthGuard handles auth on localhost instead.
  if (!user && isProtectedRoute && !isLoginRoute && !isLocalHost) {
    const url = request.nextUrl.clone();
    url.host = ACCOUNT_HOST;
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
