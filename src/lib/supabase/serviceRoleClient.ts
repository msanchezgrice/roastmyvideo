import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Missing Supabase URL or Service Role Key for serviceRoleClient. Service role operations will be skipped.');
} else {
  try {
    // Ensure this client is used ONLY in server-side environments
    // where the service role key is secure.
    supabaseAdmin = createSupabaseClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    console.log('Supabase admin client initialized successfully');
  } catch (error) {
    console.error('Error initializing Supabase admin client:', error);
    supabaseAdmin = null;
  }
}

export { supabaseAdmin }; 