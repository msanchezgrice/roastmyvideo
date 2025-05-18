#!/usr/bin/env node

// Quick script to check environment variables
console.log('Environment Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗');
console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT ? '✓' : '✗');
console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? '✓' : '✗');
console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? '✓' : '✗');
console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME ? '✓' : '✗');

// This script checks if the environment variables are present
// Use this to diagnose why the main refresh script may not be working 