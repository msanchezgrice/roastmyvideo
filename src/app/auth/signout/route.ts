import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
    import { cookies } from 'next/headers';
    import { NextResponse } from 'next/server';

    export const dynamic = 'force-dynamic';

    export async function POST(request: Request) {
      const requestUrl = new URL(request.url);
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      // Check if we have a session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.signOut();
      }

      return NextResponse.redirect(`${requestUrl.origin}/`, {
        status: 302,
      });
    }
