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
  console.log(`[ServerlessVideoProcessor JOB ${jobId}] Worker raw response:`, responseText);
  
  let data;
  try {
    // Try to parse the response as JSON
    data = JSON.parse(responseText);
    console.log(`[ServerlessVideoProcessor JOB ${jobId}] Parsed worker response:`, data);
  } catch (parseError) {
    console.error(`[ServerlessVideoProcessor JOB ${jobId}] Failed to parse worker response:`, parseError);
    
    // Return the audio URL at least
    return {
      success: false,
      videoUrl,
      audioUrl,
      statusMessage: `Worker returned invalid JSON: ${responseText.substring(0, 100)}... Using separate video and audio.`
    };
  }
  
  if (responseStatus !== 200) {
    console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker returned non-200 status:`, responseStatus);
    
    // Return the audio URL at least
    return {
      success: false,
      videoUrl,
      audioUrl,
      statusMessage: `Worker returned error status ${responseStatus}: ${data.error || 'Unknown error'}. Using separate video and audio.`
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
    console.error(`[ServerlessVideoProcessor JOB ${jobId}] Worker returned success:false:`, data);
    
    return {
      success: false,
      videoUrl,
      audioUrl,
      statusMessage: `Worker processing failed: ${data.error || 'Unknown error'}. Using separate video and audio.`
    };
  }
} catch (error) {
  // ... existing error handling ...
} 