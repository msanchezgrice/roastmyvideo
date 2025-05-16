import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables (especially SUPABASE_SERVICE_ROLE_KEY)
// This basic script assumes .env.local is in the project root relative to where you run the script from.
// For more robust env var loading, consider a library like dotenv if running outside Next.js context.
// For simplicity, we'll try to read them directly here assuming you run the script from project root.

async function loadEnv() {
  try {
    // Construct path to .env.local relative to this script if needed
    // For now, assuming .env.local is in the parent directory of 'scripts' (project root)
    const envPath = path.join(process.cwd(), '.env.local'); 
    const envFile = await fs.readFile(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        // Strip quotes if any (e.g. VAR="value" or VAR='value')
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    });
    console.log('.env.local loaded successfully for script.');
  } catch (error) {
    console.warn('Could not load .env.local. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set or script might fail.');
  }
}

async function main() {
  await loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env.local or environment.');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Delete all pre-existing custom personas
    const { error: deleteError } = await supabaseAdmin.from('custom_personas').delete().eq('id', 'id');
    if (deleteError) {
      console.error('Error deleting pre-existing personas:', deleteError);
    } else {
      console.log('Pre-existing custom personas deleted successfully.');
    }

    // Adjust path to personas.json relative to the script location or project root
    const personasJsonPath = path.join(process.cwd(), 'personas.json'); // Assuming personas.json is in the project root
    const personasFile = await fs.readFile(personasJsonPath, 'utf-8');
    const personasData = JSON.parse(personasFile);

    console.log(`Found ${personasData.length} personas in JSON file.`);

    const personasToInsert = personasData.map((p) => {
      const tagsString = p.tags || '';
      const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      
      return {
        name: p.persona_name,
        style: p.style || null,
        constraints: p.constraints || null,
        backstory: p.backstory || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        // voice_preference: p.voice_preference || null, // Add if you have voice_preference in JSON
      };
    });

    console.log(`Attempting to insert ${personasToInsert.length} personas into Supabase...`);
    
    // Supabase client insert batch size limit is typically around 1000-2000 rows or based on payload size.
    // For 50-100 items, a single insert call is usually fine.
    // For very large datasets, you would batch this loop.
    const { data, error } = await supabaseAdmin
      .from('custom_personas')
      .insert(personasToInsert, { upsert: true, onConflict: 'name' }) // Upsert on name conflict
      .select();

    if (error) {
      console.error('Supabase insert/upsert error:', error);
    } else {
      console.log(`Successfully upserted/processed ${data?.length || 0} personas.`);
    }
    
    const { count, error: countError } = await supabaseAdmin
        .from('custom_personas')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error fetching total count:', countError);
    } else {
        console.log(`Total custom personas in DB after script: ${count}`);
    }

  } catch (err) {
    console.error('Error during bulk import:', err);
  }
}

main().catch(console.error); 