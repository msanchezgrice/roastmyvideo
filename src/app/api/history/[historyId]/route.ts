import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/serviceRoleClient';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

interface RouteParams {
  params: {
    historyId: string; // Changed from 'id' to 'historyId' to be more specific
  };
}

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto", // For R2, "auto" is typically used
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// DELETE a specific video history entry and its associated files
export async function DELETE(request: Request, { params }: RouteParams) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin client not configured.' }, { status: 500 });
  }
  const { historyId } = params;
  if (!historyId) {
    return NextResponse.json({ error: 'Video history ID is required.' }, { status: 400 });
  }

  console.log(`[API /api/history/${historyId}] Received DELETE request.`);

  try {
    // 1. Fetch the history entry to get the thumbnail_url and video_r2_url
    const { data: historyEntry, error: fetchError } = await supabaseAdmin
      .from('video_history')
      .select('thumbnail_url, video_r2_url')
      .eq('id', historyId)
      .single();

    if (fetchError) {
      console.error(`[API /api/history/${historyId}] Error fetching history entry:`, fetchError);
      if (fetchError.code === 'PGRST116') { // PGRST116: Row not found
        return NextResponse.json({ error: 'Not Found', details: `History entry with ID ${historyId} not found.` }, { status: 404 });
      }
      throw fetchError;
    }

    if (!historyEntry) { // Should be caught by PGRST116, but as a safeguard
        return NextResponse.json({ error: 'Not Found', details: `History entry with ID ${historyId} not found.` }, { status: 404 });
    }

    // 2. If a thumbnail_url exists, parse the file name and delete from Supabase Storage
    if (historyEntry.thumbnail_url) {
      try {
        const thumbnailUrl = historyEntry.thumbnail_url;
        // Assuming thumbnail_url is like: https://<project_ref>.supabase.co/storage/v1/object/public/historythumbnails/<filename.jpg>
        // We need to extract <filename.jpg>
        const urlParts = thumbnailUrl.split('/');
        const thumbnailFileName = urlParts[urlParts.length - 1];
        
        if (thumbnailFileName) {
          console.log(`[API /api/history/${historyId}] Attempting to delete thumbnail: ${thumbnailFileName} from bucket 'historythumbnails'.`);
          const { error: storageError } = await supabaseAdmin.storage
            .from('historythumbnails')
            .remove([thumbnailFileName]);
          
          if (storageError) {
            console.error(`[API /api/history/${historyId}] Error deleting thumbnail ${thumbnailFileName} from storage:`, storageError);
            // Decide if this is a fatal error. For now, we'll log it and proceed to delete the DB record.
            // In a stricter implementation, you might return an error here.
          } else {
            console.log(`[API /api/history/${historyId}] Successfully deleted thumbnail ${thumbnailFileName} from storage.`);
          }
        }
      } catch (e) {
        console.error(`[API /api/history/${historyId}] Error processing thumbnail URL or deleting from storage:`, e);
      }
    }

    // 3. If video_r2_url exists, delete the video file from R2
    if (historyEntry.video_r2_url && process.env.R2_BUCKET_NAME) {
      try {
        // Extract the key from the R2 URL
        const url = new URL(historyEntry.video_r2_url);
        const key = url.pathname.substring(1); // Remove leading slash
        
        console.log(`[API /api/history/${historyId}] Attempting to delete video file: ${key} from R2 bucket.`);
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        });
        
        await s3Client.send(deleteCommand);
        console.log(`[API /api/history/${historyId}] Successfully deleted video file from R2 storage.`);
      } catch (r2Error) {
        console.error(`[API /api/history/${historyId}] Error deleting video file from R2:`, r2Error);
        // Non-fatal error, continue with database deletion
      }
    }

    // 4. Delete the video_history record from the database
    console.log(`[API /api/history/${historyId}] Attempting to delete history record from database.`);
    const { error: deleteDbError, count } = await supabaseAdmin
      .from('video_history')
      .delete({ count: 'exact' })
      .eq('id', historyId);

    if (deleteDbError) {
      console.error(`[API /api/history/${historyId}] Error deleting history record from database:`, deleteDbError);
      throw deleteDbError;
    }

    if (count === 0) {
      // This case should ideally be caught by the initial fetch, but as a safeguard
      console.warn(`[API /api/history/${historyId}] History record not found for deletion, though it was fetched earlier.`);
      return NextResponse.json({ error: 'Not Found', details: `History entry with ID ${historyId} was not found for deletion.` }, { status: 404 });
    }

    console.log(`[API /api/history/${historyId}] Successfully deleted history entry and associated files.`);
    return NextResponse.json({ message: `History entry ${historyId} and associated files deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`[API /api/history/${historyId}] General error in DELETE handler:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete video history entry.';
    return NextResponse.json({ error: 'Server Error', details: errorMessage }, { status: 500 });
  }
} 