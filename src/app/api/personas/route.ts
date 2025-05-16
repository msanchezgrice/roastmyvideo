import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Path to our new server client
// import { supabaseAdmin } from '@/lib/supabase/serviceRoleClient'; // Keep for now, might remove later if not needed
import type { Persona } from '@/types'; // Assuming this path is correct

// GET all custom personas FOR THE AUTHENTICATED USER
export async function GET(request: Request) {
  console.log('[API /api/personas] GET handler invoked.');
  const supabase = createClient();
  
  try {
    console.log('[API /api/personas] Attempting to get user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[API /api/personas] getUser result:', { userIsEmpty: !user, userError });

    if (userError || !user) {
      console.warn('[API /api/personas] No authenticated user found or error. Status: 401');
      // It's common to return a 401 if no user, or let RLS handle it with an empty array for non-authed users.
      // For now, returning 401 if explicitly no user to make it clear.
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message || 'No user session' }, { status: 401 });
    }

    console.log(`[API /api/personas] User ${user.id} found. Fetching personas...`);
    const { data, error: dbError } = await supabase
      .from('custom_personas')
      .select('*')
      // .eq('user_id', user.id) // RLS should handle this, but can be added for explicit filtering
      .order('name', { ascending: true });

    if (dbError) {
      console.error('[API /api/personas] Supabase DB error fetching personas:', dbError);
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 });
    }

    console.log(`[API /api/personas] Successfully fetched ${data?.length || 0} personas for user ${user.id}.`);
    return NextResponse.json({ personas: data || [] }); // Ensure data is an array, even if null

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

    const body = await request.json() as Omit<Persona, 'id' | 'created_at' | 'user_id'>;
    const { name, style, constraints, voice_preference, backstory, tags } = body;

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
      user_id: user.id // Associate with the logged-in user
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