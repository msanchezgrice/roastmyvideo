/**
 * Simple Doodad.AI Video Processing Worker
 */

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    // Return a simple JSON response with proper headers
    return new Response(
      JSON.stringify({
        message: 'Doodad Video Processing API',
        status: 'online',
        endpoints: ['/health', '/process-video (POST)']
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    );
  },
  
  // Scheduled handler (empty implementation for now)
  async scheduled(event, env, ctx) {
    console.log('Scheduled event triggered');
  }
}; 