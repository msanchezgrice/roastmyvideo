# Application Checkpoint: Pre-Authentication & Public Feed Prep

Date: May 16, 2025 (as per conversation context)

This document outlines the state of the "Queer-AI Commentary Generator" application before implementing User Authentication, Data Segregation, and preparing for a potential Public Feed feature.

## Current State (Post-Queuing System Implementation)

### 1. Database Schema (Supabase/PostgreSQL)

**`custom_personas` Table:**
- `id`: UUID, Primary Key
- `created_at`: TIMESTAMPTZ, `default now()`
- `name`: TEXT, Unique, Not Null
- `style`: TEXT, Nullable
- `constraints`: TEXT, Nullable
- `backstory`: TEXT, Nullable
- `voice_preference`: TEXT, Nullable
- `tags`: TEXT[], Nullable
*No `user_id` column yet.*

**`video_history` Table:**
- `id`: UUID, Primary Key, `default uuid_generate_v4()`
- `created_at`: TIMESTAMPTZ, `default now()`
- `video_r2_url`: TEXT, Nullable (Column constraint was recently changed to allow NULLs)
- `thumbnail_url`: TEXT, Nullable
- `source_video_url`: TEXT, Nullable
- `num_speakers`: INTEGER, Nullable
- `personas`: JSONB, Nullable
- `transcript_summary`: TEXT, Nullable
- `user_guidance`: TEXT, Nullable
- `speaking_pace`: FLOAT4, Nullable
- `job_id`: TEXT, Nullable, UNIQUE (Added for queuing system)
- `status`: TEXT, Nullable, `default 'queued'` (Added for queuing system)
- `error_message`: TEXT, Nullable (Added for queuing system)
- `updated_at`: TIMESTAMPTZ, Nullable (Added, with trigger potentially for auto-update on row change)
*No `user_id` column yet. No `is_public` column yet.*

**`processed_video_assets` Table:**
- `id`: UUID, Primary Key, `default uuid_generate_v4()`
- `source_video_identifier`: TEXT, Not Null, UNIQUE
- `clipped_video_path_r2`: TEXT, Nullable
- `audio_transcript`: TEXT, Nullable
- `frame_paths_r2`: JSONB, Nullable
- `frame_descriptions`: TEXT, Nullable
- `source_video_duration_seconds`: INTEGER, Nullable
- `clip_duration_seconds`: INTEGER, Nullable
- `processed_at`: TIMESTAMPTZ, `default now()`
- `last_accessed_at`: TIMESTAMPTZ, `default now()`
*This table is intended for globally shared cached assets.*

### 2. Core Codebase Functionality
- **Queuing System:** Implemented using BullMQ and Redis. `/api/generate` adds jobs to a queue, and a separate worker process (`src/workers/videoWorker.ts`) handles video generation asynchronously.
- **Caching of Processed Assets:** `videoGenerationService.ts` attempts to:
    - Look up previously processed assets (transcript, frame descriptions, R2 paths for clipped video & frames) from `processed_video_assets` based on `source_video_identifier`.
    - Use cached textual assets if found.
    - Use cached R2 clipped video if found (downloads it locally).
    - If assets are not cached, it processes them, uploads the source clip and frames to R2 cache paths, and attempts to save metadata (including R2 paths, transcript, frame descriptions) to `processed_video_assets`.
    - **Known Issue with Cache Saving:** Cache saving to `processed_video_assets` was previously not working due to the table not existing, then due to a prerequisite (audio transcript) failing. The condition has been relaxed, but full verification of cache saving (especially R2 uploads for cache) and subsequent cache hits is ongoing.
- **Other functionalities** (API routes for personas/history, frontend pages, core libs) are as described in `QUEUING_SYSTEM_CHECKPOINT.md`, with modifications to support the queuing system (e.g., frontend shows Job ID, history page polls and shows status).

### 3. Key Recent Changes & Status
- **Audio Transcription:** Encountering OpenAI Whisper API 413 errors (file size limit) for 60s clips. An audio compression step (`ffmpeg` to MP3) was added before the Whisper call to mitigate this, but its effectiveness needs full verification.
- **Cache Saving:** Logic to save to `processed_video_assets` was recently adjusted to be less dependent on successful audio transcription. The `processed_video_assets` table itself was recently confirmed to exist.
- **Error Handling:** Improved logging has been added to various parts of the generation and caching flow.
- **Linter Errors:** Persistent TypeScript path alias (`@/`) resolution issues and `supabaseAdmin` type inference problems in `tsconfig.json` need to be definitively resolved.

## Plan Moving Forward: User Authentication & Public Feed Preparation

**Phase 1: User Authentication and Data Segregation**
1.  **Database Changes:**
    *   Add `user_id UUID REFERENCES auth.users(id)` to `custom_personas` and `video_history`.
    *   (Optional but recommended for public feed): Add `is_public BOOLEAN DEFAULT false` to `video_history`.
2.  **RLS Policies:**
    *   Enable RLS for `custom_personas` and `video_history`.
    *   Create policies allowing authenticated users to manage only their own records.
    *   Create a policy for public read access to `video_history` where `is_public = true`.
3.  **Supabase Auth Integration (Frontend & Backend):**
    *   Install and configure `@supabase/auth-helpers-nextjs`.
    *   Implement Sign Up, Sign In, Sign Out UI and logic.
    *   Modify API routes (`/api/generate`, `/api/personas`, `/api/history`) to be user-aware and respect `user_id` for data operations.
    *   Pass `user_id` to the worker for `video_history` records.

**Phase 2: Basic Public Feed (if pursued alongside Auth)**
1.  **Frontend Page (`/feed` or similar):** Displays `video_history` entries where `is_public = true`.
2.  **Mechanism to Mark Videos as Public:** UI element for a user to make one of their own videos public (updates `is_public` flag in `video_history`). This needs careful RLS to ensure users can only mark their own videos.

**Phase 3: Enhanced Sharing & Unique URLs (Post-Auth)**
1.  **Shareable Link Page (`/share/[videoId]`):** Dynamically generates OG tags and displays a specific video. Access control based on `is_public` or ownership.
2.  **Frontend Share Buttons:** Integrate `react-share` or similar, pointing to these shareable links.

This checkpoint captures the system state before these significant user-facing and data architecture changes. 