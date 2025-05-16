import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fsPromises from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Should match your TTSVoiceType or the actual voices supported by OpenAI
const VALID_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type TTSVoice = typeof VALID_TTS_VOICES[number];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const voice = body.voice as TTSVoice;
    const text = body.text || "Hello, this is a voice preview."; // Default sample text

    if (!voice || !VALID_TTS_VOICES.includes(voice)) {
      return NextResponse.json({ error: 'Invalid voice selected.' }, { status: 400 });
    }
    if (typeof text !== 'string' || text.length > 200) { // Simple validation
        return NextResponse.json({ error: 'Invalid text for preview (max 200 chars).' }, { status: 400 });
    }

    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice,
      input: text,
      response_format: 'wav',
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    
    // Save to a public temporary file (overwrites on each request)
    const publicDir = path.join(process.cwd(), 'public');
    const previewFilePath = path.join(publicDir, 'tts_preview.wav');
    await fsPromises.mkdir(publicDir, { recursive: true });
    await fsPromises.writeFile(previewFilePath, audioBuffer);

    // Return a URL that the client can use to fetch this audio
    // Add a timestamp to try and avoid browser caching issues
    const audioUrl = `/tts_preview.wav?t=${Date.now()}`;

    return NextResponse.json({ audioUrl });

  } catch (error) {
    console.error('[API /api/tts-preview] Error:', error);
    let message = 'Failed to generate TTS preview';
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 