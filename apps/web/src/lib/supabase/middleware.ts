import { type NextRequest, NextResponse } from "next/server";

/**
 * Supabase auth middleware stub.
 *
 * When ready to implement server-side session management, this function
 * can be called from Next.js middleware (src/middleware.ts) to:
 * - Refresh expired auth tokens via cookies
 * - Protect routes that require authentication
 * - Redirect unauthenticated users to /login
 *
 * Implementation will use @supabase/ssr's createServerClient with
 * cookie get/set handlers to manage the session server-side.
 *
 * Example usage in src/middleware.ts:
 *
 *   import { updateSession } from '@/lib/supabase/middleware';
 *
 *   export async function middleware(request: NextRequest) {
 *     return await updateSession(request);
 *   }
 *
 *   export const config = {
 *     matcher: ['/dashboard/:path*', '/characters/:path*', '/play/:path*'],
 *   };
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // TODO: Implement server-side session refresh using @supabase/ssr
  // For now, pass through all requests
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}
