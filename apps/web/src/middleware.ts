import { NextRequest, NextResponse } from 'next/server';
import { DRACOR_HOSTS } from '@/lib/domain-config';

const SUBDOMAIN_PREFIX_MAP: Record<string, string> = {
  [DRACOR_HOSTS.play]: '/play',
  [DRACOR_HOSTS.account]: '/account',
  [DRACOR_HOSTS.dev]: '/dev',
};

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    return NextResponse.next();
  }

  if (hostname === DRACOR_HOSTS.main || hostname === `www.${DRACOR_HOSTS.main}`) {
    return NextResponse.next();
  }

  const prefix = SUBDOMAIN_PREFIX_MAP[hostname];
  if (prefix) {
    const { pathname } = request.nextUrl;

    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = prefix + pathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon\\.ico|.*\\.(?:css|js|json|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)).*)',
  ],
};
