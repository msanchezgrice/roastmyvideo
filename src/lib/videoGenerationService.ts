import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

import { DialogueLine, TTSVoice, Persona, VideoJobData, ProcessedVideoAsset } from '@/types';
import { downloadAndClipVideo, sampleFramesFromVideo, composeVideoWithAudio, TEMP_VIDEO_DIR } from '@/lib/videoProcessor';
import { buildDialoguePrompt, parseDialogueResponse } from '@/lib/promptBuilder';
import { mergeAudioWav } from '@/lib/mergeAudio';
import { uploadToR2AndGetSignedUrl, downloadFromR2 } from '@/lib/cloudflareR2';
import { supabaseAdmin } from '@/lib/supabase/serviceRoleClient';
import { getVideoIdentifier } from '@/lib/videoUtils';

console.log('[VideoService File Level] supabaseAdmin type:', typeof supabaseAdmin, ', isNull:', supabaseAdmin === null, ', isUndefined:', supabaseAdmin === undefined);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AVAILABLE_VOICES: TTSVoice[] = ['alloy', 'fable', 'onyx', 'nova', 'shimmer', 'echo'];

const execAsync = promisify(exec);

function assignVoiceToSpeaker(speakerName: string, speakerToVoiceMap: Map<string, TTSVoice>, currentVoiceIndex: number): { voice: TTSVoice, nextVoiceIndex: number } {
  if (!speakerToVoiceMap.has(speakerName)) {
    const voice = AVAILABLE_VOICES[currentVoiceIndex % AVAILABLE_VOICES.length];
    speakerToVoiceMap.set(speakerName, voice);
    return { voice, nextVoiceIndex: currentVoiceIndex + 1 };
  }
  return { voice: speakerToVoiceMap.get(speakerName)!, nextVoiceIndex: currentVoiceIndex };
}

export async function processVideoJob(jobData: VideoJobData): Promise<void> {
  const { jobId, videoUrlInput, userPersonas, speakingPace, userGuidance } = jobData;
  let transcriptSummaryFromInput = jobData.transcriptSummary;

  console.log(`[VideoService JOB ${jobId}] Starting processing. Video: ${videoUrlInput}, Personas: ${userPersonas.length}, Pace: ${speakingPace}`);

  const sourceVideoIdentifier = getVideoIdentifier(videoUrlInput);
  console.log(`[VideoService JOB ${jobId}] Source Video Identifier: ${sourceVideoIdentifier}`);

  let cachedAssets: ProcessedVideoAsset | null = null;
  if (sourceVideoIdentifier && supabaseAdmin) {
    try {
      console.log(`[VideoService JOB ${jobId}] Checking cache for identifier: ${sourceVideoIdentifier}`);
      const { data: existingAsset, error: cacheFetchError } = await supabaseAdmin
        .from('processed_video_assets')
        .select('*')
        .eq('source_video_identifier', sourceVideoIdentifier)
        .maybeSingle();

      if (cacheFetchError) {
        console.error(`[VideoService JOB ${jobId}] Error fetching cached asset:`, cacheFetchError);
      } else if (existingAsset) {
        cachedAssets = existingAsset as ProcessedVideoAsset;
        console.log(`[VideoService JOB ${jobId}] Found cached assets for ${sourceVideoIdentifier}. Last accessed: ${cachedAssets.last_accessed_at}`);
        await supabaseAdmin.from('processed_video_assets').update({ last_accessed_at: new Date().toISOString() }).eq('id', cachedAssets.id);
      }
    } catch (e) {
      console.error(`[VideoService JOB ${jobId}] Exception during cache check:`, e);
    }
  }

  if (supabaseAdmin) {
    try {
      console.log(`[VideoService JOB ${jobId}] Attempting to update history status to 'processing'.`);
      const { error: processingError } = await supabaseAdmin.from('video_history')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('job_id', jobId);
      if (processingError) {
        console.error(`[VideoService JOB ${jobId}] Supabase error updating status to 'processing':`, processingError);
      } else {
        console.log(`[VideoService JOB ${jobId}] History status successfully updated to 'processing'.`);
      }
    } catch (dbError) {
      console.error(`[VideoService JOB ${jobId}] Exception during history update to processing:`, dbError);
    }
  }

  let clippedVideoPath: string | null = null;
  let tempMergedVoiceoverPath: string | null = null;
  let finalComposedVideoPathLocal: string | null = null;
  let framePaths: string[] = [];
  const speakerToVoiceMap: Map<string, TTSVoice> = new Map();
  let nextVoiceIndex = 0;

  let audioTranscript: string | undefined = undefined;
  let visionAnalysisResult: string | undefined = undefined;
  let successfullyProcessedAndCachedNewAssets = false;
  let usedCachedClip = false;
  let audioFileForTranscriptionPath: string | null = null;

  try {
    if (cachedAssets && cachedAssets.audio_transcript && cachedAssets.frame_descriptions) {
      console.log(`[VideoService JOB ${jobId}] Using cached transcript and frame descriptions.`);
      audioTranscript = cachedAssets.audio_transcript;
      visionAnalysisResult = cachedAssets.frame_descriptions;

      if (cachedAssets.clipped_video_path_r2) {
        const localCachedClipPath = path.join(TEMP_VIDEO_DIR, `cached_clip_${jobId}_${path.basename(cachedAssets.clipped_video_path_r2)}`);
        try {
          console.log(`[VideoService JOB ${jobId}] Downloading cached clipped video from R2: ${cachedAssets.clipped_video_path_r2} to ${localCachedClipPath}`);
          await downloadFromR2(cachedAssets.clipped_video_path_r2, localCachedClipPath);
          clippedVideoPath = localCachedClipPath;
          usedCachedClip = true;
          console.log(`[VideoService JOB ${jobId}] Successfully used cached clipped video from R2.`);
          if (clippedVideoPath) {
            console.log(`[VideoService JOB ${jobId}] Sampling frames from cached (downloaded) clipped video...`);
            framePaths = await sampleFramesFromVideo(clippedVideoPath, 2);
            console.log(`[VideoService JOB ${jobId}] Sampled ${framePaths.length} frames from cached clip.`);
          }
        } catch (r2DownloadError) {
          console.error(`[VideoService JOB ${jobId}] Failed to download cached clipped video from R2. Proceeding to re-process source. Error:`, r2DownloadError);
          cachedAssets = null;
        }
      }
      if (!usedCachedClip && videoUrlInput) {
         console.log(`[VideoService JOB ${jobId}] Text assets cached, but (re)downloading/clipping source video for current composition visuals.`);
         clippedVideoPath = await downloadAndClipVideo(videoUrlInput, `source_clip_${jobId}.mp4`, 60);
         console.log(`[VideoService JOB ${jobId}] Video (re)clipped for visuals to: ${clippedVideoPath}`);
         if (clippedVideoPath) {
            console.log(`[VideoService JOB ${jobId}] Sampling frames from newly clipped video (text assets were cached)...`);
            framePaths = await sampleFramesFromVideo(clippedVideoPath, 2);
            console.log(`[VideoService JOB ${jobId}] Sampled ${framePaths.length} frames.`);
         }
      }
    } 
    
    if (!audioTranscript || !visionAnalysisResult || !usedCachedClip) {
        if (videoUrlInput) {
            console.log(`[VideoService JOB ${jobId}] No complete cache / failed cache retrieval. Processing video from source.`);
            if (!clippedVideoPath) { 
                clippedVideoPath = await downloadAndClipVideo(videoUrlInput, `source_clip_${jobId}.mp4`, 60);
                console.log(`[VideoService JOB ${jobId}] Video downloaded & clipped to: ${clippedVideoPath}`);
            }
            
            if (clippedVideoPath) {
                if (!audioTranscript) {
                    console.log(`[VideoService JOB ${jobId}] Step 1.5: Preparing audio for transcription...`);
                    audioFileForTranscriptionPath = path.join(TEMP_VIDEO_DIR, `transcribe_audio_${jobId}.mp3`);
                    try {
                        const ffmpegCompressCommand = `ffmpeg -y -i "${clippedVideoPath}" -vn -acodec libmp3lame -b:a 64k -ar 24000 -ac 1 "${audioFileForTranscriptionPath}"`;
                        console.log(`[VideoService JOB ${jobId}] Compressing audio: ${ffmpegCompressCommand}`);
                        await execAsync(ffmpegCompressCommand);
                        
                        const stats = await fsPromises.stat(audioFileForTranscriptionPath);
                        console.log(`[VideoService JOB ${jobId}] Compressed audio size for transcription: ${stats.size} bytes`);
                        if (stats.size > 25 * 1024 * 1024) {
                            console.warn(`[VideoService JOB ${jobId}] Compressed audio still too large (${stats.size} bytes), Whisper might fail.`);
                        }
                        
                        const transcriptionResponse = await openai.audio.transcriptions.create({
                            file: fs.createReadStream(audioFileForTranscriptionPath),
                            model: 'whisper-1',
                        });
                        audioTranscript = transcriptionResponse.text;
                        console.log(`[VideoService JOB ${jobId}] Audio transcribed successfully from compressed audio.`);
                        if (audioTranscript.length > 5000) {
                            console.warn(`[VideoService JOB ${jobId}] Transcript is very long (${audioTranscript.length} chars), truncating.`);
                            audioTranscript = audioTranscript.substring(0, 5000);
                        }

                    } catch (transcriptionOrCompressionError) {
                        console.error(`[VideoService JOB ${jobId}] Error during audio compression or transcription:`, transcriptionOrCompressionError);
                        audioTranscript = undefined; 
                        console.warn(`[VideoService JOB ${jobId}] Proceeding without audio transcript due to error.`);
                    } finally {
                        if (audioFileForTranscriptionPath) {
                            await fsPromises.unlink(audioFileForTranscriptionPath).catch(e => console.warn(`[Cleanup JOB ${jobId}] Error deleting temp transcribe audio: ${e.message}`));
                        }
                    }
                }
                if (!framePaths || framePaths.length === 0) {
                    console.log(`[VideoService JOB ${jobId}] Step 2: Sampling frames...`);
                    framePaths = await sampleFramesFromVideo(clippedVideoPath, 2);
                    console.log(`[VideoService JOB ${jobId}] Sampled ${framePaths.length} frames.`);
                }
                if (!visionAnalysisResult && framePaths.length > 0) {
                    console.log(`[VideoService JOB ${jobId}] Step 2.5: Analyzing ${framePaths.length} frames with vision model...`);
                    try {
                      const visionMessages: OpenAI.ChatCompletionMessageParam[] = [
                        {
                          role: 'user',
                          content: [
                            { type: "text", text: "Analyze these video frames. Provide a concise, comma-separated list of key actions, objects, or scenes depicted. Focus on elements relevant for generating commentary. Example: 'man smiles, dog jumps, logo appears'. Max 100 words total." },
                            ...await Promise.all(framePaths.map(async (framePath) => {
                              const imageBuffer = await fsPromises.readFile(framePath);
                              return { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` } };
                            }))
                          ]
                        }
                      ];
                      const visionCompletion = await openai.chat.completions.create({
                        model: "gpt-4o", messages: visionMessages, max_tokens: 150,
                      });
                      visionAnalysisResult = visionCompletion.choices[0]?.message?.content || "Vision analysis did not return content.";
                      console.log(`[VideoService JOB ${jobId}] Vision analysis completed: ${visionAnalysisResult.substring(0,100)}...`);
                    } catch (visionError) {
                      console.error(`[VideoService JOB ${jobId}] Error during vision analysis:`, visionError);
                      visionAnalysisResult = "Error occurred during frame analysis.";
                    }
                }
                
                console.log(`[VideoService JOB ${jobId}] Pre-cache save check: audioTranscript available: ${!!audioTranscript}, visionAnalysisResult available: ${!!visionAnalysisResult}, sourceVideoIdentifier: ${sourceVideoIdentifier}, supabaseAdmin available: ${!!supabaseAdmin}, !cachedAssets: ${!cachedAssets}`);
                if (visionAnalysisResult && sourceVideoIdentifier && supabaseAdmin && !cachedAssets) {
                    console.log(`[VideoService JOB ${jobId}] ENTERING cache save block. clippedVideoPath: ${clippedVideoPath}`);
                    let r2ClippedVideoPath: string | null = null;
                    let r2FramePaths: string[] = [];

                    if (clippedVideoPath) {
                        const cachedClipKey = `video_cache/${sourceVideoIdentifier}/source_clip.mp4`;
                        console.log(`[VideoService JOB ${jobId}] Attempting R2 upload for CACHED clip: ${cachedClipKey} from local: ${clippedVideoPath}`);
                        try {
                            const uploadResultUrl = await uploadToR2AndGetSignedUrl(clippedVideoPath, cachedClipKey, 'video/mp4');
                            if (uploadResultUrl) {
                                r2ClippedVideoPath = cachedClipKey; 
                                console.log(`[VideoService JOB ${jobId}] Cached clipped source video successfully uploaded to R2: ${r2ClippedVideoPath}`);
                            } else {
                                console.error(`[VideoService JOB ${jobId}] FAILED to upload clipped source video to R2 cache (uploadResultUrl is null).`);
                            }
                        } catch (r2UploadError) {
                            console.error(`[VideoService JOB ${jobId}] EXCEPTION during R2 upload for CACHED clip:`, r2UploadError);
                        }
                    } else {
                        console.warn(`[VideoService JOB ${jobId}] Skipped R2 upload for CACHED clip because clippedVideoPath is null/empty.`);
                    }

                    if (framePaths && framePaths.length > 0) {
                        console.log(`[VideoService JOB ${jobId}] Attempting R2 upload for ${framePaths.length} CACHED frames...`);
                        for (let i = 0; i < framePaths.length; i++) {
                            const framePath = framePaths[i];
                            const frameFileName = path.basename(framePath);
                            const cachedFrameKey = `video_cache/${sourceVideoIdentifier}/frames/${frameFileName}`;
                            try {
                                const frameUploadResultUrl = await uploadToR2AndGetSignedUrl(framePath, cachedFrameKey, 'image/jpeg');
                                if (frameUploadResultUrl) {
                                    r2FramePaths.push(cachedFrameKey); 
                                } else {
                                    console.warn(`[VideoService JOB ${jobId}] FAILED to upload CACHED frame ${frameFileName} to R2 cache (uploadResultUrl is null).`);
                                }
                            } catch (r2FrameUploadError) {
                                console.error(`[VideoService JOB ${jobId}] EXCEPTION during R2 upload for CACHED frame ${frameFileName}:`, r2FrameUploadError);
                            }
                        }
                        console.log(`[VideoService JOB ${jobId}] Finished R2 upload attempt for CACHED frames. Uploaded count: ${r2FramePaths.length}`);
                    } else {
                        console.warn(`[VideoService JOB ${jobId}] Skipped R2 upload for CACHED frames because framePaths is null or empty.`);
                    }

                    const newCachedAsset: Omit<ProcessedVideoAsset, 'id' | 'processed_at' | 'last_accessed_at'> = {
                        source_video_identifier: sourceVideoIdentifier,
                        clipped_video_path_r2: r2ClippedVideoPath,
                        audio_transcript: audioTranscript || null,
                        frame_paths_r2: r2FramePaths.length > 0 ? r2FramePaths : null,
                        frame_descriptions: visionAnalysisResult,
                    };
                    console.log(`[VideoService JOB ${jobId}] Attempting to save new assets to cache for ${sourceVideoIdentifier}:`, JSON.stringify(newCachedAsset, null, 2));
                    const { error: cacheSaveError } = await supabaseAdmin.from('processed_video_assets').insert(newCachedAsset);
                    if (cacheSaveError) {
                        console.error(`[VideoService JOB ${jobId}] Error saving new assets to cache:`, cacheSaveError);
                    } else {
                        console.log(`[VideoService JOB ${jobId}] Successfully saved new assets to cache.`);
                        successfullyProcessedAndCachedNewAssets = true;
                    }
                }
            } else {
                throw new Error('Video clipping failed, cannot proceed.'); 
            }
        }
    }
    
    if (!videoUrlInput && !audioTranscript && !transcriptSummaryFromInput) {
        transcriptSummaryFromInput = "Default summary: A cat is surprised by a cucumber.";
        console.log(`[VideoService JOB ${jobId}] No video, cache, or initial summary. Using default: ${transcriptSummaryFromInput}`);
    }

    const actualTranscriptSummary = audioTranscript || transcriptSummaryFromInput || "Unable to generate transcript summary.";
    const actualFrameDescriptions = visionAnalysisResult;

    console.log(`[VideoService JOB ${jobId}] Using Transcript for Prompt: ${actualTranscriptSummary.substring(0,100)}...`);
    console.log(`[VideoService JOB ${jobId}] Using Frame Descriptions for Prompt: ${actualFrameDescriptions ? actualFrameDescriptions.substring(0,100) : 'None'}...`);

    if (videoUrlInput && !clippedVideoPath) {
        console.error(`[VideoService JOB ${jobId}] ERROR: clippedVideoPath is null but was expected for video composition. This indicates a logic flaw.`);
        throw new Error('clippedVideoPath is unexpectedly null before video composition.');
    }

    console.log(`[VideoService JOB ${jobId}] Step 3: Building dialogue prompt.`);
    const promptMessages = buildDialoguePrompt(actualTranscriptSummary, userPersonas, audioTranscript, actualFrameDescriptions, userGuidance || undefined);
    
    console.log(`[VideoService JOB ${jobId}] Step 4: Generating dialogue text...`);
    const dialogueCompletion = await openai.chat.completions.create({
      model: 'gpt-4o', messages: promptMessages, max_tokens: 280, temperature: 0.7
    });
    const aiDialogueResponse = dialogueCompletion.choices[0]?.message?.content;
    if (!aiDialogueResponse) throw new Error('No response content from OpenAI (dialogue generation).');
    console.log(`[VideoService JOB ${jobId}] Dialogue text generated.`);

    console.log(`[VideoService JOB ${jobId}] Step 5: Parsing dialogue response...`);
    const dialogueLines: DialogueLine[] = parseDialogueResponse(aiDialogueResponse);

    console.log(`[VideoService JOB ${jobId}] Step 6: Generating TTS audio...`);
    const audioBuffers: Buffer[] = [];
    for (const line of dialogueLines) {
      const voiceAssignment = assignVoiceToSpeaker(line.speaker, speakerToVoiceMap, nextVoiceIndex);
      const voice = voiceAssignment.voice;
      nextVoiceIndex = voiceAssignment.nextVoiceIndex;

      console.log(`[VideoService JOB ${jobId}] TTS for ${line.speaker} with voice ${voice}, pace ${speakingPace}: "${line.text}"`);
      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1-hd', voice: voice, input: line.text, response_format: 'wav', speed: speakingPace
      });
      audioBuffers.push(Buffer.from(await ttsResponse.arrayBuffer()));
    }
    if(audioBuffers.length === 0 && dialogueLines.length > 0) throw new Error('All TTS generations failed.');

    console.log(`[VideoService JOB ${jobId}] Step 7: Merging audio buffers...`);
    if (audioBuffers.length > 0) {
      tempMergedVoiceoverPath = await mergeAudioWav(audioBuffers, `merged_voiceover_${jobId}.wav`);
    } else {
      console.warn(`[VideoService JOB ${jobId}] No audio buffers to merge, possibly no dialogue lines.`);
    }
    
    let finalVideoUrlR2: string | null = null;
    if (clippedVideoPath && tempMergedVoiceoverPath) {
      console.log(`[VideoService JOB ${jobId}] Step 8: Composing final video...`);
      const finalVideoFileName = `final_video_${jobId}.mp4`;
      finalComposedVideoPathLocal = await composeVideoWithAudio(clippedVideoPath, tempMergedVoiceoverPath, finalVideoFileName);
      
      console.log(`[VideoService JOB ${jobId}] Step 9: Uploading to R2...`);
      if (finalComposedVideoPathLocal) { 
        finalVideoUrlR2 = await uploadToR2AndGetSignedUrl(finalComposedVideoPathLocal, path.basename(finalComposedVideoPathLocal), 'video/mp4');
        if (!finalVideoUrlR2) console.error(`[VideoService JOB ${jobId}] Failed to upload to R2 or R2 not configured. Video remains local at ${finalComposedVideoPathLocal}`);
      } else {
        throw new Error('No local composed video file to upload.');
      }
    } else if (videoUrlInput && dialogueLines.length > 0) {
        console.warn(`[VideoService JOB ${jobId}] Video processing did not yield a voiceover or clipped video, cannot compose.`);
    }

    console.log(`[VideoService JOB ${jobId}] Processing finished. Final R2 URL: ${finalVideoUrlR2}`);

    let supabaseThumbnailUrl: string | null = null;
    if (finalVideoUrlR2 && framePaths.length > 0 && supabaseAdmin) {
      const firstFramePath = framePaths[0];
      const thumbnailFileName = `thumbnail_${uuidv4()}.jpg`;
      try {
        console.log(`[VideoService JOB ${jobId}] Uploading thumbnail to Supabase Storage...`);
        const imageBuffer = await fsPromises.readFile(firstFramePath);
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('historythumbnails')
          .upload(thumbnailFileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
          console.error(`[VideoService JOB ${jobId}] Supabase thumbnail upload error:`, uploadError);
        } else if (uploadData) {
          const { data: urlData } = supabaseAdmin.storage.from('historythumbnails').getPublicUrl(thumbnailFileName);
          supabaseThumbnailUrl = urlData.publicUrl;
          console.log(`[VideoService JOB ${jobId}] Thumbnail uploaded to Supabase: ${supabaseThumbnailUrl}`);
        }
      } catch (thumbError) {
         console.error(`[VideoService JOB ${jobId}] Error during thumbnail processing:`, thumbError);
      }
    }
    
    if (supabaseAdmin) {
        console.log(`[VideoService JOB ${jobId}] Preparing to update Supabase video_history table with final data...`);
        console.log(`[VideoService JOB ${jobId}] Data for history update:`, JSON.stringify({
            video_r2_url: finalVideoUrlR2,
            thumbnail_url: supabaseThumbnailUrl,
            source_video_url: videoUrlInput,
            num_speakers: userPersonas.length,
            personas: userPersonas,
            transcript_summary: actualTranscriptSummary,
            user_guidance: userGuidance,
            speaking_pace: speakingPace,
            status: finalVideoUrlR2 ? 'completed' : 'failed',
            error_message: finalVideoUrlR2 ? null : "Video generation failed or R2 upload issue.",
            updated_at: new Date().toISOString(),
        }, null, 2));

        const historyDataToUpsert = {
            video_r2_url: finalVideoUrlR2,
            thumbnail_url: supabaseThumbnailUrl,
            source_video_url: videoUrlInput,
            num_speakers: userPersonas.length,
            personas: userPersonas,
            transcript_summary: actualTranscriptSummary,
            user_guidance: userGuidance,
            speaking_pace: speakingPace,
            status: finalVideoUrlR2 ? 'completed' : 'failed',
            error_message: finalVideoUrlR2 ? null : "Video generation failed or R2 upload issue.",
            updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabaseAdmin
            .from('video_history')
            .update(historyDataToUpsert) 
            .eq('job_id', jobId);

        if (upsertError) {
            console.error(`[VideoService JOB ${jobId}] Supabase video_history final update error:`, upsertError);
        } else {
            console.log(`[VideoService JOB ${jobId}] Video history successfully updated for job.`);
        }
    } else {
        console.warn(`[VideoService JOB ${jobId}] Supabase admin client not available. Skipping history logging.`);
    }

  } catch (error) {
    console.error(`[VideoService JOB ${jobId}] Error during job processing:`, error);
    if (supabaseAdmin) {
        try {
            console.log(`[VideoService JOB ${jobId}] Attempting to mark job as failed in history. Error:`, error instanceof Error ? error.message : String(error));
            const { error: failUpdateError } = await supabaseAdmin.from('video_history').update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : String(error),
                updated_at: new Date().toISOString(), 
            }).eq('job_id', jobId);
            if (failUpdateError) {
                console.error(`[VideoService JOB ${jobId}] Supabase error marking job as failed:`, failUpdateError);
            } else {
                console.log(`[VideoService JOB ${jobId}] Job successfully marked as failed in history.`);
            }
        } catch (dbError) {
            console.error(`[VideoService JOB ${jobId}] Exception when trying to mark job as failed in history:`, dbError);
        }
    }
    throw error;
  } finally {
    console.log(`[VideoService JOB ${jobId}] Starting cleanup of temporary files...`);
    if (clippedVideoPath) await fsPromises.unlink(clippedVideoPath).catch(e => console.warn(`[Cleanup JOB ${jobId}] ${e.message}`));
    if (tempMergedVoiceoverPath) await fsPromises.unlink(tempMergedVoiceoverPath).catch(e => console.warn(`[Cleanup JOB ${jobId}] ${e.message}`));
    if (finalComposedVideoPathLocal) await fsPromises.unlink(finalComposedVideoPathLocal).catch(e => console.warn(`[Cleanup JOB ${jobId}] ${e.message}`));
    if (framePaths.length > 0 && framePaths[0]) {
      const framesDir = path.dirname(framePaths[0]);
      if (framesDir && framesDir !== '.' && framesDir !== '/') { 
        await fsPromises.rm(framesDir, { recursive: true, force: true }).catch(e => console.warn(`[Cleanup JOB ${jobId}] Failed to delete frames directory ${framesDir}: ${e.message}`));
      }
    }
    if (usedCachedClip && clippedVideoPath) {
      await fsPromises.unlink(clippedVideoPath).catch(e => console.warn(`[Cleanup JOB ${jobId}] ${e.message}`));
    }
    if (audioFileForTranscriptionPath) {
        await fsPromises.unlink(audioFileForTranscriptionPath).catch(e => console.warn(`[Cleanup JOB ${jobId}] Error deleting temp transcribe audio: ${e.message}`));
    }
    console.log(`[VideoService JOB ${jobId}] Cleanup finished.`);
  }
} 