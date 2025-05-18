// src/types.ts

// Doodad.AI type definitions

// Voice options for TTS (Text-to-Speech)
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// A character/persona that will react to the video
export interface Persona {
  name: string;
  style?: string; // Speaking style or character traits
  constraints?: string; // Things this persona can't/won't talk about
  backstory?: string; // Background information about the persona
  voice_preference?: TTSVoice; // Preferred TTS voice
  tags?: string[]; // Tags for categorization/filtering
}

// A single line of dialogue in the commentary
export interface DialogueLine {
  speaker: string;
  text: string;
  timestamp?: number; // Optional timestamp in seconds
}

// Job data for video processing queue
export interface VideoJobData {
  id: string;
  userId?: string;
  videoUrl: string;
  personas: Persona[];
  speakingPace?: number;
  jobId: string;
  transcriptSummary?: string;
  userGuidance?: string;
  callbackUrl?: string;
}

// A user's history entry for a generated video
export interface HistoryEntry {
  id: string;
  created_at: string;
  video_r2_url: string | null;
  thumbnail_url: string | null;
  source_video_url: string | null;
  num_speakers: number;
  personas: Persona[];
  transcript_summary: string | null;
  speaking_pace: number;
  job_id?: string | null;
  status?: 'queued' | 'processing' | 'completed' | 'failed' | string | null;
  error_message?: string | null;
  user_guidance?: string | null;
}

// API Response formats
export interface DialogueResponse {
  dialogue: DialogueLine[];
  audioUrl?: string;
  videoUrl?: string;
  finalVideoUrl?: string;
  jobId?: string;
  error?: string;
  generatedSummary?: string;
}

export interface APIErrorResponse {
  error: string;
  details?: string;
  code?: string;
} 