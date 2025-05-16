import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const TEMP_VIDEO_DIR = path.join(process.cwd(), 'temp_video'); // Export for use elsewhere

async function ensureTempDirExists() {
  try {
    await fs.mkdir(TEMP_VIDEO_DIR, { recursive: true });
  } catch (error) {
    console.error(`[videoProcessor] Error creating temp directory ${TEMP_VIDEO_DIR}:`, error);
    throw new Error('Failed to create temporary video directory.');
  }
}

/**
 * Downloads a video from a given URL using yt-dlp and clips it to a specified duration.
 * @param videoUrl The URL of the video to download.
 * @param outputFileName The desired name for the downloaded and clipped video file.
 * @param maxDurationSeconds The maximum duration of the clip in seconds (default 60s, as per recent change).
 * @param startTimeSeconds The start time for the clip in seconds (default 0).
 * @returns Path to the clipped video file.
 */
export async function downloadAndClipVideo(
  videoUrl: string,
  outputFileName: string,
  maxDurationSeconds: number = 60, // Default to 60s as per recent change
  startTimeSeconds: number = 0
): Promise<string> {
  await ensureTempDirExists();
  const uniqueId = Date.now(); // For unique temporary filenames
  const downloadedVideoPath = path.join(TEMP_VIDEO_DIR, `downloaded_video_temp_${uniqueId}.mp4`);
  const clippedVideoPath = path.join(TEMP_VIDEO_DIR, outputFileName);

  // yt-dlp command: prioritize mp4, try to get best video and audio combined
  // Using -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b" for flexibility
  // Adding --no-part to potentially avoid issues with .part files if that was a problem
  // Adding --verbose for detailed logging
  const downloadCommand = [
    'yt-dlp',
    '--verbose',
    '--no-playlist',
    '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', // Best MP4 video with M4A audio, or best MP4, or best overall
    '--merge-output-format', 'mp4', // Ensure output is merged to mp4 if separate streams are downloaded
    '--no-part', // Avoid .part files, download directly to final temp name
    '-o', `"${downloadedVideoPath}"`, 
    `"${videoUrl}"`
  ].join(' ');

  console.log(`[videoProcessor] Executing download command: ${downloadCommand}`);
  try {
    // Ensure no leftover file from a previous attempt with the same unique name (unlikely but good practice)
    await fs.unlink(downloadedVideoPath).catch(() => {}); 
    await fs.unlink(clippedVideoPath).catch(() => {});

    const { stdout: dlStdout, stderr: dlStderr } = await execAsync(downloadCommand);
    console.log('[videoProcessor] yt-dlp download stdout:', dlStdout);
    if (dlStderr) console.warn('[videoProcessor] yt-dlp download stderr:', dlStderr); // yt-dlp can output a lot to stderr

    // Check if the specific expected file exists
    try {
      await fs.access(downloadedVideoPath, fs.constants.F_OK);
      console.log('[videoProcessor] Confirmed downloaded video exists at:', downloadedVideoPath);
    } catch (e) {
      console.error('[videoProcessor] fs.access check failed for downloaded video:', downloadedVideoPath);
      const filesInTempDir = await fs.readdir(TEMP_VIDEO_DIR).catch(readErr => { console.error("Error reading TEMP_VIDEO_DIR for debug:", readErr); return []; });
      console.log(`[videoProcessor] Contents of ${TEMP_VIDEO_DIR} after yt-dlp:`, filesInTempDir);
      // Include yt-dlp stderr in the error message if available and relevant
      const errorMessage = dlStderr ? `Downloaded video file ${downloadedVideoPath} not found. yt-dlp stderr: ${dlStderr}` : `Downloaded video file ${downloadedVideoPath} not found.`;
      throw new Error(errorMessage);
    }
    
    // Now clip using ffmpeg. The downloaded file should be MP4 if yt-dlp succeeded with merge-output-format.
    // Using -c:v copy and -c:a copy for faster clipping if no re-encoding is needed.
    // If the source isn't perfectly seekable, -c copy might have issues with -ss.
    // A safer (but slower) approach would be to re-encode: -c:v libx264 -c:a aac
    const ffmpegClipCommand = [
      'ffmpeg',
      '-y', // Overwrite output
      '-ss', startTimeSeconds.toString(), // Seek to start time
      '-i', `"${downloadedVideoPath}"`,   // Input downloaded video
      '-t', maxDurationSeconds.toString(),// Duration of the clip
      // '-c', 'copy', // Try to copy codecs first for speed
      // If copy fails or causes issues, re-encode:
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // Good for speed, adjust for quality if needed
      '-c:a', 'aac',
      '-b:a', '192k',
      `"${clippedVideoPath}"`
    ].join(' ');

    console.log(`[videoProcessor] Executing ffmpeg clip command: ${ffmpegClipCommand}`);
    const { stdout: clipStdout, stderr: clipStderr } = await execAsync(ffmpegClipCommand);
    console.log('[videoProcessor] ffmpeg clip stdout:', clipStdout);
    if (clipStderr) console.warn('[videoProcessor] ffmpeg clip stderr:', clipStderr);
    
    // Clean up the full downloaded (unclipped) video
    await fs.unlink(downloadedVideoPath).catch(e => console.warn(`Could not delete full download: ${downloadedVideoPath}`, e));

    console.log(`[videoProcessor] Video downloaded and clipped successfully to: ${clippedVideoPath}`);
    return clippedVideoPath;

  } catch (error) {
    console.error('[videoProcessor] Error during video download/clip:', error);
    // Attempt to clean up any potential leftover files
    await fs.unlink(downloadedVideoPath).catch(() => {}); 
    await fs.unlink(clippedVideoPath).catch(() => {});
    throw error; // Re-throw the error to be handled by the API route
  }
}

/**
 * Samples frames from a video file at a given interval using ffmpeg.
 * @param inputVideoPath Path to the input video file.
 * @param frameSampleIntervalSeconds Interval in seconds at which to sample frames (e.g., 5 for one frame every 5 seconds).
 * @returns A promise that resolves to an array of paths to the sampled frame image files (JPEGs).
 */
export async function sampleFramesFromVideo(
  inputVideoPath: string,
  frameSampleIntervalSeconds: number = 5
): Promise<string[]> {
  await ensureTempDirExists(); // Ensures TEMP_VIDEO_DIR exists
  const framesOutputDir = path.join(TEMP_VIDEO_DIR, 'frames');
  try {
    await fs.mkdir(framesOutputDir, { recursive: true });
  } catch (mkdirError) {
    console.error(`[videoProcessor] Error creating frames directory ${framesOutputDir}:`, mkdirError);
    throw new Error('Failed to create temporary frames directory.');
  }

  // ffmpeg command to extract frames
  // -vf fps=1/<interval> -> sets the frame rate for outputting frames
  // %04d in output filename creates a sequence like frame_0001.jpg, frame_0002.jpg
  const frameOutputPattern = path.join(framesOutputDir, 'frame_%04d.jpg');
  const ffmpegFrameSampleCommand = [
    'ffmpeg',
    '-y',
    '-i', `"${inputVideoPath}"`,
    '-vf', `fps=1/${frameSampleIntervalSeconds}`,
    '-qscale:v', '2', // Good quality for JPEGs
    `"${frameOutputPattern}"`
  ].join(' ');

  console.log(`[videoProcessor] Executing ffmpeg frame sampling command: ${ffmpegFrameSampleCommand}`);
  try {
    const { stdout, stderr } = await execAsync(ffmpegFrameSampleCommand);
    console.log('[videoProcessor] ffmpeg frame sample stdout:', stdout);
    if (stderr) console.warn('[videoProcessor] ffmpeg frame sample stderr:', stderr);

    // List the generated frame files
    const sampledFrameFiles = (await fs.readdir(framesOutputDir))
      .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
      .map(file => path.join(framesOutputDir, file))
      .sort(); // Sort them to ensure chronological order

    if (sampledFrameFiles.length === 0) {
      console.warn('[videoProcessor] No frames were sampled. Check ffmpeg command and video duration.');
    }

    console.log(`[videoProcessor] Sampled ${sampledFrameFiles.length} frames to ${framesOutputDir}`);
    return sampledFrameFiles;

  } catch (error) {
    console.error('[videoProcessor] Error during frame sampling:', error);
    throw error;
  }
  // Note: We are not cleaning up the framesOutputDir or its contents here.
  // This might be done later, after the frames have been used by the vision model.
}

/**
 * Composes a video by taking an input video, muting its original audio,
 * overlaying a new voiceover audio, and ensuring the final video length
 * matches the duration of the voiceover audio.
 * @param inputVideoPath Path to the video file (e.g., the clipped source video).
 * @param voiceoverAudioPath Path to the voiceover audio file (e.g., merged AI dialogue WAV).
 * @param outputFileName The desired name for the final composed MP4 video.
 * @returns A promise that resolves to the path of the composed MP4 video file.
 */
export async function composeVideoWithAudio(
  inputVideoPath: string,
  voiceoverAudioPath: string,
  outputFileName: string
): Promise<string> {
  await ensureTempDirExists(); // Ensures TEMP_VIDEO_DIR exists
  const finalVideoPath = path.join(TEMP_VIDEO_DIR, outputFileName);

  try {
    // First, get the duration of the voiceover audio. This will determine the final video length.
    const ffprobeDurationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voiceoverAudioPath}"`;
    console.log(`[videoProcessor] Executing ffprobe to get audio duration: ${ffprobeDurationCommand}`);
    let audioDurationSecondsStr;
    try {
      const { stdout } = await execAsync(ffprobeDurationCommand);
      audioDurationSecondsStr = stdout.trim();
      if (!audioDurationSecondsStr || isNaN(parseFloat(audioDurationSecondsStr))) {
        throw new Error('ffprobe did not return a valid duration.');
      }
      console.log(`[videoProcessor] Voiceover audio duration: ${audioDurationSecondsStr} seconds`);
    } catch (ffprobeError) {
      console.error('[videoProcessor] Error getting voiceover audio duration with ffprobe:', ffprobeError);
      throw new Error('Failed to determine voiceover audio duration.');
    }
    const targetDuration = parseFloat(audioDurationSecondsStr);

    // Construct the ffmpeg command for composition
    // -i video -i audio            -> specify inputs
    // -map 0:v:0                   -> take video stream from first input (video)
    // -map 1:a:0                   -> take audio stream from second input (voiceover)
    // -c:v copy                    -> copy video codec if possible (faster), or use libx264
    // -c:a aac                     -> encode audio to AAC (common for MP4)
    // -an                          -> when applied to an input, it mutes that input's audio. We apply it to original video.
    // -shortest                    -> finishes encoding when the shortest input stream ends (deprecated, use -t)
    // -t <duration>                -> set the duration of the output file
    // Using filter_complex for more control: mute video, then overlay audio
    const ffmpegComposeCommand = [
      'ffmpeg',
      '-y', // Overwrite output files without asking
      '-i', `"${inputVideoPath}"`,       // Input 0: original video
      '-i', `"${voiceoverAudioPath}"`,   // Input 1: voiceover audio
      '-filter_complex', '[0:a]an[video_muted_audio]; [video_muted_audio][1:a]amix=inputs=2:duration=shortest[mixed_audio]', // This is an example if we wanted to mix, but we want to replace
                                        // Simpler: mute original video's audio directly with -map -0:a or ensure it's not mapped.
      '-map', '0:v:0',                  // Select video from input 0
      '-map', '1:a:0',                  // Select audio from input 1 (the voiceover)
      '-c:v', 'libx264',              // Re-encode video to ensure compatibility & apply filters if any
      '-preset', 'ultrafast',          // Faster encoding for dev, can be changed for quality
      '-c:a', 'aac',                  // Standard audio codec for MP4
      '-b:a', '192k',                 // Audio bitrate
      '-t', targetDuration.toString(),// Set output duration to voiceover length
      `"${finalVideoPath}"`
    ].join(' ');
    
    // Simpler command: Mute original video and use new audio, trim to audio length.
    // This command directly maps the video from the first input and audio from the second input.
    // The -an on the first input isn't strictly needed if we only map audio from the second.
    // However, to be explicit about muting original audio if it exists: -map 0:v -map 1:a -map -0:a (complex)
    // Easiest might be to just not map original audio: -map 0:v -map 1:a
    const simplerFfmpegCommand = [
        'ffmpeg',
        '-y',
        '-i', `"${inputVideoPath}"`,       // Video input
        '-i', `"${voiceoverAudioPath}"`,   // Audio input
        '-map', '0:v:0',                  // Use video from first input
        '-map', '1:a:0',                  // Use audio from second input
        '-c:v', 'libx264',              // Video codec
        '-c:a', 'aac',                  // Audio codec
        '-shortest',                   // Ensures output duration is that of the shortest input (audio or video after -ss on video)
                                        // This might not be needed if -t on video source clip and -t here is set to audio duration
        // '-t', targetDuration.toString(), // Explicitly set duration based on audio, safer
        `"${finalVideoPath}"`
    ].join(' ').replace('-shortest', `-t ${targetDuration.toString()}`); // Replace -shortest with explicit duration


    console.log(`[videoProcessor] Executing ffmpeg compose command: ${simplerFfmpegCommand}`);
    const { stdout, stderr } = await execAsync(simplerFfmpegCommand);
    console.log('[videoProcessor] ffmpeg compose stdout:', stdout);
    if (stderr) console.warn('[videoProcessor] ffmpeg compose stderr:', stderr);

    console.log(`[videoProcessor] Video composed successfully to: ${finalVideoPath}`);
    return finalVideoPath;

  } catch (error) {
    console.error('[videoProcessor] Error during video composition:', error);
    throw error;
  }
}

/**
 * Extracts audio from a video file and saves it as an MP3 file.
 * @param inputVideoPath Path to the input video file.
 * @param outputAudioFileName The desired name for the extracted audio file (e.g., 'extracted_audio.mp3').
 * @returns A promise that resolves to the path of the extracted MP3 audio file.
 */
export async function extractAudioFromVideo(
  inputVideoPath: string,
  outputAudioFileName: string
): Promise<string> {
  await ensureTempDirExists(); // Ensures TEMP_VIDEO_DIR or a shared temp dir exists
  const outputAudioPath = path.join(TEMP_VIDEO_DIR, outputAudioFileName);

  // ffmpeg command to extract audio and convert to MP3
  // -vn: no video output
  // -ar 44100: standard audio sample rate
  // -ac 2: stereo audio channels (Whisper can handle mono too)
  // -b:a 192k: audio bitrate for MP3
  const ffmpegExtractAudioCommand = [
    'ffmpeg',
    '-y', // Overwrite output file if it exists
    '-i', `"${inputVideoPath}"`,
    '-vn', // No video output
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '192k',
    `"${outputAudioPath}"`
  ].join(' ');

  console.log(`[videoProcessor] Executing ffmpeg audio extraction command: ${ffmpegExtractAudioCommand}`);
  try {
    const { stdout, stderr } = await execAsync(ffmpegExtractAudioCommand);
    console.log('[videoProcessor] ffmpeg audio extraction stdout:', stdout);
    if (stderr && !stderr.toLowerCase().includes('built on') && !stderr.toLowerCase().includes('configuration:')) {
      // Filter out common non-error ffmpeg info from stderr
       const relevantStderr = stderr.split('\n').filter(line => 
            !line.startsWith('ffmpeg version') && 
            !line.startsWith('  built with') && 
            !line.startsWith('  configuration:') && 
            !line.includes('hyper fast Audio FFmpeg encoder') && // Example of specific non-error messages
            !line.includes('Output #0, mp3') && 
            !line.includes('Stream #0:0 -> #0:0')
        ).join('\n');
        if (relevantStderr.trim().length > 0) {
            console.warn(`[videoProcessor] ffmpeg audio extraction stderr: ${relevantStderr}`);
        }
    }
    console.log(`[videoProcessor] Audio extracted successfully to: ${outputAudioPath}`);
    return outputAudioPath;
  } catch (error) {
    console.error('[videoProcessor] Error during audio extraction:', error);
    throw error;
  }
}

// Example usage (for testing - can be removed)
/*
(async () => {
  try {
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Replace with a test video
    const outputPath = await downloadAndClipVideo(videoUrl, 'rick_roll_clip.mp4', 10);
    console.log('Clipped video at:', outputPath);
  } catch (e) {
    console.error('Test failed:', e);
  }
})();
*/ 