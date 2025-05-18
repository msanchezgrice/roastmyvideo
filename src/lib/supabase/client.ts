import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types_db'; // Assuming this is your DB types file

// Note: Ensure you have a NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local

export const createSupabaseClient = () => 
  createPagesBrowserClient<Database>(); // Use the correct function name

// ... existing code ... 