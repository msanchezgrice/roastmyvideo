import { v4 as uuidv4 } from 'uuid';
import { uploadToR2 } from './r2';

// Define the worker endpoint for video processing
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || 'https://doodad-video-processor-v2.doodad.workers.dev';

/**
 * Serverless video processing that overlays audio onto video using a cloud service.
 * For Vercel's environment we can't run ffmpeg directly, so we use a Cloudflare Worker.
 */
export async function processVideoWithAudio(
  videoUrl: string,
  audioUrl: string,
): Promise<{ success: boolean; videoUrl?: string; audioUrl: string; processedVideoUrl?: string; statusMessage: string }> {
  const jobId = uuidv4().substring(0, 8);
  console.log(`[ServerlessVideoProcessor JOB ${jobId}] Starting processing with video: ${videoUrl}`);
  console.log(`[ServerlessVideoProcessor JOB ${jobId}] Audio URL: ${audioUrl}`);
  
  try {
    // First, call the Cloudflare Worker to process the video
    console.log(`[ServerlessVideoProcessor JOB ${jobId}] Calling Cloudflare Worker at: ${CLOUDFLARE_WORKER_URL}/process-video`);
    
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl,
        audioUrl,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker error:`, errorData);
      
      // Return the audio URL at least
      return {
        success: false,
        videoUrl,
        audioUrl,
        statusMessage: `Worker processing failed: ${errorData.error || 'Unknown error'}. Using separate video and audio.`
      };
    }
    
    const data = await response.json();
    
    if (data.success && data.videoUrl) {
      console.log(`[ServerlessVideoProcessor JOB ${jobId}] Worker successfully processed video: ${data.videoUrl}`);
      
      return {
        success: true,
        videoUrl,
        audioUrl,
        processedVideoUrl: data.videoUrl,
        statusMessage: 'Video processing successful! The video and audio have been merged.'
      };
    } else {
      console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker returned success:false:`, data);
      
      return {
        success: false,
        videoUrl,
        audioUrl,
        statusMessage: `Worker processing failed: ${data.error || 'Unknown error'}. Using separate video and audio.`
      };
    }
  } catch (error) {
    console.error(`[ServerlessVideoProcessor JOB ${jobId}] Error:`, error);
    return {
      success: false,
      videoUrl,
      audioUrl,
      statusMessage: `Error processing video: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Call the Cloudflare Worker to process the video
 * This is a more direct implementation of the worker call
 */
export async function requestCloudflareVideoProcessing(
  videoUrl: string,
  audioUrl: string
): Promise<{ success: boolean; resultUrl?: string; statusMessage: string }> {
  const jobId = uuidv4().substring(0, 8);
  console.log(`[CloudflareVideoProcessor JOB ${jobId}] Requesting processing`);
  
  try {
    // Call the Cloudflare Worker directly
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl,
        audioUrl,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Worker returned error ${response.status}: ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.videoUrl) {
      return {
        success: true,
        resultUrl: data.videoUrl,
        statusMessage: 'Video processing successful!'
      };
    } else {
      throw new Error(data.error || 'Processing failed with unknown error');
    }
  } catch (error) {
    console.error(`[CloudflareVideoProcessor JOB ${jobId}] Error:`, error);
    return {
      success: false,
      statusMessage: `Error requesting Cloudflare processing: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 