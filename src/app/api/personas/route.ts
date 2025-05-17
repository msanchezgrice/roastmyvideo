import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Path to our new server client
import { supabaseAdmin } from '@/lib/supabase/serviceRoleClient'; // Used for public personas access
import type { Persona } from '@/types'; // Assuming this path is correct

// GET all personas - works both with and without authentication
export async function GET(request: Request) {
  console.log('[API /api/personas] GET handler invoked.');
  const { searchParams } = new URL(request.url);
  const publicOnly = searchParams.get('public') === 'true';
  const supabase = createClient();
  
  try {
    // First try to get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[API /api/personas] getUser result:', { userIsEmpty: !user, userError, publicOnly });

    // For public personas, we don't need authentication
    if ((userError || !user) && !publicOnly) {
      console.warn('[API /api/personas] No authenticated user found or error, but this is not a public request. Status: 401');
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message || 'No user session' }, { status: 401 });
    }

         // If this is a public request or we have a user, proceed
     if (publicOnly) {
       console.log('[API /api/personas] Public personas requested, using admin client');
       
       // Use supabaseAdmin to bypass RLS and get public personas
       if (!supabaseAdmin) {
         return NextResponse.json({ error: 'Server Error', details: 'Admin client not configured' }, { status: 500 });
       }
       
       const { data, error: dbError } = await supabaseAdmin
         .from('custom_personas')
         .select('*')
         .is('is_public', true) // Only fetch public personas
         .order('name', { ascending: true });

       if (dbError) {
         console.error('[API /api/personas] Supabase DB error fetching public personas:', dbError);
         return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 });
       }

       console.log(`[API /api/personas] Successfully fetched ${data?.length || 0} public personas.`);
       return NextResponse.json({ personas: data || [] });
     } else if (user) {
       // User is authenticated, fetch their personas
       console.log(`[API /api/personas] User ${user.id} found. Fetching personas...`);
       const { data, error: dbError } = await supabase
         .from('custom_personas')
         .select('*')
         .or(`user_id.eq.${user.id},is_public.eq.true`) // Get both the user's personas and public ones
         .order('name', { ascending: true });

       if (dbError) {
         console.error('[API /api/personas] Supabase DB error fetching personas:', dbError);
         return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 });
       }

       console.log(`[API /api/personas] Successfully fetched ${data?.length || 0} personas for user ${user.id} (includes public ones).`);
       return NextResponse.json({ personas: data || [] }); // Ensure data is an array, even if null
     } else {
       // This should never happen due to the earlier check, but handle it just in case
       return NextResponse.json({ error: 'Unauthorized', details: 'User session is missing' }, { status: 401 });
     }

  } catch (error) {
    console.error('[API /api/personas] UNHANDLED EXCEPTION in GET handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: 'Failed to fetch custom personas due to an unexpected error.', details: errorMessage }, { status: 500 });
  }
}

// POST a new custom persona FOR THE AUTHENTICATED USER
export async function POST(request: Request) {
  console.log('[API /api/personas] POST handler invoked.');
  const supabase = createClient(); // Use the standard server client
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[API /api/personas POST] getUser result:', { userIsEmpty: !user, userError });

    if (userError || !user) {
      console.error('[API /api/personas POST] Unauthorized or user not found:', userError);
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message || 'User not found' }, { status: 401 });
    }

    const body = await request.json() as Omit<Persona, 'id' | 'created_at' | 'user_id'> & { is_public?: boolean };
    const { name, style, constraints, voice_preference, backstory, tags, is_public } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Validation Error', details: 'Persona name is required.' }, { status: 400 });
    }
    if (tags !== undefined && tags !== null && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
      return NextResponse.json({ error: 'Validation Error', details: 'Tags must be an array of strings.' }, { status: 400 });
    }
    const processedTags = tags ? tags.map(tag => tag.trim()).filter(tag => tag !== '') : null;
    
    const personaToInsert = {
      name: name.trim(), 
      style: style?.trim(),
      constraints: constraints?.trim(),
      voice_preference, 
      backstory: backstory?.trim(),
      tags: processedTags,
      user_id: user.id, // Associate with the logged-in user
      is_public: !!is_public // Convert to boolean with default false
    };
    console.log('[API /api/personas POST] Attempting to insert persona:', JSON.stringify(personaToInsert, null, 2));

    const { data: newPersona, error: insertError } = await supabase
      .from('custom_personas')
      .insert(personaToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('[API /api/personas POST] Supabase error creating custom persona:', insertError);
      if (insertError.code === '23505') { 
         return NextResponse.json({ error: 'Conflict', details: 'A persona with this name already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Database insert error', details: insertError.message }, { status: 500 });
    }
    console.log('[API /api/personas POST] Persona created successfully for user ${user.id}:', newPersona);
    return NextResponse.json({ persona: newPersona }, { status: 201 });

  } catch (error) {
    console.error('[API /api/personas POST] UNHANDLED EXCEPTION in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    return NextResponse.json({ error: 'Failed to create custom persona due to an unexpected error.', details: errorMessage }, { status: 500 });
  }
} 