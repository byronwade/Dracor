import { NextRequest, NextResponse } from 'next/server';
import { DRACOR_HOSTS } from '@/lib/domain-config';
import { updateSession } from '@/lib/supabase/middleware';

const SUBDOMAIN_PREFIX_MAP: Record<string, string> = {
  [DRACOR_HOSTS.play]: '/play',
  [DRACOR_HOSTS.account]: '/account',
  [DRACOR_HOSTS.dev]: '/dev',
};

/**
 * Returns true when the hostname belongs to localhost or a private-network IP.
 */
function isLocal(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // --- Determine the effective pathname and whether a rewrite is needed ------
  const { pathname } = request.nextUrl;
  let effectivePath = pathname;
  let needsRewrite = false;

  if (!isLocal(hostname) && hostname !== DRACOR_HOSTS.main && hostname !== `www.${DRACOR_HOSTS.main}`) {
    const prefix = SUBDOMAIN_PREFIX_MAP[hostname];
    if (prefix && pathname !== prefix && !pathname.startsWith(prefix + '/')) {
      effectivePath = prefix + pathname;
      needsRewrite = true;
    }
  }

  // --- Auth session refresh + route protection --------------------------------
  const local = isLocal(hostname);
  const sessionResponse = await updateSession(request, effectivePath, local);

  // If updateSession issued a redirect (e.g. to login), return it immediately.
  if (sessionResponse.headers.get('location')) {
    return sessionResponse;
  }

  // --- Apply subdomain rewrite if required ------------------------------------
  if (needsRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = effectivePath;
    const rewriteResponse = NextResponse.rewrite(url, { request });

    // Copy session cookies (token refresh) onto the rewrite response so the
    // browser stores the updated tokens.
    sessionResponse.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, {
        ...cookie,
      });
    });

    return rewriteResponse;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon\\.ico|.*\\.(?:css|js|json|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)).*)',
  ],
};
