/**
 * Doodad.AI Video Processing Worker
 * 
 * This worker handles video processing tasks that require ffmpeg:
 * - Merging audio with video
 * - Generating video clips
 * - Creating and storing merged content
 */

// Import FFmpeg libraries (needs npm install @ffmpeg/ffmpeg @ffmpeg/util)
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Check if it's a POST request for video processing
    if (url.pathname === '/process-video' && request.method === 'POST') {
      return await handleVideoProcessing(request, env);
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

/**
 * Handle video processing request
 */
async function handleVideoProcessing(request, env) {
  try {
    // Parse the request
    const data = await request.json();
    
    if (!data.videoUrl || !data.audioUrl) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters', 
        details: 'Both videoUrl and audioUrl are required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract parameters
    const { videoUrl, audioUrl } = data;
    
    // Process the video and audio using ffmpeg in the worker
    // Note: Cloudflare Workers have access to ffmpeg when properly configured
    const outputUrl = await processVideoWithAudio(videoUrl, audioUrl, env);
    
    // Return the result
    return new Response(JSON.stringify({
      success: true,
      videoUrl: outputUrl,
      message: 'Video processed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing video:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Processing failed',
      details: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process video with audio using ffmpeg
 * This leverages Cloudflare Workers' ability to run FFmpeg
 */
async function processVideoWithAudio(videoUrl, audioUrl, env) {
  // Create a unique ID for this job
  const jobId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[VideoProcessingWorker ${jobId}] Starting video processing`);
  console.log(`[VideoProcessingWorker ${jobId}] Video URL: ${videoUrl}`);
  console.log(`[VideoProcessingWorker ${jobId}] Audio URL: ${audioUrl}`);
  
  try {
    // Download the video
    console.log(`[VideoProcessingWorker ${jobId}] Downloading video...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();
    
    // Download the audio
    console.log(`[VideoProcessingWorker ${jobId}] Downloading audio...`);
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    const audioBlob = await audioResponse.blob();
    
    // Use FFmpeg to combine video and audio
    console.log(`[VideoProcessingWorker ${jobId}] Combining video and audio with FFmpeg...`);
    
    // Create FFmpeg command to merge video and audio
    // Note: This syntax needs to be compatible with the FFmpeg version available in Workers
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoBlob));
    ffmpeg.FS('writeFile', 'audio.mp3', await fetchFile(audioBlob));
    
    // Run FFmpeg to merge files
    await ffmpeg.run(
      '-i', 'input.mp4',
      '-i', 'audio.mp3',
      '-map', '0:v',
      '-map', '1:a',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      'output.mp4'
    );
    
    // Get the output file
    const outputData = ffmpeg.FS('readFile', 'output.mp4');
    
    // Upload to R2
    console.log(`[VideoProcessingWorker ${jobId}] Uploading processed video...`);
    const outputFileName = `processed_${jobId}.mp4`;
    const bucketName = env.R2_BUCKET || 'doodad-videos';
    
    await env.R2.put(
      `videos/${outputFileName}`,
      outputData,
      {
        httpMetadata: {
          contentType: 'video/mp4',
        }
      }
    );
    
    // Generate a public URL
    const publicUrl = `https://pub-67ca5e2b9cc8442aae3f9058614ea98.r2.dev/videos/${outputFileName}`;
    console.log(`[VideoProcessingWorker ${jobId}] Processing complete. URL: ${publicUrl}`);
    
    return publicUrl;
    
  } catch (error) {
    console.error(`[VideoProcessingWorker ${jobId}] Error:`, error);
    throw error;
  }
} 