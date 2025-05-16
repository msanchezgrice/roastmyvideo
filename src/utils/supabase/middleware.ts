import { createServerClient, type CookieOptions } from "@supabase/ssr";
    import { NextResponse, type NextRequest } from "next/server";
    import type { Database } from "@/types_db";

    export async function updateSession(request: NextRequest) {
      console.log(`[Middleware updateSession] Path: ${request.nextUrl.pathname}`);
      let response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const value = request.cookies.get(name)?.value;
              if (name.includes("-auth-token") && !name.includes("-chunk-")) {
                console.log(`[Middleware Cookie GET] Name: ${name}, Raw Value Length: ${value?.length}, Raw Value (first 100 chars): ${value?.substring(0, 100)}`);
              }
              return value;
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({ name, value, ...options });
              response = NextResponse.next({ request: { headers: request.headers } });
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({ name, value: "", ...options });
              response = NextResponse.next({ request: { headers: request.headers } });
              response.cookies.set({ name, value: "", ...options });
            },
          },
        }
      );
      await supabase.auth.getUser();
      return response;
    }
