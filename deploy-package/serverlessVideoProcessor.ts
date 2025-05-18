import { v4 as uuidv4 } from 'uuid';
import { uploadToR2 } from './r2';

// Define the worker endpoint for video processing
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || 'https://doodad-video-processor-v2.doodad.workers.dev';

/**
 * Serverless Video Processor for Doodad.AI
 * Uses Cloudflare Worker for processing video + audio
 */

interface VideoProcessingResult {
  success: boolean;
  audioUrl?: string;
  videoUrl?: string;
  processedVideoUrl?: string;
  statusMessage?: string;
  error?: string;
}

/**
 * Processes a video by overlaying the provided audio
 * This function calls our Cloudflare Worker that handles ffmpeg processing
 */
export async function processVideoWithAudio(
  videoUrl: string,
  audioUrl: string
): Promise<VideoProcessingResult> {
  // Environment check
  const workerEndpoint = process.env.VIDEO_WORKER_ENDPOINT || 'https://doodad-video-worker.doodadai.workers.dev';
  console.log(`[ServerlessVideoProcessor] Using worker endpoint: ${workerEndpoint}`);
  
  if (!videoUrl || !audioUrl) {
    return {
      success: false,
      statusMessage: "Missing video or audio URL",
      error: "Required parameters not provided"
    };
  }
  
  try {
    // Call the Cloudflare Worker to process the video
    const response = await fetch(`${workerEndpoint}/process-video`, {
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
      console.error(`[ServerlessVideoProcessor] Worker response error: ${response.status} ${response.statusText}`);
      let errorMessage = "Video processing failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If parsing JSON fails, use the default error message
      }
      
      return {
        success: false,
        audioUrl,
        videoUrl,
        statusMessage: `Error processing video: ${errorMessage}`,
        error: errorMessage
      };
    }
    
    const result = await response.json();
    console.log(`[ServerlessVideoProcessor] Worker response:`, result);
    
    if (result.success && result.videoUrl) {
      return {
        success: true,
        audioUrl,
        videoUrl,
        processedVideoUrl: result.videoUrl,
        statusMessage: result.message || "Video processed successfully"
      };
    } else {
      return {
        success: false,
        audioUrl,
        videoUrl,
        statusMessage: result.message || "Processing didn't return a video URL",
        error: result.error || "Unknown processing error"
      };
    }
  } catch (error) {
    console.error('[ServerlessVideoProcessor] Error:', error);
    return {
      success: false,
      audioUrl,
      videoUrl,
      statusMessage: `Failed to process video: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
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