/**
 * Doodad.AI Cloudflare Worker
 * This worker polls Supabase for queued video jobs and processes them.
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Worker configuration
const CONFIG = {
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_KEY: SUPABASE_SERVICE_KEY,
  OPENAI_API_KEY: OPENAI_API_KEY,
  POLL_INTERVAL: 10000, // 10 seconds
  PROCESSING_LIMIT: 5, // Maximum number of jobs to process in parallel
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: CONFIG.OPENAI_API_KEY,
});

// Available voices for TTS
const AVAILABLE_VOICES = ['alloy', 'fable', 'onyx', 'nova', 'shimmer', 'echo'];

// Create R2 client 
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Main worker function
 */
export default {
  // The scheduled handler runs on a cron schedule
  async scheduled(event, env, ctx) {
    console.log(`[Worker] Scheduled run triggered at ${new Date().toISOString()}`);
    ctx.waitUntil(processQueuedJobs());
  },
  
  // Handle HTTP requests
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Simple health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Manual trigger endpoint (requires authentication)
    if (url.pathname === '/process' && request.method === 'POST') {
      // Check for authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== env.API_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      ctx.waitUntil(processQueuedJobs());
      return new Response(JSON.stringify({ message: 'Processing triggered' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

/**
 * Process queued jobs from the database
 */
async function processQueuedJobs() {
  try {
    console.log(`[Worker] Checking for queued jobs...`);
    
    // Fetch queued jobs
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(CONFIG.PROCESSING_LIMIT);
    
    if (error) {
      console.error(`[Worker] Error fetching queued jobs:`, error);
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log(`[Worker] No queued jobs found.`);
      return;
    }
    
    console.log(`[Worker] Found ${jobs.length} queued jobs. Processing...`);
    
    // Process each job
    const processingPromises = jobs.map(job => processJob(job));
    await Promise.allSettled(processingPromises);
    
    console.log(`[Worker] Processing cycle completed.`);
  } catch (error) {
    console.error(`[Worker] Unhandled error in processQueuedJobs:`, error);
  }
}

/**
 * Process a single job
 */
async function processJob(job) {
  console.log(`[Worker] Processing job ${job.id}...`);
  
  try {
    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    
    // Extract job data
    const { 
      source_video_url: videoUrl, 
      personas, 
      speaking_pace: speakingPace,
      user_guidance: userGuidance,
      transcript_summary: transcriptSummary
    } = job;
    
    // Generate dialogue
    const dialogueResult = await generateDialogue(
      transcriptSummary || "Sample transcript", 
      personas, 
      transcriptSummary || "Sample transcript details",
      "Video showing content", 
      userGuidance
    );
    
    // Generate audio
    const audioUrl = await generateAudio(dialogueResult.lines, speakingPace);
    
    // Update job with results
    await supabase
      .from('jobs')
      .update({ 
        status: 'completed', 
        dialogue_text: dialogueResult.text,
        audio_url: audioUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  } catch (error) {
    console.error(`[Worker] Error processing job ${job.id}:`, error);
    
    // Update job status to failed
    await supabase
      .from('jobs')
      .update({ 
        status: 'failed', 
        error: error.message || 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

/**
 * Generate dialogue for a video
 */
async function generateDialogue(
  transcriptSummary,
  personas,
  fullTranscript,
  frameDescriptions,
  userGuidance
) {
  console.log(`[Worker] Generating dialogue...`);
  
  // Build prompt
  const promptMessages = [
    {
      role: 'system',
      content: `You are the writer for a video commentary system that generates entertaining, 
witty dialogue between characters who are watching and commenting on a video.

Your goal is to create a conversational dialogue script between the speakers who are watching the video. 
The dialogue should be natural, entertaining, and responsive to what's happening in the video.

The dialogue should follow these rules:
1. Keep responses brief and punchy (1-2 sentences each)
2. Maintain the distinct personality/style of each speaker
3. Have the speakers react to and comment on the content they're seeing
4. Create a natural flow of conversation between the speakers
5. Follow any specific constraints listed for each speaker
6. Avoid narrating what's happening - focus on reactions and commentary

Format your response ONLY as a dialogue script with each line starting with the speaker's name followed by colon:
Speaker1: This is what they say.
Speaker2: This is the response.

VIDEO TRANSCRIPT SUMMARY:
${transcriptSummary}

SPEAKERS:
${personas.map((persona, index) => {
  return `Speaker ${index + 1}: ${persona.name}
Style: ${persona.style || 'Generic'}
${persona.constraints ? `Constraints: ${persona.constraints}` : ''}
${persona.backstory ? `Backstory: ${persona.backstory}` : ''}`;
}).join('\n\n')}

${userGuidance ? `ADDITIONAL GUIDANCE FROM USER:\n${userGuidance}\n\n` : ''}

For context, here's more detail about what's in the video:
${fullTranscript}

Visual context from the video:
${frameDescriptions}`
    },
    {
      role: 'user',
      content: 'Please generate a conversational dialogue script for these characters commenting on this video.'
    }
  ];
  
  // Generate dialogue
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: promptMessages,
    max_tokens: 600,
    temperature: 0.7
  });
  
  const dialogueText = completion.choices[0]?.message?.content;
  if (!dialogueText) {
    throw new Error('No response content from OpenAI (dialogue generation).');
  }
  
  // Parse dialogue
  const lines = parseDialogueLines(dialogueText);
  
  return {
    text: dialogueText,
    lines
  };
}

/**
 * Parse dialogue lines from text
 */
function parseDialogueLines(text) {
  const lines = [];
  const lineRegex = /(.+?):\s*(.+)/g;
  let match;
  
  while ((match = lineRegex.exec(text)) !== null) {
    if (match.length >= 3) {
      lines.push({
        speaker: match[1].trim(),
        text: match[2].trim()
      });
    }
  }
  
  return lines;
}

/**
 * Generate audio for dialogue lines
 */
async function generateAudio(dialogueLines, speakingPace = 1.0) {
  console.log(`[Worker] Generating audio for ${dialogueLines.length} lines...`);
  
  // Assign voices to speakers
  const speakerToVoiceMap = new Map();
  let currentVoiceIndex = 0;
  
  // Generate audio for each line
  const audioBuffers = [];
  
  for (let i = 0; i < dialogueLines.length; i++) {
    const line = dialogueLines[i];
    
    // Assign voice if not already assigned
    if (!speakerToVoiceMap.has(line.speaker)) {
      const voice = AVAILABLE_VOICES[currentVoiceIndex % AVAILABLE_VOICES.length];
      speakerToVoiceMap.set(line.speaker, voice);
      currentVoiceIndex++;
    }
    
    const voice = speakerToVoiceMap.get(line.speaker);
    
    // Generate TTS
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: line.text,
      speed: speakingPace
    });
    
    const mp3Data = await mp3Response.arrayBuffer();
    audioBuffers.push(Buffer.from(mp3Data));
  }
  
  // Merge audio files (this would need a proper implementation in a production worker)
  // For this example, we'll just use the first audio buffer
  const mergedAudio = audioBuffers[0]; // In a real implementation, these would be concatenated
  
  // Upload to R2
  const audioFileName = `audio_${Date.now()}.mp3`;
  
  const uploadCommand = new PutObjectCommand({
    Bucket: 'doodad-videos',
    Key: `audio/${audioFileName}`,
    Body: mergedAudio,
    ContentType: 'audio/mpeg',
  });
  
  await r2.send(uploadCommand);
  
  // Return public URL
  return `https://pub-67ca5e2b9cc8442aae3f9058614ea98.r2.dev/audio/${audioFileName}`;
} 