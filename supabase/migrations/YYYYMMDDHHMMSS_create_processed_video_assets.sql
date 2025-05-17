-- SQL for processed_video_assets table

CREATE TABLE IF NOT EXISTS processed_video_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_video_identifier TEXT NOT NULL UNIQUE, -- e.g., 'youtube_VIDEOID' or hash of URL
    clipped_video_path_r2 TEXT, -- R2 key/path for the ~60s clipped source video
    audio_transcript TEXT,      -- Full audio transcript from Whisper
    frame_paths_r2 JSONB,       -- Array of R2 keys/paths for sampled frame images
    frame_descriptions TEXT,    -- Comma-separated descriptions from vision model for the frames
    source_video_duration_seconds INTEGER, -- Optional: original duration
    clip_duration_seconds INTEGER, -- Optional: actual duration of the clip stored
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_source_video_identifier ON processed_video_assets(source_video_identifier);

-- Optional: Trigger function to update last_accessed_at (if not handled by application logic)
-- CREATE OR REPLACE FUNCTION update_last_accessed_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.last_accessed_at = now();
--    RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_processed_video_assets_last_accessed
-- BEFORE UPDATE ON processed_video_assets
-- FOR EACH ROW
-- WHEN (OLD.last_accessed_at IS DISTINCT FROM NEW.last_accessed_at) -- Only if not being set by app
-- EXECUTE PROCEDURE update_last_accessed_at_column();

COMMENT ON COLUMN processed_video_assets.source_video_identifier IS 'Canonical identifier for the source video, e.g., youtube_VIDEOID';
COMMENT ON COLUMN processed_video_assets.clipped_video_path_r2 IS 'R2 key for the clipped source video (e.g., 60s segment)';
COMMENT ON COLUMN processed_video_assets.frame_paths_r2 IS 'JSON array of R2 keys for sampled frame images';
COMMENT ON COLUMN processed_video_assets.frame_descriptions IS 'Concatenated descriptions of frames from vision model'; 