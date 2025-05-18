/**
 * Doodad.AI Video Processing Worker
 */

export default {
  async fetch(request, env, ctx) {
    // Parse the URL and request method
    const url = new URL(request.url);
    const method = request.method;

    // Process-video endpoint
    if (url.pathname === '/process-video' && method === 'POST') {
      try {
        const data = await request.json();
        
        if (!data.videoUrl || !data.audioUrl) {
          return jsonResponse({ 
            success: false, 
            error: 'Missing required parameters' 
          }, 400);
        }
        
        // For testing, return a dummy processed URL
        const testVideoUrl = 'https://pub-67ca5e2b9cc8442aae3f9058614ea98.r2.dev/videos/processed_test.mp4';
        
        return jsonResponse({
          success: true,
          videoUrl: testVideoUrl,
          message: 'Video processed successfully (test mode)'
        });
      } catch (error) {
        return jsonResponse({
          success: false,
          error: 'Processing failed',
          details: error.message || 'Unknown error'
        }, 500);
      }
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return jsonResponse({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
      });
    }
    
    // Root endpoint - return basic API info
    return jsonResponse({
      message: 'Doodad Video Processing API',
      version: '1.0.0',
      endpoints: ['/health', '/process-video (POST)']
    });
  }
};

/**
 * Helper function to create JSON responses
 */
function jsonResponse(data, status = 200) {
  const jsonString = JSON.stringify(data);
  
  return new Response(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 