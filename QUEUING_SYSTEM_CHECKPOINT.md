# Application Checkpoint: Pre-Queuing System Implementation

Date: May 13, 2025 (as per conversation context)

This document outlines the state of the "Queer-AI Commentary Generator" application before the integration of a background job queuing system.

## 1. Database Schema (Supabase/PostgreSQL)

### `custom_personas` Table
Stores user-defined personas for AI commentary.
- `id`: UUID, Primary Key
- `created_at`: Timestamp with time zone, defaults to `now()`
- `name`: Text, Unique, Not Null
- `style`: Text, Nullable (Stores speaking style, tone)
- `constraints`: Text, Nullable (Stores rules/constraints for the persona)
- `backstory`: Text, Nullable (Contextual knowledge for the persona)
- `voice_preference`: Text, Nullable (References TTSVoice like 'alloy', 'echo', etc.)
- `tags`: Array of Text (`text[]`), Nullable

### `video_history` Table
Stores records of successfully generated videos.
- `id`: UUID, Primary Key, defaults to `uuid_generate_v4()`
- `created_at`: Timestamp with time zone, defaults to `now()`
- `video_r2_url`: Text, Nullable (Pre-signed URL to the final video in Cloudflare R2)
- `thumbnail_url`: Text, Nullable (URL to the video thumbnail, likely in Supabase Storage)
- `source_video_url`: Text, Nullable (Original YouTube/source URL)
- `num_speakers`: Integer, Nullable
- `personas`: JSONB, Nullable (Array of Persona objects used)
- `transcript_summary`: Text, Nullable
- `user_guidance`: Text, Nullable (User-provided specific instructions for the generation)
- `speaking_pace`: Float, Nullable (e.g., 1.0, 1.2)

## 2. Core Codebase Functionality

### API Routes (`queer-ai/src/app/api/`)
- **`/api/generate/route.ts`**:
    - Handles POST requests to generate a commentary video.
    - Currently performs all operations **synchronously**:
        1. Downloads and clips the source video (e.g., YouTube).
        2. Transcribes audio from the clipped video using OpenAI Whisper.
        3. Samples frames from the clipped video (every 2 seconds).
        4. Analyzes sampled frames using OpenAI GPT-4o for scene descriptions.
        5. Builds a detailed prompt (system & user messages) using persona details (name, style, constraints, backstory), frame descriptions, transcript summary, and user guidance.
        6. Sends the prompt to OpenAI (e.g., GPT-4o) to generate dialogue.
        7. Parses the AI's dialogue response.
        8. Generates Text-to-Speech (TTS) audio for each dialogue line using OpenAI TTS-1-HD.
        9. Merges individual TTS audio tracks into a single voiceover.
        10. Composes the final video by overlaying the voiceover onto the clipped source video.
        11. Uploads the final video to Cloudflare R2 and gets a pre-signed URL.
        12. Uploads a thumbnail to Supabase Storage.
        13. Logs the generation details to the `video_history` table in Supabase.
        14. Returns dialogue, audio preview URL (local), final video R2 URL, and generated summary to the frontend.
- **`/api/personas/route.ts` & `/api/personas/[id]/route.ts`**:
    - Provide CRUD (Create, Read, Update, Delete) operations for `custom_personas`.
- **`/api/history/route.ts`**:
    - Fetches and returns entries from the `video_history` table.
- **`/api/tts-preview/route.ts`**:
    - Accepts text and a voice selection, generates a TTS audio preview using OpenAI TTS-1-HD, saves it locally, and returns a URL to the preview file.

### Frontend Pages (`queer-ai/src/app/`)
- **`page.tsx` (Main Generation Page):**
    - UI for inputting YouTube video URL, selecting number of speakers, choosing/defining personas (name, style), providing transcript summary (optional), user guidance (optional), and setting speaking pace.
    - Displays a preview of the YouTube video.
    - Calls `/api/generate` and waits for completion.
    - Displays generated dialogue, audio preview, and a link to the final video (if successful).
    - Includes "Copy Share Link" for the generated video.
- **`personas/page.tsx` (Persona Manager):**
    - UI for creating, viewing, editing, and deleting custom personas.
    - Interacts with `/api/personas` routes.
- **`history/page.tsx` (History Page):**
    - Fetches and displays a grid of previously generated videos from `/api/history`.
    - Each history item shows a thumbnail, summary, persona info, and provides "Watch Video", "Remix" (pre-fills generation page), and "Copy Share Link" buttons.

### Core Libraries (`queer-ai/src/lib/`)
- **`promptBuilder.ts`**:
    - Constructs the structured system and user prompts for the dialogue generation LLM call, incorporating persona details, frame descriptions, transcript summary, and user guidance.
    - Parses the LLM's dialogue response.
- **`videoProcessor.ts`**:
    - `downloadAndClipVideo()`: Uses `yt-dlp` to download video and `ffmpeg` to clip it. Current clip duration is set to 60 seconds.
    - `sampleFramesFromVideo()`: Uses `ffmpeg` to extract frames at a 2-second interval.
    - `composeVideoWithAudio()`: Uses `ffmpeg` to combine the clipped video with the generated voiceover.
    - `extractAudioFromVideo()`: (Potentially used by transcription, though Whisper API can take video directly).
- **`cloudflareR2.ts`**:
    - Handles file uploads to Cloudflare R2 and generation of pre-signed GET URLs.
- **`mergeAudio.ts`**:
    - Uses `ffmpeg` to merge multiple TTS WAV files into a single WAV file.
- **`queue.ts`**:
    - Contains initial setup for BullMQ and Redis connection. Currently not integrated into the generation flow.
- **`supabaseClient.ts`**:
    - Configures Supabase client instances (anon and service role).

## 3. Known Issues / Linter Warnings
- Persistent TypeScript linter errors in API routes: `Cannot find module '@/...' or its corresponding type declarations.` for local lib imports (e.g., `@/types`, `@/lib/videoProcessor`). This suggests a path alias misconfiguration in `tsconfig.json` or an issue with how the editor/linter resolves these paths for server-side files. The application appears to build and run despite these editor/linter warnings.

## 4. Current Generation Flow
1. User fills out the form on the main page (`/`).
2. User clicks "Generate Commentary Video".
3. Frontend (`page.tsx`) makes a POST request to `/api/generate`.
4. The `/api/generate` endpoint performs all video processing, AI interactions, and file uploads synchronously. This can take several minutes, during which the frontend shows a loading state.
5. If successful, `/api/generate` returns a JSON response with the final video URL, dialogue, etc.
6. Frontend updates the UI to show the results.
7. If any step in the backend fails, an error is returned, and the frontend displays an error message.

This synchronous nature limits the application to processing one video at a time per server instance/thread and can lead to long wait times for the user and potential browser timeouts for very long generations. 