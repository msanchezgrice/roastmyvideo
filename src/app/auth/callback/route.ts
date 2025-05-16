import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Use our server client
// import type { Database } from '@/types_db'; // Assuming this path is correct - Database type is optional for createClient here

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/'; // Get optional next redirect

  if (code) {
    const supabase = createClient(); // Use our server client
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[Auth Callback] Error exchanging code for session:', error);
        // Redirect to an error page or back to login with an error message
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`);
      }
      console.log('[Auth Callback] Session exchanged successfully.');
    } catch (error: any) {
      console.error('[Auth Callback] Catch block: Error exchanging code for session:', error);
      return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(error.message || 'Unknown error')}`); 
    }
  }

  // URL to redirect to after sign in process completes
  console.log(`[Auth Callback] Redirecting to: ${requestUrl.origin}${next}`);
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
} 