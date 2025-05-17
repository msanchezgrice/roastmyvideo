#!/usr/bin/env node

/**
 * Migration script to add is_public column to custom_personas table
 * 
 * Run with: node src/scripts/add_is_public_column.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase environment variables are not set');
  process.exit(1);
}

// Create admin Supabase client (needs service role key with higher privileges)
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Starting migration: Adding is_public column to custom_personas table...');
  
  try {
    // First check if the column already exists
    const { data: existingColumns, error: columnCheckError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'custom_personas', 
        column_name: 'is_public' 
      });
    
    if (columnCheckError) {
      // If the function doesn't exist, use a more direct approach
      console.log('Unable to use check_column_exists function, trying alternative method...');
      
      // Execute the migration
      const { error } = await supabase.rpc('execute_sql', { 
        sql_query: `
          ALTER TABLE custom_personas
          ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
          
          -- Update existing rows to set is_public to false
          UPDATE custom_personas 
          SET is_public = FALSE 
          WHERE is_public IS NULL;
          
          -- Add a comment explaining the column
          COMMENT ON COLUMN custom_personas.is_public IS 'If true, this persona is available to all users';
        `
      });
      
      if (error) {
        throw new Error(`Error executing SQL: ${error.message}`);
      }
      console.log('Migration completed successfully');
      return;
    }
    
    // If column already exists, no need to add it again
    if (existingColumns && existingColumns.exists) {
      console.log('Column is_public already exists in custom_personas table. No changes needed.');
      return;
    }
    
    // Execute the migration
    const { error } = await supabase.rpc('execute_sql', { 
      sql_query: `
        ALTER TABLE custom_personas
        ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        
        -- Update existing rows to set is_public to false
        UPDATE custom_personas 
        SET is_public = FALSE 
        WHERE is_public IS NULL;
        
        -- Add a comment explaining the column
        COMMENT ON COLUMN custom_personas.is_public IS 'If true, this persona is available to all users';
      `
    });
    
    if (error) {
      throw new Error(`Error executing SQL: ${error.message}`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration(); 