import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types_db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    await supabase.auth.signOut();
    console.log('[Auth SignOut] User signed out successfully.');
  } catch (error) {
    console.error('[Auth SignOut] Error signing out:', error);
    // Optionally, redirect to an error page or display a message
    // For now, we'll redirect to home even if signout had an issue on server, 
    // as client session should be cleared anyway by a page refresh.
  }

  // Redirect back to the home page after signing out
  return NextResponse.redirect(requestUrl.origin, {
    status: 302, // Use 302 for temporary redirect after POST
  });
} 