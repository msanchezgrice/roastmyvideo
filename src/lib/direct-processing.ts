import OpenAI from 'openai';
import { DialogueLine, TTSVoice, Persona } from '@/types';
import { buildDialoguePrompt, parseDialogueResponse } from '@/lib/promptBuilder';
import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
 */
export async function processVideoDirectly(
  videoUrl: string,
  personas: Persona[],
  speakingPace: number = 1.0,
  userGuidance?: string
): Promise<{ dialogueText: string, statusMessage: string }> {
  const jobId = uuidv4().substring(0, 8);
  console.log(`[DirectProcess JOB ${jobId}] Starting with ${personas.length} personas`);

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
    
    console.log(`[DirectProcess JOB ${jobId}] Dialogue text generated`);
    
    // Parse the dialogue response
    const dialogueLines: DialogueLine[] = parseDialogueResponse(aiDialogueResponse);
    
    // At this point in production, we would:
    // 1. Generate TTS audio for each line
    // 2. Merge the audio files
    // 3. Overlay the audio on the video
    // 4. Upload the result

    return { 
      dialogueText: aiDialogueResponse,
      statusMessage: `Generated dialogue script with ${dialogueLines.length} lines of dialogue.`
    };
  } catch (error) {
    console.error(`[DirectProcess JOB ${jobId}] Error:`, error);
    return {
      dialogueText: "",
      statusMessage: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 