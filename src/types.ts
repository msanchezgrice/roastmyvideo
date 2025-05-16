// queer-ai/src/types.ts

export interface DialogueLine {
  speaker: string;
  text: string;
}

// Defines the allowable voice names for OpenAI TTS
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// Represents a persona configuration, used for generating dialogue
// and also for custom persona management.
export interface Persona {
  name: string;
  style?: string | null;            // Added Style
  constraints?: string | null;      // Added Constraints
  backstory?: string | null;       // Optional contextual background
  voice_preference?: TTSVoice | null; // Optional preferred TTS voice
  tags?: string[] | null; // Added tags array
  // If you store custom personas from Supabase with an ID, you might also include it here
  // when fetching them for use in dropdowns, but the core generation might only need name/desc/backstory.
  id?: string; // Useful if this type is also used for custom personas fetched from DB
}

// Specific structure for persona templates used in UI selectors
export interface PersonaTemplate extends Persona {
  id: string; // Unique ID for the template (can be a slug or UUID)
  // voice_preference is already in Persona
  // tags is inherited from Persona
}

// Structure for entries in the video generation history
export interface HistoryEntry {
  id: string; // uuid from Supabase
  created_at: string; // ISO timestamp string
  video_r2_url: string;
  thumbnail_url: string | null;
  source_video_url: string | null; // Original YouTube/source URL
  num_speakers: number;
  personas: Persona[]; // Array of Persona objects used for this generation
  transcript_summary: string | null;
  user_guidance?: string | null; // Added user guidance
  speaking_pace: number;
  // user_id?: string | null; // If you add user-specific history
}

// Represents cached processed assets for a unique source video
export interface ProcessedVideoAsset {
  id: string; // UUID, Primary Key for this cache entry table
  source_video_identifier: string; // e.g., "youtube_VIDEOID"
  clipped_video_path_r2?: string | null; // R2 path for the ~60s source clip
  audio_transcript?: string | null;
  frame_paths_r2?: string[] | null; // JSON array of R2 paths for frame images
  frame_descriptions?: string | null;
  source_video_duration_seconds?: number | null;
  clip_duration_seconds?: number | null;
  processed_at: string; // ISO timestamp
  last_accessed_at: string; // ISO timestamp
}

// If you have other shared types, add them here. 

export interface VideoJobData {
  jobId: string; // BullMQ job ID, can be useful for logging/tracking
  videoUrlInput: string;
  transcriptSummary?: string | null; // User-provided initial summary
  userPersonas: Persona[];
  speakingPace: number;
  userGuidance?: string | null;
  // We might also add a historyEntryId if we create the history record before queuing
  // or pass all necessary data to create it upon successful completion.
} 