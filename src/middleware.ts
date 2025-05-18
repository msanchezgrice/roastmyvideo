import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware'; // Adjusted path

export async function middleware(request: NextRequest) {
  console.log(`[Middleware Main] Path: ${request.nextUrl.pathname}`);
  // console.log('[Middleware] Calling updateSession');
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/ (auth routes themselves to avoid redirect loops)
     * - / (landing page, if you want it to be public)
     * - /generator (public generator access)
     * - /public-personas (public personas page)
     * - /api/generate (public generation API)
     * - /api/direct-generate (direct generation API without DB/queue)
     * - /api/test-r2 (test endpoint for R2)
     * - /api/test-simple (simple test endpoint)
     * Modify this pattern to protect specific routes or make others public.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/|api/auth/callback|generator|public-personas|api/generate|api/direct-generate|api/test-r2|api/test-simple).*)',
    // Ensure /api/auth/callback is excluded if it was not implicitly by 'auth/'
  ],
}; 