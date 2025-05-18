import OpenAI from 'openai';
import { DialogueLine, TTSVoice, Persona } from '@/types';
import { buildDialoguePrompt, parseDialogueResponse } from '@/lib/promptBuilder';
import { v4 as uuidv4 } from 'uuid';
import { uploadToR2 } from './r2';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available voices for TTS
const AVAILABLE_VOICES: TTSVoice[] = ['alloy', 'fable', 'onyx', 'nova', 'shimmer', 'echo'];

// Function to assign voices to speakers
function assignVoiceToSpeaker(speakerName: string, speakerToVoiceMap: Map<string, TTSVoice>, currentVoiceIndex: number): { voice: TTSVoice, nextVoiceIndex: number } {
  if (!speakerToVoiceMap.has(speakerName)) {
    const voice = AVAILABLE_VOICES[currentVoiceIndex % AVAILABLE_VOICES.length];
    speakerToVoiceMap.set(speakerName, voice);
    return { voice, nextVoiceIndex: currentVoiceIndex + 1 };
  }
  return { voice: speakerToVoiceMap.get(speakerName)!, nextVoiceIndex: currentVoiceIndex };
}

/**
 * Process a video directly without relying on Supabase or Redis
 * Simplified for serverless environment by removing file system operations
 */
export async function processVideoDirectly(
  videoUrl: string,
  personas: Persona[],
  speakingPace: number = 1.0,
  userGuidance?: string
): Promise<{ dialogueText: string, statusMessage: string, audioUrl?: string, videoUrl?: string }> {
  const jobId = uuidv4().substring(0, 8);
  console.log(`[DirectProcess JOB ${jobId}] Starting with ${personas.length} personas`);
  console.log(`[DirectProcess JOB ${jobId}] Environment check: NODE_ENV=${process.env.NODE_ENV}`);
  
  try {
    // Use a hardcoded transcript for demo purposes
    // In production, this would be derived from the video 
    const demoTranscript = "This is a sample transcript. A person is talking about an interesting topic.";
    const actualFrameDescriptions = "Person speaking, office setting, computer screen";

    console.log(`[DirectProcess JOB ${jobId}] Using demo transcript and frame descriptions`);

    // Build the dialogue prompt
    const promptMessages = buildDialoguePrompt(
      demoTranscript, 
      personas, 
      demoTranscript, 
      actualFrameDescriptions, 
      userGuidance
    );
    
    console.log(`[DirectProcess JOB ${jobId}] Generating dialogue text...`);
    const dialogueCompletion = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: promptMessages, 
      max_tokens: 280, 
      temperature: 0.7
    });
    
    const aiDialogueResponse = dialogueCompletion.choices[0]?.message?.content;
    if (!aiDialogueResponse) {
      throw new Error('No response content from OpenAI (dialogue generation).');
    }
    
    console.log(`[DirectProcess JOB ${jobId}] Dialogue text generated successfully`);
    console.log(`[DirectProcess JOB ${jobId}] Dialogue: ${aiDialogueResponse.substring(0, 100)}...`);
    
    // Parse the dialogue response
    const dialogueLines: DialogueLine[] = parseDialogueResponse(aiDialogueResponse);
    console.log(`[DirectProcess JOB ${jobId}] Parsed ${dialogueLines.length} lines of dialogue`);
    
    // Force-enable TTS generation regardless of environment
    console.log(`[DirectProcess JOB ${jobId}] Starting TTS generation for ${dialogueLines.length} lines...`);
    console.log(`[DirectProcess JOB ${jobId}] OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`[DirectProcess JOB ${jobId}] R2 environment variables check:`);
    console.log(`[DirectProcess JOB ${jobId}] - R2_ENDPOINT_URL: ${!!process.env.R2_ENDPOINT_URL}`);
    console.log(`[DirectProcess JOB ${jobId}] - R2_ACCESS_KEY_ID: ${!!process.env.R2_ACCESS_KEY_ID}`);
    console.log(`[DirectProcess JOB ${jobId}] - R2_SECRET_ACCESS_KEY: ${!!process.env.R2_SECRET_ACCESS_KEY}`);
    console.log(`[DirectProcess JOB ${jobId}] - R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME || 'doodad-videos'}`);
    console.log(`[DirectProcess JOB ${jobId}] - R2_PUBLIC_URL_BASE: ${process.env.R2_PUBLIC_URL_BASE || 'not set'}`);
    
    try {
      // For serverless environment, we'll just generate TTS for the first line 
      // as a proof of concept and to avoid hitting timeouts
      if (dialogueLines.length === 0) {
        throw new Error('No dialogue lines to process');
      }
      
      const speakerToVoiceMap = new Map<string, TTSVoice>();
      let currentVoiceIndex = 0;
      
      // Generate TTS for the first line only
      const firstLine = dialogueLines[0];
      const { voice, nextVoiceIndex } = assignVoiceToSpeaker(firstLine.speaker, speakerToVoiceMap, currentVoiceIndex);
      currentVoiceIndex = nextVoiceIndex;
      
      console.log(`[DirectProcess JOB ${jobId}] Generating TTS for line 1/${dialogueLines.length} using voice ${voice}`);
      
      try {
        const mp3Response = await openai.audio.speech.create({
          model: "tts-1",
          voice: voice,
          input: firstLine.text,
          speed: speakingPace
        });
        
        console.log(`[DirectProcess JOB ${jobId}] TTS generation successful for line 1`);
        
        // Get the audio as a buffer
        const mp3Data = await mp3Response.arrayBuffer();
        const mp3Buffer = Buffer.from(mp3Data);
        console.log(`[DirectProcess JOB ${jobId}] Audio buffer created: ${mp3Buffer.length} bytes`);
        
        // Upload directly to R2 without saving to disk
        const audioFileName = `dialogue_${jobId}_line1.mp3`;
        console.log(`[DirectProcess JOB ${jobId}] Uploading TTS audio to R2... filename: ${audioFileName}`);
        
        try {
          const uploadedAudio = await uploadToR2(
            mp3Buffer,
            audioFileName,
            'audio/mpeg'
          );
          
          console.log(`[DirectProcess JOB ${jobId}] Audio uploaded. URL: ${uploadedAudio.url}`);
          console.log(`[DirectProcess JOB ${jobId}] Signed URL: ${uploadedAudio.signedUrl?.substring(0, 50)}...`);
          
          return { 
            dialogueText: aiDialogueResponse,
            audioUrl: uploadedAudio.signedUrl,
            statusMessage: `Generated dialogue script with ${dialogueLines.length} lines and sample audio.`
          };
        } catch (uploadError) {
          console.error(`[DirectProcess JOB ${jobId}] R2 upload error:`, uploadError);
          if (uploadError instanceof Error) {
            console.error(`[DirectProcess JOB ${jobId}] Upload error details:`, uploadError.name, uploadError.message, uploadError.stack);
          }
          
          // Return the dialogue even if R2 upload fails
          return {
            dialogueText: aiDialogueResponse,
            statusMessage: `Generated dialogue script. Audio upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`
          };
        }
      } catch (ttsError) {
        console.error(`[DirectProcess JOB ${jobId}] TTS generation error:`, ttsError);
        if (ttsError instanceof Error) {
          console.error(`[DirectProcess JOB ${jobId}] TTS error details:`, ttsError.name, ttsError.message, ttsError.stack);
        }
        
        // Return the dialogue even if TTS fails
        return {
          dialogueText: aiDialogueResponse,
          statusMessage: `Generated dialogue script. Audio creation failed: ${ttsError instanceof Error ? ttsError.message : String(ttsError)}`
        };
      }
    } catch (processingError) {
      console.error(`[DirectProcess JOB ${jobId}] Processing error:`, processingError);
      
      // Still return the dialogue even if processing fails
      return {
        dialogueText: aiDialogueResponse,
        statusMessage: `Generated dialogue script. Processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`
      };
    }
  } catch (error) {
    console.error(`[DirectProcess JOB ${jobId}] Error:`, error);
    return {
      dialogueText: "",
      statusMessage: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 