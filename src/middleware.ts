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
     * Modify this pattern to protect specific routes or make others public.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/|api/auth/callback).*)',
    // Ensure /api/auth/callback is excluded if it was not implicitly by 'auth/'
  ],
}; 