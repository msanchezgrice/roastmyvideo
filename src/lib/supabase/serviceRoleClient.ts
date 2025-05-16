import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing Supabase URL or Service Role Key for serviceRoleClient. Service role operations will fail.');
  // Depending on strictness, you might throw an error here to prevent app startup without it
  // throw new Error('Missing Supabase URL or Service Role Key for serviceRoleClient.');
}

// Ensure this client is used ONLY in server-side environments
// where the service role key is secure.
export const supabaseAdmin: SupabaseClient = createSupabaseClient(
  supabaseUrl || ' ', // Provide a fallback to satisfy type, error is thrown above if missing
  supabaseServiceKey || ' ', // Provide a fallback, error is logged/thrown above
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
); 