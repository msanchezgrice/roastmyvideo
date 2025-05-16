// queer-ai/src/lib/supabase/server.ts
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types_db'; // Ensure this path is correct and types_db.ts exists

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // console.warn(`[SupabaseServerClient] Failed to set cookie "${name}". Context might be read-only.`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', options);
          } catch (error) {
            // console.warn(`[SupabaseServerClient] Failed to remove cookie "${name}". Context might be read-only. Error: ${error}`);
          }
        },
      },
    }
  );
}