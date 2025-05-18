import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is imported
import type { uploadToR2 } from './r2'; // Assuming r2 types are correctly handled elsewhere or not strictly needed for this fix

// Define the worker endpoint for video processing
const CLOUDFLARE_WORKER_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://doodad-video-processor-v2.doodad.workers.dev';

interface VideoProcessingResult {
  success: boolean;
  videoUrl?: string;
  audioUrl?: string;
  processedVideoUrl?: string;
  statusMessage: string;
  error?: string; // Optional error message
}

export async function processVideoWithAudio(
  videoUrl: string,
  audioUrl: string,
): Promise<VideoProcessingResult> {
  const jobId = uuidv4().substring(0, 8); // This was likely the intended jobId for the whole function scope
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
    
    // Add detailed logging of the raw response
    const responseStatus = response.status;
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const responseText = await response.text();
    
    console.log(`[ServerlessVideoProcessor JOB ${jobId}] Worker response status: ${responseStatus}`);
    console.log(`[ServerlessVideoProcessor JOB ${jobId}] Worker response headers:`, responseHeaders);
    console.log(`[ServerlessVideoProcessor JOB ${jobId}] Worker raw response: ${responseText.substring(0, 500)}`);
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[ServerlessVideoProcessor JOB ${jobId}] Parsed worker response:`, data);
    } catch (parseError) {
      console.error(`[ServerlessVideoProcessor JOB ${jobId}] Failed to parse worker response:`, parseError);
      
      return {
        success: false,
        videoUrl,
        audioUrl,
        statusMessage: `Worker returned invalid JSON: ${responseText.substring(0, 100)}... Using separate video and audio.`,
        error: 'Failed to parse worker response'
      };
    }
    
    if (!response.ok) { // Check if response status is not OK (e.g., 4xx, 5xx)
      console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker returned non-200 status: ${responseStatus}`);
      
      return {
        success: false,
        videoUrl,
        audioUrl,
        statusMessage: `Worker processing failed: ${data.error || 'Unknown error'}. Using separate video and audio.`,
        error: data.error || 'Worker returned non-OK status'
      };
    }
    
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
      console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker returned success:false or missing videoUrl:`, data);
      
      return {
        success: false,
        videoUrl,
        audioUrl,
        statusMessage: `Worker processing failed: ${data.error || 'Unknown error'}. Using separate video and audio.`,
        error: data.error || 'Worker indicated failure or missing videoUrl'
      };
    }
  } catch (error) {
    console.error(`[ServerlessVideoProcessor JOB ${jobId}] Error:`, error);
    return {
      success: false,
      videoUrl,
      audioUrl,
      statusMessage: `Error processing video: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// The requestCloudflareVideoProcessing function remains largely the same,
// but ensure jobId is also defined at its start if it's used for logging within it.
export async function requestCloudflareVideoProcessing(
  videoUrl: string,
  audioUrl: string
): Promise<{ success: boolean; resultUrl?: string; statusMessage: string; error?: string; }> {
  const jobId = uuidv4().substring(0, 8); // Define jobId here as well
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
    
    // Add detailed logging here too
    const responseStatus = response.status;
    const responseText = await response.text();
    console.log(`[CloudflareVideoProcessor JOB ${jobId}] Worker response status: ${responseStatus}`);
    console.log(`[CloudflareVideoProcessor JOB ${jobId}] Worker raw response: ${responseText.substring(0, 500)}`);
    
    // Try to parse the response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Worker returned invalid JSON: ${responseText.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      throw new Error(`Worker returned error ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    if (data.success && data.videoUrl) {
      return {
        success: true,
        resultUrl: data.videoUrl,
        statusMessage: 'Video processing successful!'
      };
    } else {
      throw new Error(data.error || 'Processing failed with unknown error from worker');
    }
  } catch (error) {
    console.error(`[CloudflareVideoProcessor JOB ${jobId}] Error:`, error);
    return {
      success: false,
      statusMessage: `Error requesting Cloudflare processing: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 