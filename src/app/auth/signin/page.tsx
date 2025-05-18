'use client';

import * as React from 'react';
import { createClient } from '@/utils/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Redirect to generator page upon successful sign-in
        console.log('[SignInPage] User signed in, redirecting to generator page');
        router.push('/generator');
        router.refresh(); // Ensure server components might re-evaluate based on new session
      }
    });

    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[SignInPage] User already logged in, redirecting to generator page');
        router.push('/generator'); // Redirect to generator if already logged in
      }
    };
    checkUser();

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-xl shadow-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Sign in to your account
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#6366f1', brandAccent: '#4f46e5'}} } }}
          providers={['google', 'github']} // Optional: add social providers if configured in Supabase
          redirectTo={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/generator`}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Password',
              }
            },
          }}
        />
      </div>
    </div>
  );
} 