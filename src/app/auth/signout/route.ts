import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[Auth SignOut] Error signing out:', error);
  }

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 302,
  });
}
