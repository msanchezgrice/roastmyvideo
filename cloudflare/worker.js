/**
 * Doodad.AI Cloudflare Worker
 * This worker polls Supabase for queued video jobs and processes them.
 */

// Main worker function
export default {
  // The scheduled handler runs on a cron schedule
  async scheduled(event, env, ctx) {
    console.log(`Scheduled job running at: ${new Date().toISOString()}`);
    return new Response("OK");
  },
  
  // Handle HTTP requests
  async fetch(request, env, ctx) {
    return new Response("Doodad Worker is running!", {
      headers: { "Content-Type": "text/plain" }
    });
  }
};
