import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/';
  const supabase = createClient();

  let redirectTo = `${requestUrl.origin}${next}`; // Default redirect

  if (code) { // Handle PKCE flow (e.g., after password sign-in, OAuth)
    console.log('[Auth Callback] Detected PKCE code flow.');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[Auth Callback] PKCE: Error exchanging code for session:', error);
      redirectTo = `${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`);
    } else {
      console.log('[Auth Callback] PKCE: Session exchanged successfully.');
    }
  } else if (token_hash && type) { // Handle OTP/Magic Link/Email Confirmation flow
    console.log('[Auth Callback] Detected OTP/token_hash flow (e.g., email confirmation). Type:', type);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash, }); // Removed email for broader OTP types
    if (error) {
      console.error('[Auth Callback] OTP: Error verifying OTP:', error);
      redirectTo = `${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`);
    } else {
      console.log('[Auth Callback] OTP: Verified successfully.');
    }
  } else {
    console.warn('[Auth Callback] No code or token_hash/type found in query params.');
    // Optional: redirect to an error or login page if no relevant params, for now, will proceed to `next`
    // redirectTo = `${requestUrl.origin}/auth/signin?message=Invalid%20callback%20parameters`;
  }

  console.log(`[Auth Callback] Final redirect to: ${redirectTo}`);
  return NextResponse.redirect(redirectTo);
} 