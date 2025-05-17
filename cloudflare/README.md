# Doodad Video Processing Worker

This Cloudflare Worker handles video processing tasks for Doodad.AI. It merges video and audio files using FFmpeg in a serverless environment.

## Deployment Instructions

1. Install Wrangler CLI:
   ```
   npm install -g wrangler
   ```

2. Log in to Cloudflare:
   ```
   wrangler login
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Deploy the worker:
   ```
   npm run deploy
   ```

5. Configure environment variables in the Cloudflare dashboard:
   - Go to https://dash.cloudflare.com
   - Navigate to Workers & Pages > doodad-video-processor
   - Go to Settings > Variables
   - Add the following environment variables:
     - `R2_BUCKET`: doodad-videos
     - `R2_ENDPOINT_URL`: (your R2 endpoint URL)
     - `R2_ACCESS_KEY_ID`: (your R2 access key)
     - `R2_SECRET_ACCESS_KEY`: (your R2 secret key)

6. Update Vercel environment variable:
   - In your Vercel project, add the following environment variable:
   - `CLOUDFLARE_WORKER_URL`: https://doodad-video-processor.yourworkers.dev
   
   (Replace with your actual worker URL)

## Testing

You can test the worker with:

```bash
curl -X POST https://doodad-video-processor.yourworkers.dev/process-video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/sample.mp4",
    "audioUrl": "https://example.com/sample.mp3"
  }'
```

A successful response will include the processed video URL. 