'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const AVAILABLE_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type TTSVoiceType = typeof AVAILABLE_TTS_VOICES[number];

interface CustomPersona {
  id: string;
  created_at?: string;
  name: string;
  style: string | null;
  constraints: string | null;
  voice_preference: TTSVoiceType | null;
  backstory: string | null;
  tags: string[] | null;
  is_public: boolean;
}

// Add SortOption type
const SORT_OPTIONS = {
  NAME_ASC: 'Name (A-Z)',
  NAME_DESC: 'Name (Z-A)',
  DATE_ASC: 'Date Created (Oldest)',
  DATE_DESC: 'Date Created (Newest)',
} as const;
type SortOptionKey = keyof typeof SORT_OPTIONS;

export default function PublicPersonasPage() {
  const [personas, setPersonas] = useState<CustomPersona[]>([]);
  const [displayedPersonas, setDisplayedPersonas] = useState<CustomPersona[]>([]);
  const [currentSort, setCurrentSort] = useState<SortOptionKey>('DATE_DESC');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  async function fetchPublicPersonas() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/personas?public=true');
      if (!response.ok) {
        let errorDetails = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || errorDetails;
        } catch (e) {
          // If response is not JSON, try to get text
          const responseText = await response.text().catch(() => 'Could not read response body.');
          errorDetails = `${errorDetails}. Response body: ${responseText.substring(0, 500)}`;
        }
        throw new Error(errorDetails);
      }
      const data = await response.json();
      setPersonas(data.personas || []);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred while fetching personas.');
      console.error('[PublicPersonasPage] Error fetching personas:', err);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchPublicPersonas();
  }, []);

  // Effect to sort personas when allPersonas or currentSort changes
  useEffect(() => {
    let sorted = [...personas];
    switch (currentSort) {
      case 'NAME_ASC':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'NAME_DESC':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'DATE_ASC':
        sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'DATE_DESC':
      default:
        sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
    }
    setDisplayedPersonas(sorted);
  }, [personas, currentSort]);

  const playVoicePreview = async (voice: TTSVoiceType | null, text?: string) => {
    if (!voice) {
      setAudioError('No voice selected to preview.');
      return;
    }
    setAudioError(null);
    setPreviewingAudio(null); // Clear previous audio if any

    try {
      const response = await fetch('/api/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, text: text || `Hello, I am voice ${voice}.` }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate TTS preview.');
      }
      setPreviewingAudio(result.audioUrl);
    } catch (err) {
      setAudioError((err as Error).message);
    }
  };

  // Add an effect to play the audio when previewingAudio URL changes
  useEffect(() => {
    if (previewingAudio) {
      const audio = new Audio(previewingAudio);
      audio.play().catch(e => {
        console.error("Error playing audio preview:", e);
        setAudioError("Could not play audio. Make sure your browser allows autoplay or click again.");
      });
    }
  }, [previewingAudio]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 space-y-6 bg-gray-900 text-white">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-400">Public Characters</h1>
          <div className="flex space-x-4">
            <Link href="/generator" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
              Generator
            </Link>
            <Link href="/personas" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
              My Characters
            </Link>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <div className="w-full sm:w-auto">
            <label htmlFor="sortPersonas" className="sr-only">Sort Characters</label>
            <select 
              id="sortPersonas"
              value={currentSort}
              onChange={(e) => setCurrentSort(e.target.value as SortOptionKey)}
              className="p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto"
            >
              {Object.entries(SORT_OPTIONS).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        {audioError && <p className="text-sm text-red-400 my-2">Audio Error: {audioError}</p>}

        {isLoading && <p className="text-center text-gray-400">Loading characters...</p>}
        {error && <div className="w-full p-4 my-4 text-sm text-red-200 bg-red-700 bg-opacity-50 rounded-lg shadow-lg"><p className="font-bold">Error:</p><p>{error}</p></div>}
        {!isLoading && !error && displayedPersonas.length === 0 && (
          <p className="text-center text-gray-500">No public characters available yet.</p>
        )}

        {!isLoading && !error && displayedPersonas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedPersonas.map(p => (
              <div key={p.id} className="p-4 bg-gray-800 rounded-lg shadow-lg flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-300 mb-1 break-words">{p.name}</h3>
                  {p.style && (
                    <p className="text-sm text-gray-400 mt-1 italic mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={p.style}>
                      <span className="font-semibold text-gray-300">Style:</span> {p.style}
                    </p>
                  )}
                  {p.constraints && (
                    <p className="text-xs text-gray-500 mt-1 mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={p.constraints}>
                      <span className="font-semibold text-gray-400">Constraints:</span> {p.constraints}
                    </p>
                  )}
                  {p.backstory && (
                    <p className="text-xs text-gray-500 mt-1 mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={p.backstory}>
                      <span className="font-semibold text-gray-400">Backstory:</span> {p.backstory}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Voice: {p.voice_preference || 'Not set'}
                    {p.voice_preference && (
                      <button 
                        onClick={() => playVoicePreview(p.voice_preference, `This is the voice of ${p.name}.`)}
                        className="ml-2 text-xs px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded-sm"
                      >
                        ▶ Play
                      </button>
                    )}
                  </p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {p.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-sky-700 text-sky-100 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {p.tags.length > 5 && <span className="text-xs text-gray-500">+{p.tags.length - 5} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 mt-auto pt-2 border-t border-gray-700">
                  <Link 
                    href={`/generator?persona=${encodeURIComponent(JSON.stringify({
                      name: p.name,
                      style: p.style,
                      constraints: p.constraints,
                      backstory: p.backstory,
                      voice_preference: p.voice_preference
                    }))}`}
                    className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded w-full text-center"
                  >
                    Use in Generator
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 