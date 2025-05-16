import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types_db'; // Assuming types_db.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key for browser client.');
}

// This function can be called in Client Components to create a Supabase client instance.
// It's important to note that this client doesn't automatically handle auth state changes 
// across server/client boundaries without further setup (like using React Context and a root provider
// that listens to onAuthStateChange and updates the context).
// For many use cases in Client Components, you might call this once and store the client, or call it as needed.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  );
}

// If you need a singleton instance for general client-side utilities outside of components (use with caution):
// export const supabaseBrowserClient = createClientComponentClient<Database>({
//   supabaseUrl,
//   supabaseKey: supabaseAnonKey,
// }); 