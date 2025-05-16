import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// This client is for server-side operations that need admin privileges,
// like uploading to storage buckets bypassing RLS or writing to tables that have restrictive RLS for anon/auth users.
// Ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment.
let supabaseAdmin;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.warn('[supabaseClient] SUPABASE_SERVICE_ROLE_KEY not set. Admin client will not be available.');
  // You might want to throw an error here if admin operations are critical
  // throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

export { supabaseAdmin }; 