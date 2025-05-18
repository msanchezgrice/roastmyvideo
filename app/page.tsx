'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Persona {
  name: string;
  description: string;
  backstory: string | null;
  tags: string[] | null;
}

// Define any constants needed
const PREDEFINED_PERSONAS: Persona[] = [];

export default function HomePage() {
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<any[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [finalVideoR2Url, setFinalVideoR2Url] = useState<string | null>(null);
  const [generatedSummaryInfo, setGeneratedSummaryInfo] = useState<string | null>(null);
  const [numberOfSpeakers, setNumberOfSpeakers] = useState(2);
  const [personaNames, setPersonaNames] = useState<string[]>(['', '']);
  const [personaDescriptions, setPersonaDescriptions] = useState<string[]>(['', '']);
  const [personaBackstories, setPersonaBackstories] = useState<string[]>(['', '']);
  const [speakingPace, setSpeakingPace] = useState(1.0);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);

  const handleGenerate = async () => {
    console.log('[page.tsx] handleGenerate called with video URL:', videoUrlInput);
    setIsLoading(true);
    setError(null);
    setDialogue([]);
    setAudioUrl(null);
    setFinalVideoR2Url(null);
    setGeneratedSummaryInfo(null);

    // Construct activePersonas from the current state arrays
    const activePersonas: Persona[] = [];
    for (let i = 0; i < numberOfSpeakers; i++) {
      const name = personaNames[i] || `Speaker ${i + 1}`;
      const description = personaDescriptions[i] || 'A general commentator.';
      const backstory = personaBackstories[i] || null;
      
      // Try to find if this current speaker configuration matches a predefined or custom template to get tags
      let tags: string[] | null = [];
      const currentSpeakerDesc = personaDescriptions[i]; // Use the actual description from state
      const currentSpeakerName = personaNames[i];

      let matchedTemplate = PREDEFINED_PERSONAS.find(p => p.name === currentSpeakerName && p.description === currentSpeakerDesc);
      if (!matchedTemplate) {
        matchedTemplate = customPersonas.find(p => p.name === currentSpeakerName && p.description === currentSpeakerDesc);
      }
      tags = matchedTemplate?.tags || [];

      activePersonas.push({
        name,
        description,
        backstory,
        tags,
      });
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcriptSummary: transcript, 
          videoUrl: videoUrlInput,
          personas: activePersonas, 
          speakingPace: speakingPace 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[page.tsx] API response data:', data);
      
      setDialogue(data.dialogue || []);
      if (data.audioUrl) {
        setAudioUrl(`${data.audioUrl}?t=${new Date().getTime()}`);
      }
      if (data.finalVideoUrl) { 
        setFinalVideoR2Url(data.finalVideoUrl);
      }
      if (data.generatedSummary) {
        setGeneratedSummaryInfo(`AI Generated Summary: ${data.generatedSummary}`);
      }
      if (!data.finalVideoUrl && !data.audioUrl && !data.error && !data.generatedSummary && videoUrlInput) {
        setError("Processing finished but no video, audio, or summary was returned, despite video input.");
      }

    } catch (err) {
      if (err instanceof Error) {
        console.error('[page.tsx] Error in handleGenerate:', err.message, err.stack);
        setError(err.message);
      } else {
        console.error('[page.tsx] Unknown error in handleGenerate:', err);
        setError('An unknown error occurred during generation.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Doodad.AI</h1>
      <div>
        <Link href="/doodad">
          <span className="text-blue-500 hover:underline">Go to main application</span>
        </Link>
      </div>
    </div>
  );
} 