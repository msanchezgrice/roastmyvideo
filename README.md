# Doodad.AI

Generate AI commentary for videos with OpenAI, Vercel, Supabase, Cloudflare R2, and Cloudflare Workers.

## Architecture

This application uses a hybrid architecture:

1. **Vercel:** Hosts the Next.js frontend and API routes
2. **Supabase:** Provides authentication, database, and queue management
3. **Cloudflare R2:** Stores generated audio and video files
4. **Cloudflare Workers:** Process background video generation jobs

## Deployment Instructions

### 1. Vercel Setup

1. Deploy the Next.js application to Vercel
2. Set the following environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
R2_ENDPOINT_URL=your-r2-endpoint
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=doodad-videos
R2_PUBLIC_URL_BASE=https://your-r2-public-domain
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the following SQL in the Supabase SQL editor to create required tables:

```sql
-- Create jobs table for video processing queue
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'queued',
    video_url TEXT NOT NULL,
    personas JSONB NOT NULL,
    speaking_pace FLOAT DEFAULT 1.0,
    user_guidance TEXT,
    transcript_summary TEXT,
    dialogue_text TEXT,
    audio_url TEXT,
    video_url TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create personas table
CREATE TABLE public.personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    style TEXT,
    constraints TEXT,
    backstory TEXT,
    voice_preference TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Set up row-level security policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- Jobs RLS policies
CREATE POLICY "Users can view their own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert their own jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Personas RLS policies
CREATE POLICY "Users can view their own personas" ON public.personas
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);
    
CREATE POLICY "Users can insert their own personas" ON public.personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own personas" ON public.personas
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete their own personas" ON public.personas
    FOR DELETE USING (auth.uid() = user_id);
```

3. Set up authentication providers in Supabase

### 3. Cloudflare R2 Setup

1. Create a new R2 bucket named `doodad-videos`
2. Create API tokens for R2 access with read and write permissions
3. Configure public access or set up a custom domain for R2 bucket access

### 4. Cloudflare Worker Setup

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy the worker:
```bash
npm run worker:deploy
```

4. Set environment variables in the Cloudflare dashboard:
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
OPENAI_API_KEY
R2_ENDPOINT_URL
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
API_SECRET
```

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env.local` file)
4. Run the development server:
```bash
npm run dev
```

5. For local worker development:
```bash
npm run worker:dev
```

## Architecture Flow

1. User submits a video URL and persona details
2. The app first tries direct processing via `/api/direct-generate`
3. If direct processing fails or times out, it falls back to queued processing
4. For queued jobs, the Cloudflare Worker polls the Supabase jobs table
5. The worker processes jobs asynchronously and uploads results to R2
6. Users can view their generated videos on the history page

## Troubleshooting

1. **Videos stuck in "queued" state:**
   - Check that the Cloudflare Worker is deployed and running
   - Verify Supabase credentials in the worker environment
   - Check worker logs for any errors

2. **R2 upload errors:**
   - Verify R2 credentials in environment variables
   - Ensure the R2 bucket has proper permissions
   - Check for any file size or type restrictions

3. **API timeouts:**
   - Long videos or complex processing may timeout on Vercel
   - Use the queued approach for these cases
   - Consider increasing timeouts in Vercel project settings 