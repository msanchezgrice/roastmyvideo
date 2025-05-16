// queer-ai/src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Persona, VideoJobData } from '@/types';
import { videoQueue } from '@/lib/queue'; // Import your BullMQ queue
import { supabaseAdmin } from '@/lib/supabase/serviceRoleClient'; // Updated import path

export async function POST(request: Request) {
  const operationId = Date.now().toString(); // For initial request logging if needed
  let jobId: string | null = null;

  try {
    // Define an interface for the expected request body structure for clarity and type safety
    interface GenerateRequestBody {
      videoUrlInput?: string;
      transcriptSummary?: string;
      personas: Persona[];
      speakingPace?: number;
      userGuidance?: string;
    }
    const body = await request.json() as GenerateRequestBody;

    const { 
        videoUrlInput,
        transcriptSummary, // User-provided initial summary
        personas, 
        speakingPace, 
        userGuidance 
    } = body;

    // Basic validation (can be more thorough)
    if (!videoUrlInput && !transcriptSummary) {
      return NextResponse.json({ error: 'Validation Error', details: 'Either Video URL or Transcript Summary is required.' }, { status: 400 });
    }
    if (!personas || !Array.isArray(personas) || personas.length === 0) {
      return NextResponse.json({ error: 'Validation Error', details: 'At least one persona is required.' }, { status: 400 });
    }

    jobId = uuidv4(); // Generate a unique job ID

    const jobData: VideoJobData = {
      jobId,
      videoUrlInput: videoUrlInput || '', // Ensure string, even if undefined from body
      transcriptSummary: transcriptSummary || null,
      userPersonas: personas, // Already validated as Persona[] essentially
      speakingPace: speakingPace || 1.0,
      userGuidance: userGuidance || null
    };

    // Create initial history entry
    if (supabaseAdmin) {
      console.log(`[API /api/generate JOB ${jobId}] supabaseAdmin client is available.`);
      const initialHistoryData = {
        job_id: jobId,
        source_video_url: videoUrlInput || null,
        num_speakers: personas.length,
        personas: personas,
        transcript_summary: transcriptSummary || null, 
        user_guidance: userGuidance || null,
        speaking_pace: speakingPace || 1.0,
        status: 'queued',
        created_at: new Date().toISOString() 
      };
      try {
        console.log(`[API /api/generate JOB ${jobId}] Attempting to create initial history entry with data:`, JSON.stringify(initialHistoryData, null, 2));
        const { error: insertError } = await supabaseAdmin.from('video_history').insert(initialHistoryData);

        if (insertError) {
            console.error(`[API /api/generate JOB ${jobId}] Supabase error creating initial history entry:`, insertError);
        } else {
            console.log(`[API /api/generate JOB ${jobId}] Initial history entry created successfully with status 'queued'.`);
        }
      } catch (dbError) {
        console.error(`[API /api/generate JOB ${jobId}] Exception during initial history entry creation:`, dbError);
      }
    } else {
      console.warn(`[API /api/generate JOB ${jobId}] Supabase admin client IS NOT AVAILABLE. Skipping initial history entry.`);
    }

    // Add job to the queue
    await videoQueue.add(`video-job-${jobId}`, jobData);
    console.log(`[API /api/generate JOB ${jobId}] Job added to queue. OperationId: ${operationId}`);

    // Respond quickly to the client
    return NextResponse.json({ 
      message: 'Video generation job accepted.', 
      jobId: jobId 
    });

  } catch (error) {
    console.error(`[API /api/generate JOB ${jobId || 'UNKNOWN'}] Error adding job to queue. OperationId: ${operationId}:`, error);
    let errorMessage = 'Failed to submit video generation job.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Queue Submission Error', details: errorMessage }, { status: 500 });
  }
  // The extensive finally block for cleanup is no longer needed here; it belongs with the worker logic.
}