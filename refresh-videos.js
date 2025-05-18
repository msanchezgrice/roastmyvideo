#!/usr/bin/env node

/**
 * Script to refresh expired video URLs in the database
 * 
 * Run with: node refresh-videos.js
 * 
 * Prerequisites:
 * - npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @supabase/supabase-js dotenv
 * - Proper environment variables set in .env file
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase environment variables are not set');
  process.exit(1);
}

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ Error: R2 environment variables are not set');
  process.exit(1);
}

// Create clients
const supabase = createClient(supabaseUrl, supabaseKey);
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function refreshVideoUrls() {
  console.log('🔄 Starting to refresh video URLs...');
  
  try {
    // Get all videos with non-null R2 URLs
    const { data: videos, error } = await supabase
      .from('video_history')
      .select('id, video_r2_url')
      .not('video_r2_url', 'is', null);
    
    if (error) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
    
    console.log(`📊 Found ${videos.length} videos with R2 URLs to refresh`);
    
    // Process each video
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videos) {
      try {
        if (!video.video_r2_url) continue;
        
        // Extract file key from URL
        const url = new URL(video.video_r2_url);
        const key = url.pathname.substring(1); // Remove leading slash
        
        console.log(`🎬 Processing video ID ${video.id}, key: ${key}`);
        
        // Generate new URL with 7-day expiration
        const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
        const newSignedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
          }),
          { expiresIn: expiresInSeconds }
        );
        
        // Update database with new URL
        const { error: updateError } = await supabase
          .from('video_history')
          .update({ video_r2_url: newSignedUrl })
          .eq('id', video.id);
        
        if (updateError) {
          console.error(`❌ Failed to update video ID ${video.id}: ${updateError.message}`);
          errorCount++;
          continue;
        }
        
        console.log(`✅ Successfully refreshed URL for video ID ${video.id}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error processing video ID ${video.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`
🎉 Video URL refresh completed:
   ✅ Success: ${successCount} videos
   ❌ Failed: ${errorCount} videos
   📊 Total: ${videos.length} videos
    `);
    
  } catch (error) {
    console.error('❌ Error refreshing video URLs:', error);
    process.exit(1);
  }
}

refreshVideoUrls(); 