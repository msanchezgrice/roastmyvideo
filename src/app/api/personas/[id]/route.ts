import { NextResponse } from 'next/server';
// import { supabaseAdmin } from '@/lib/supabaseClient'; // Old import
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Persona } from '@/types'; // Assuming Persona type is defined in @/types

interface RouteParams {
  params: {
    id: string; // This is the persona_id
  };
}

// PUT (Update) a specific custom persona FOR THE AUTHENTICATED USER
export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: personaId } = params;
  if (!personaId) {
    return NextResponse.json({ error: 'Persona ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json() as Partial<Omit<Persona, 'id' | 'created_at' | 'user_id'> & { name?: string }>; // Name can be part of update
    const { name, style, constraints, voice_preference, backstory, tags } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Validation Error', details: 'Persona name cannot be empty if provided.' }, { status: 400 });
    }
    if (tags !== undefined && tags !== null && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
      return NextResponse.json({ error: 'Validation Error', details: 'Tags must be an array of strings.' }, { status: 400 });
    }

    const updateData: { [key: string]: any } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (style !== undefined) updateData.style = style?.trim();
    if (constraints !== undefined) updateData.constraints = constraints?.trim();
    if (voice_preference !== undefined) updateData.voice_preference = voice_preference;
    if (backstory !== undefined) updateData.backstory = backstory?.trim();
    if (tags !== undefined) {
        updateData.tags = tags === null ? null : tags.map(tag => tag.trim()).filter(tag => tag !== '');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
    }

    // RLS policy "Users can manage their own personas" will ensure user can only update their own.
    const { data, error } = await supabase
      .from('custom_personas')
      .update(updateData)
      .eq('id', personaId)
      // .eq('user_id', user.id) // RLS handles this, but can be explicit for extra safety/clarity
      .select()
      .single();

    if (error) {
      console.error(`Supabase error updating custom persona ${personaId}:`, error);
      if (error.code === '23505') { 
         return NextResponse.json({ error: 'Conflict', details: 'A persona with this name already exists.' }, { status: 409 });
      }
      if (error.code === 'PGRST204') { // No row found for ID (or for user)
        return NextResponse.json({ error: 'Not Found', details: `Persona with ID ${personaId} not found or not owned by user.` }, { status: 404 });
      }
      throw error;
    }
    if (!data) {
        return NextResponse.json({ error: 'Not Found', details: `Persona with ID ${personaId} not found after update attempt.` }, { status: 404 });
    }
    return NextResponse.json({ persona: data });
  } catch (error) {
    console.error(`Error in /api/personas/${personaId} PUT handler:`, error);
    return NextResponse.json({ error: 'Failed to update custom persona', details: (error as Error).message }, { status: 500 });
  }
}

// DELETE a specific custom persona FOR THE AUTHENTICATED USER
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: personaId } = params;
  if (!personaId) {
    return NextResponse.json({ error: 'Persona ID is required.' }, { status: 400 });
  }

  try {
    // RLS policy "Users can manage their own personas" will ensure user can only delete their own.
    const { error, count } = await supabase
      .from('custom_personas')
      .delete({ count: 'exact' })
      .eq('id', personaId);
      // .eq('user_id', user.id); // RLS handles this

    if (error) {
      console.error(`Supabase error deleting custom persona ${personaId}:`, error);
      throw error;
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Not Found', details: `Persona with ID ${personaId} not found or not owned by user.` }, { status: 404 });
    }

    return NextResponse.json({ message: `Persona ${personaId} deleted successfully.` }, { status: 200 });
  } catch (error) {
    console.error(`Error in /api/personas/${personaId} DELETE handler:`, error);
    return NextResponse.json({ error: 'Failed to delete custom persona', details: (error as Error).message }, { status: 500 });
  }
} 