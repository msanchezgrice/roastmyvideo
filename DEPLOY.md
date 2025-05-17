# Doodad Video Processing Deployment Guide

## 1. Deploy the Cloudflare Worker

The Cloudflare Worker handles processing video and audio files using FFmpeg in a serverless environment.

### Setup Steps:

1. Navigate to the Cloudflare Worker directory:
   ```bash
   cd cloudflare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Log in to Cloudflare:
   ```bash
   npx wrangler login
   ```

4. Deploy the worker:
   ```bash
   npx wrangler publish
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

## 2. Update Vercel Environment Variables

Add the Cloudflare Worker URL to your Vercel project:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following environment variable:
   - `CLOUDFLARE_WORKER_URL`: https://doodad-video-processor.yourworkers.dev
   (Replace with your actual worker URL)

## 3. Deploy to Vercel

Deploy your Doodad application to Vercel:

```bash
# Navigate to your project directory
cd /Users/miguel/RoastMyVideo/doodad

# Push to GitHub (this will trigger a Vercel deployment)
git add .
git commit -m "Implement video processing with Cloudflare Worker"
git push

# Or deploy directly with Vercel CLI
vercel
```

## Testing the Integration

After deployment, you can test the worker directly:

```bash
curl -X POST https://doodad-video-processor.yourworkers.dev/process-video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/sample.mp4",
    "audioUrl": "https://example.com/sample.mp3"
  }'
```

This should return a JSON response with the processed video URL. 