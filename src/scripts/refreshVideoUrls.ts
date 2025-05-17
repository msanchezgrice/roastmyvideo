import { createClient } from '@/utils/supabase/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Create S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

// Create Supabase client
const supabase = createClient();

async function main() {
  console.log('Starting to refresh video URLs...');

  // Check if R2 is configured
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('Error: R2 environment variables are not fully configured.');
    process.exit(1);
  }

  try {
    // 1. Get all videos from the database
    const { data: videos, error } = await supabase
      .from('video_history')
      .select('id, video_r2_url')
      .not('video_r2_url', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }

    console.log(`Found ${videos.length} videos with R2 URLs to refresh`);

    // 2. Process each video
    for (const video of videos) {
      try {
        // Skip if URL is null
        if (!video.video_r2_url) {
          console.warn(`Video ID ${video.id} has a null URL, skipping`);
          continue;
        }
        
        // Extract the key from the existing URL
        const url = new URL(video.video_r2_url);
        const key = url.pathname.substring(1); // Remove leading slash

        console.log(`Processing video ID ${video.id}, key: ${key}`);

        // Generate a new signed URL with 7-day expiration
        const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
        const newSignedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
          }),
          {
            expiresIn: expiresInSeconds,
          }
        );

        // Update the database with the new URL
        const { error: updateError } = await supabase
          .from('video_history')
          .update({ video_r2_url: newSignedUrl })
          .eq('id', video.id);

        if (updateError) {
          console.error(`Failed to update video ID ${video.id}: ${updateError.message}`);
          continue;
        }

        console.log(`Successfully refreshed URL for video ID ${video.id}`);
      } catch (videoError) {
        console.error(`Error processing video ID ${video.id}:`, videoError);
      }
    }

    console.log('Video URL refresh completed successfully');
  } catch (err) {
    console.error('Error refreshing video URLs:', err);
    process.exit(1);
  }
}

main(); 