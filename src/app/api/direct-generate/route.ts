import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Persona } from '@/types';
import { processVideoDirectly } from '@/lib/direct-processing';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log(`[DirectGenerate API] Request received: ${new Date().toISOString()}`);
  const operationId = uuidv4().substring(0, 8);
  
  try {
    // Parse the request body
    const bodyText = await request.text();
    console.log(`[DirectGenerate API] Request body: ${bodyText}`);
    
    // Define interface for the request body
    interface GenerateRequestBody {
      videoUrlInput?: string;
      personas: Persona[];
      speakingPace?: number;
      userGuidance?: string;
    }
    
    const body = JSON.parse(bodyText) as GenerateRequestBody;
    
    const { 
      videoUrlInput,
      personas, 
      speakingPace, 
      userGuidance 
    } = body;
    
    console.log(`[DirectGenerate API] Processing request. Video URL: ${videoUrlInput}, Personas: ${personas.length}`);
    
    // Basic validation
    if (!videoUrlInput) {
      console.log(`[DirectGenerate API] Validation failed: No video URL provided`);
      return NextResponse.json({ error: 'Validation Error', details: 'Video URL is required.' }, { status: 400 });
    }
    
    if (!personas || !Array.isArray(personas) || personas.length === 0) {
      console.log(`[DirectGenerate API] Validation failed: No personas provided`);
      return NextResponse.json({ error: 'Validation Error', details: 'At least one persona is required.' }, { status: 400 });
    }
    
    // Process the video directly instead of using a queue
    console.log(`[DirectGenerate API] Starting direct processing for operation ${operationId}`);
    const result = await processVideoDirectly(
      videoUrlInput,
      personas,
      speakingPace || 1.0,
      userGuidance
    );
    
    console.log(`[DirectGenerate API] Processing completed for operation ${operationId}`);
    
    // Return the result immediately with additional fields if available
    const response = {
      message: 'Video processed successfully',
      operation_id: operationId,
      dialogue_text: result.dialogueText,
      status_message: result.statusMessage
    };
    
    // Include audio and video URLs if available
    if (result.audioUrl) {
      Object.assign(response, { audio_url: result.audioUrl });
    }
    
    if (result.videoUrl) {
      Object.assign(response, { video_url: result.videoUrl });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[DirectGenerate API] Error:`, error);
    let errorMessage = 'Failed to process video.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ 
      error: 'Processing Error', 
      details: errorMessage,
      operation_id: operationId
    }, { status: 500 });
  }
} 