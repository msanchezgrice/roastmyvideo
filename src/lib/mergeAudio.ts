import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Merges multiple WAV audio buffers into a single WAV file using ffmpeg's concat demuxer.
 * @param audioBuffers An array of Buffers, each containing WAV audio data.
 * @param outputFileName The desired name for the merged output WAV file (e.g., 'merged_output.wav').
 * @returns A Promise that resolves with the path to the merged WAV file, or rejects on error.
 */
export async function mergeAudioWav(audioBuffers: Buffer[], outputFileName: string): Promise<string> {
  if (audioBuffers.length === 0) {
    throw new Error('No audio buffers provided to merge.');
  }

  // Create a temporary directory to store individual WAV files
  // Using /tmp or a dedicated directory within the app (ensure it's writable)
  const tempDir = path.join(process.cwd(), 'temp_audio'); // For Vercel/serverless, /tmp is better
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (mkdirError) {
    console.error(`Failed to create temp directory ${tempDir}:`, mkdirError);
    throw new Error(`Failed to create temp directory ${tempDir}. Check permissions and path.`);
  }
  
  const tempFilePaths: string[] = [];
  const fileListPath = path.join(tempDir, 'filelist.txt');

  try {
    // Write each buffer to a temporary WAV file
    for (let i = 0; i < audioBuffers.length; i++) {
      const tempFilePath = path.join(tempDir, `audio_${i}.wav`);
      await fs.writeFile(tempFilePath, audioBuffers[i]);
      tempFilePaths.push(tempFilePath);
    }

    // Create the filelist.txt for ffmpeg concat demuxer
    // It needs lines in the format: file '/path/to/file.wav'
    const fileListContent = tempFilePaths.map(fp => `file '${fp.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(fileListPath, fileListContent);

    const outputPath = path.join(tempDir, outputFileName);

    // Construct and execute the ffmpeg command
    // Using -safe 0 for the concat demuxer is often needed if paths are absolute or complex,
    // but ensure your paths are properly sanitized if constructing them from user input (not the case here).
    const ffmpegCommand = `ffmpeg -y -f concat -safe 0 -i "${fileListPath.replace(/\\/g, '/')}" -c copy "${outputPath.replace(/\\/g, '/')}"`;
    
    console.log(`[mergeAudioWav] Executing ffmpeg command: ${ffmpegCommand}`);
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    
    if (stderr && !stderr.toLowerCase().includes('built on') && !stderr.toLowerCase().includes('configuration:')) {
        // ffmpeg often outputs build info to stderr, which is not an error.
        // Filter for actual error messages.
        const relevantStderr = stderr.split('\n').filter(line => !line.startsWith('ffmpeg version') && !line.startsWith('  built with') && !line.startsWith('  configuration:') && !line.startsWith('  libavutil') && !line.startsWith('  libavcodec') && !line.startsWith('  libavformat') && !line.startsWith('  libavdevice') && !line.startsWith('  libavfilter') && !line.startsWith('  libswscale') && !line.startsWith('  libswresample') && !line.startsWith('  libpostproc')).join('\n');
        if (relevantStderr.trim().length > 0) {
            console.warn(`[mergeAudioWav] ffmpeg stderr: ${stderr}`);
            // Depending on the strictness, you might throw an error here
        }
    }
    console.log(`[mergeAudioWav] ffmpeg stdout: ${stdout}`);
    console.log(`[mergeAudioWav] Merged audio successfully to: ${outputPath}`);
    
    return outputPath;

  } catch (error) {
    console.error('[mergeAudioWav] Error during audio merging:', error);
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    // Clean up temporary files (filelist.txt and individual audio_x.wav files)
    // The merged output file (outputPath) is NOT deleted here.
    try {
      await fs.unlink(fileListPath).catch(e => console.warn(`Could not delete filelist: ${fileListPath}`, e));
      for (const tempFilePath of tempFilePaths) {
        await fs.unlink(tempFilePath).catch(e => console.warn(`Could not delete temp file: ${tempFilePath}`, e));
      }
      // Optionally remove the tempDir if it's empty and you created it specifically for this run,
      // but be careful if it's a shared temp location.
      // For simplicity, not removing tempDir itself here, just its contents.
    } catch (cleanupError) {
      console.warn('[mergeAudioWav] Error during cleanup of temporary files:', cleanupError);
    }
  }
} 