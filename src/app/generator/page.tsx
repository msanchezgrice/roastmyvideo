'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Assuming these types are correctly defined in or imported from '@/types'
// If not, define them locally or ensure your types.ts is up to date.
// For safety, I'll include local definitions that match our expectations.

interface DialogueLine {
  speaker: string;
  text: string;
}

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface Persona {
  name: string;
  style?: string | null;
  constraints?: string | null;
  backstory?: string | null;
  voice_preference?: TTSVoice | null;
  tags?: string[] | null;
  id?: string; 
}

export interface PersonaTemplate extends Persona {
  id: string; 
}

interface JobSubmissionResponse {
  message: string;
  jobId: string;
  error?: string; 
  details?: string;
}

// End of assumed/local type definitions

const PREDEFINED_PERSONAS: PersonaTemplate[] = [
  { id: 'custom', name: 'Enter Custom', style: '', constraints: '', backstory: '', tags: [] },
  { id: 'fab_one', name: 'FabOne', style: 'Witty and insightful.', constraints: 'Stay PG-13.', backstory: 'Knows all about classic internet memes.', tags: ['witty', 'insightful', 'memes'] },
  { id: 'sarcastic_sue', name: 'SarcasticSue', style: 'Curious and slightly sarcastic.', constraints: "Don't be overly mean.", backstory: 'Secretly a history buff with a PhD in ancient civilizations.', tags: ['sarcastic', 'curious', 'history'] },
  { id: 'excitable_eddie', name: 'ExcitableEddie', style: 'Energetic and easily amazed.', constraints: 'Keep it G-rated.', backstory: 'Easily impressed by anything new or shiny.', tags: ['energetic', 'enthusiastic'] },
  { id: 'professor_prudence', name: 'ProfessorPrudence', style: 'Calm and analytical.', constraints: 'Cite sources (jokingly). ', backstory: 'Specializes in early 20th-century cinema.', tags: ['analytical', 'expert'] },
  { id: 'bubbly_beatrice', name: 'BubblyBeatrice', style: 'Cheerful and optimistic.', constraints: 'Find the good in everything.', backstory: 'Runs a popular motivational YouTube channel.', tags: ['cheerful', 'optimistic'] },
  { id: 'grumpy_gus', name: 'GrumpyGus', style: 'Cynical curmudgeon.', constraints: 'Complain often.', backstory: 'Used to be a roadie for a famous rock band in the 70s.', tags: ['cynical', 'grumpy'] },
  { id: 'valley_vera', name: 'ValleyVera', style: 'Like, a totally tubular commentator from, like, the 80s valley scene?', constraints: 'Use 80s slang.', backstory: 'Still owns a Members Only jacket and a working Walkman.', tags: ['80s', 'retro', 'funny'] },
  { id: 'noir_narrator', name: 'NoirNarrator', style: 'Gravelly-voiced detective type, narrating events with dramatic flair.', constraints: 'Speak in metaphors.', backstory: 'Haunted by one case he could never solve... the case of the missing stapler.', tags: ['detective', 'dramatic', 'noir'] },
  { id: 'captain_commentary', name: 'CaptainCommentary', style: 'Heroic and bold announcer, ready to call the play-by-play.', constraints: 'Exaggerate everything.', backstory: 'Once won a hot dog eating contest by consuming 70 hot dogs.', tags: ['heroic', 'announcer', 'sports'] },
];

const MAX_SPEAKERS = 4;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transcript, setTranscript] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [speakingPace, setSpeakingPace] = useState<number>(1.0);
  const [numberOfSpeakers, setNumberOfSpeakers] = useState<number>(2);
  
  const [personaNames, setPersonaNames] = useState<string[]>(Array(MAX_SPEAKERS).fill(''));
  const [personaStyles, setPersonaStyles] = useState<string[]>(Array(MAX_SPEAKERS).fill(''));
  const [personaBackstories, setPersonaBackstories] = useState<(string | null)[]>(Array(MAX_SPEAKERS).fill(null));
  const [personaConstraints, setPersonaConstraints] = useState<(string | null)[]>(Array(MAX_SPEAKERS).fill(null));
  
  const [userGuidanceInput, setUserGuidanceInput] = useState<string>('');

  const [customPersonas, setCustomPersonas] = useState<PersonaTemplate[]>([]);
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [finalVideoR2Url, setFinalVideoR2Url] = useState<string | null>(null);
  const [generatedSummaryInfo, setGeneratedSummaryInfo] = useState<string | null>(null);
  const [embedVideoUrl, setEmbedVideoUrl] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState<boolean>(false);

  // Effect to pre-fill form from URL query parameters
  useEffect(() => {
    const videoUrl = searchParams.get('videoUrl');
    const numSpeakersParam = searchParams.get('numSpeakers');
    const paceParam = searchParams.get('pace');
    const summaryParam = searchParams.get('summary');
    const guidanceParam = searchParams.get('userGuidance');
    let hasQueryParams = false;

    if (videoUrl) { setVideoUrlInput(videoUrl); hasQueryParams = true; }
    if (summaryParam) { setTranscript(summaryParam); hasQueryParams = true; }
    if (numSpeakersParam) {
      const num = parseInt(numSpeakersParam, 10);
      if (!isNaN(num) && num >= 1 && num <= MAX_SPEAKERS) { setNumberOfSpeakers(num); hasQueryParams = true; }
    }
    if (paceParam) {
      const paceNum = parseFloat(paceParam);
      if (!isNaN(paceNum) && paceNum >= 0.5 && paceNum <= 1.5) { setSpeakingPace(paceNum); hasQueryParams = true; }
    }
    if (guidanceParam) { setUserGuidanceInput(guidanceParam); hasQueryParams = true; }

    const newQueryPersonaNames = Array(MAX_SPEAKERS).fill('');
    const newQueryPersonaStyles = Array(MAX_SPEAKERS).fill('');
    const newQueryPersonaBackstories = Array(MAX_SPEAKERS).fill(null);
    const newQueryPersonaConstraints = Array(MAX_SPEAKERS).fill(null);
    let personasChangedByQuery = false;

    for (let i = 0; i < MAX_SPEAKERS; i++) {
      const name = searchParams.get(`personaName${i}`);
      const style = searchParams.get(`personaStyle${i}`);
      const backstory = searchParams.get(`personaBackstory${i}`);
      const constraints = searchParams.get(`personaConstraints${i}`);
      if (name !== null) { newQueryPersonaNames[i] = name; personasChangedByQuery = true; }
      if (style !== null) { newQueryPersonaStyles[i] = style; personasChangedByQuery = true; }
      if (backstory !== null) { (newQueryPersonaBackstories as (string|null)[])[i] = backstory; personasChangedByQuery = true; }
      if (constraints !== null) { (newQueryPersonaConstraints as (string|null)[])[i] = constraints; personasChangedByQuery = true; }
    }

    if (personasChangedByQuery) {
      setPersonaNames(newQueryPersonaNames);
      setPersonaStyles(newQueryPersonaStyles);
      setPersonaBackstories(newQueryPersonaBackstories);
      setPersonaConstraints(newQueryPersonaConstraints);
      hasQueryParams = true; 
    }

    if (hasQueryParams) {
      // router.replace('/', { scroll: false }); // TEMPORARILY COMMENTED OUT FOR TESTING
      console.log("[Query Param Effect] router.replace was called, but it is currently commented out for testing.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // router is stable, searchParams is the trigger

 useEffect(() => {
    // This effect should run after the query param pre-fill might have happened.
    // It sets defaults ONLY if the persona fields weren't populated by query params.
    // Check if the first persona name is still its initial empty string.
    if (personaNames[0] === '' && personaStyles[0] === '' && personaBackstories[0] === null) {
        const initialNames = Array(MAX_SPEAKERS).fill('');
        const initialStyles = Array(MAX_SPEAKERS).fill('');
        const initialBackstories = Array(MAX_SPEAKERS).fill(null);
        const initialConstraints = Array(MAX_SPEAKERS).fill(null);

        for(let i = 0; i < MAX_SPEAKERS; i++) {
            const defaultP = PREDEFINED_PERSONAS[i+1]; // +1 to skip 'Enter Custom'
            if(defaultP) {
                initialNames[i] = defaultP.name;
                initialStyles[i] = defaultP.style || '';
                initialBackstories[i] = defaultP.backstory || null;
                initialConstraints[i] = defaultP.constraints || null;
            } else {
                initialNames[i] = `Speaker ${i+1}`;
                initialStyles[i] = 'A general speaking style.';
                initialBackstories[i] = null;
                initialConstraints[i] = 'Keep it PG.';
            }
        }
        setPersonaNames(initialNames);
        setPersonaStyles(initialStyles);
        setPersonaBackstories(initialBackstories);
        setPersonaConstraints(initialConstraints);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]); // Re-evaluate defaults if searchParams (and thus pre-fill) changes.

  // Clear results when primary inputs change
  useEffect(() => {
    // if (isLoading) return; // No longer needed here if isLoading is not a dependency

    console.log("[useEffect ClearResults] Running. Due to input change.");
    console.log("[useEffect ClearResults] Current values: transcript:", transcript, "videoUrlInput:", videoUrlInput, "numberOfSpeakers:", numberOfSpeakers, "speakingPace:", speakingPace);

    setDialogue([]);
    setAudioUrl(null);
    setFinalVideoR2Url(null); 
    setError(null);
    setGeneratedSummaryInfo(null);
  }, [transcript, videoUrlInput, numberOfSpeakers, speakingPace]); // Removed isLoading

  // Effect to update video player URL
  useEffect(() => {
    let newEmbedUrl: string | null = null;
    if (videoUrlInput && videoUrlInput.trim() !== '') {
      let videoId: string | null = null;
      try {
        const url = new URL(videoUrlInput);
        if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
          if (url.pathname === '/watch') videoId = url.searchParams.get('v');
          else if (url.pathname.startsWith('/embed/')) videoId = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
          else if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
        } else if (url.hostname === 'youtu.be') videoId = url.pathname.substring(1);
      } catch (e) { console.warn('[VideoPreview] Invalid URL for preview:', videoUrlInput); }
      if (videoId) newEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    setEmbedVideoUrl(newEmbedUrl);
  }, [videoUrlInput]);

  // Effect to fetch custom personas
  useEffect(() => {
    async function fetchCustomPersonas() {
      try {
        const response = await fetch('/api/personas');
        if (!response.ok) {
          // Log the raw response if it's not ok, to see what was returned
          const errorText = await response.text();
          console.error('Failed to fetch custom personas for dropdown. Status:', response.status, 'Response:', errorText);
          setCustomPersonas([]); // Set to empty array on error
          return;
        }
        // Check content type before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          const formattedPersonas = (data.personas || []).map((p: any) => ({
            id: String(p.id), name: p.name, 
            style: p.style || '', 
            constraints: p.constraints || '', 
            backstory: p.backstory || null, 
            tags: p.tags || [],
            voice_preference: p.voice_preference || null,
          }));
          setCustomPersonas(formattedPersonas);
        } else {
          const responseText = await response.text();
          console.error('Failed to fetch custom personas: Response was not JSON.', responseText);
          setCustomPersonas([]); // Set to empty array on error
        }
      } catch (err) {
        console.error('Error fetching custom personas for dropdown:', err);
        setCustomPersonas([]); // Set to empty array on error
      }
    }
    fetchCustomPersonas();
  }, []);

  const handlePersonaNameChange = (index: number, value: string) => {
    const newNames = [...personaNames]; newNames[index] = value; setPersonaNames(newNames);
  };
  const handlePersonaStyleChange = (index: number, value: string) => {
    const newStyles = [...personaStyles]; newStyles[index] = value; setPersonaStyles(newStyles);
  };
  const handlePredefinedPersonaChange = (speakerIndex: number, selectedPersonaId: string) => {
    let selectedTemplate: PersonaTemplate | undefined = PREDEFINED_PERSONAS.find(p => p.id === selectedPersonaId);
    if (!selectedTemplate) selectedTemplate = customPersonas.find(p => p.id === selectedPersonaId);
    
    console.log(`[handlePredefinedPersonaChange] Speaker ${speakerIndex}, Selected ID: ${selectedPersonaId}, Template found:`, selectedTemplate);

    const newNames = [...personaNames];
    const newStyles = [...personaStyles];
    const newBackstories = [...personaBackstories];
    const newConstraints = [...personaConstraints];

    if (selectedTemplate && selectedTemplate.id !== 'custom') {
      newNames[speakerIndex] = selectedTemplate.name;
      newStyles[speakerIndex] = selectedTemplate.style || '';
      newBackstories[speakerIndex] = selectedTemplate.backstory || null;
      newConstraints[speakerIndex] = selectedTemplate.constraints || 'Keep it PG.';
      console.log(`[handlePredefinedPersonaChange] Applied template: Name: ${newNames[speakerIndex]}, Style: ${newStyles[speakerIndex]}, Constraints: ${newConstraints[speakerIndex]}`);
    } else if (selectedPersonaId === 'custom') {
      const defaultPIndex = speakerIndex < PREDEFINED_PERSONAS.length -1 ? speakerIndex + 1 : 1;
      const defaultPersonaForSlot = PREDEFINED_PERSONAS[defaultPIndex];

      newNames[speakerIndex] = defaultPersonaForSlot?.name || `Speaker ${speakerIndex + 1}`;
      newStyles[speakerIndex] = defaultPersonaForSlot?.style || 'A general speaking style.';
      newBackstories[speakerIndex] = defaultPersonaForSlot?.backstory || null;
      newConstraints[speakerIndex] = defaultPersonaForSlot?.constraints || 'Keep it PG.';
      console.log(`[handlePredefinedPersonaChange] Applied CUSTOM/default: Name: ${newNames[speakerIndex]}, Style: ${newStyles[speakerIndex]}, Constraints: ${newConstraints[speakerIndex]}`);
    }
    setPersonaNames(newNames);
    setPersonaStyles(newStyles);
    setPersonaBackstories(newBackstories);
    setPersonaConstraints(newConstraints);
  };

  const handleGenerate = async () => {
    console.log('[page.tsx] handleGenerate START');
    setIsLoading(true); 
    setError(null); 
    setDialogue([]); 
    setAudioUrl(null);
    setFinalVideoR2Url(null); 
    setGeneratedSummaryInfo(null);
    // setShareLinkCopied(false); // Reset if you want the share button to revert on new generation

    const activePersonas: Persona[] = [];
    for (let i = 0; i < numberOfSpeakers; i++) {
      const name = personaNames[i] || `Speaker ${i + 1}`;
      const style = personaStyles[i] || 'A general speaking style.';
      const backstory = personaBackstories[i] || null;
      const constraints = personaConstraints[i] || 'Keep it PG.';
      let tags: string[] | null = [];
      const currentSpeakerName = personaNames[i];
      let matchedTemplate = PREDEFINED_PERSONAS.find(p => p.name === currentSpeakerName && p.style === style);
      if (!matchedTemplate) {
        matchedTemplate = customPersonas.find(p => p.name === currentSpeakerName && p.style === style);
      }
      tags = matchedTemplate?.tags || [];
      activePersonas.push({ name, style, backstory, constraints, tags });
    }

    try {
      console.log('[page.tsx] Making API call to /api/generate to submit job...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcriptSummary: transcript, 
          videoUrlInput: videoUrlInput,
          personas: activePersonas, 
          speakingPace: speakingPace, 
          userGuidance: userGuidanceInput
        }),
      });
      console.log('[page.tsx] API call responded. Status:', response.status);

      const result: JobSubmissionResponse = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        console.error('[page.tsx] API Error Response Data:', result);
        throw new Error(result.details || result.error || `Job submission failed: ${response.statusText}`);
      }

      console.log('[page.tsx] Job submission successful:', result);
      // Display a message to the user that the job has been submitted.
      // We don't get the final video URL here anymore.
      setGeneratedSummaryInfo(`Video generation started! Job ID: ${result.jobId}. Check history later for results.`);
      // Clear previous direct results as the processing is now async
      setDialogue([]);
      setAudioUrl(null);
      setFinalVideoR2Url(null);

    } catch (err) {
      console.error('[page.tsx] Error in handleGenerate (Job Submission):', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during job submission.');
      }
    } finally {
      console.log('[page.tsx] handleGenerate FINALLY block. Setting isLoading to false.');
      setIsLoading(false); // Still set loading to false after job submission attempt
    }
    console.log('[page.tsx] handleGenerate END');
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8 space-y-6 bg-gray-900 text-white">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-center text-indigo-400">Queer-AI Commentary Generator</h1>
        <div className="flex space-x-2">
          <Link href="/history" className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition-colors duration-150 text-sm">
            View History
          </Link>
          <Link href="/personas" className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-500 transition-colors duration-150 text-sm">
            Manage Personas
          </Link>
        </div>
      </div>
      <p className="text-center text-gray-400">Create unique AI-powered commentary for your videos!</p>

      <div className="w-full max-w-2xl p-6 space-y-6 bg-gray-800 rounded-xl shadow-2xl">
        <div>
          <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-300 mb-1">YouTube Video URL</label>
          <input type="url" id="videoUrl" className="mt-1 block w-full p-3 border border-gray-700 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>

        {embedVideoUrl && (
          <div className="mt-4 aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src={embedVideoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        )}
        
        <div>
          <label htmlFor="numberOfSpeakers" className="block text-sm font-medium text-gray-300 mb-1">Number of Speakers (1-4)</label>
          <select id="numberOfSpeakers" value={numberOfSpeakers} onChange={(e) => setNumberOfSpeakers(parseInt(e.target.value, 10))} className="mt-1 block w-full p-3 border border-gray-700 rounded-md shadow-sm bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500">
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {Array.from({ length: numberOfSpeakers }).map((_, index) => (
          <div key={`persona-section-${index}`} className="space-y-3 p-4 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-400">Speaker {index + 1}</h3>
            <div>
              <label htmlFor={`predefinedPersona-${index}`} className="block text-xs font-medium text-gray-400 mb-1">Quick Select Persona</label>
              <select 
                id={`predefinedPersona-${index}`} 
                onChange={(e) => handlePredefinedPersonaChange(index, e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  PREDEFINED_PERSONAS.find(p => p.name === personaNames[index] && p.style === personaStyles[index])?.id || 
                  customPersonas.find(p => p.name === personaNames[index] && p.style === personaStyles[index])?.id || 
                  'custom'
                }
              >
                <optgroup label="Standard Personas">
                  {PREDEFINED_PERSONAS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.id !== 'custom' && p.style ? `${p.style.substring(0, 20)}...` : ''}</option>
                  ))}
                </optgroup>
                {customPersonas.length > 0 && (
                  <optgroup label="My Custom Personas">
                    {customPersonas.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.style ? `${p.style.substring(0, 20)}...` : ''}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label htmlFor={`personaName-${index}`} className="block text-xs font-medium text-gray-400">Name</label>
              <input type="text" id={`personaName-${index}`} value={personaNames[index] || ''} onChange={(e) => handlePersonaNameChange(index, e.target.value)} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-500" />
            </div>
            <div>
              <label htmlFor={`personaStyle-${index}`} className="block text-xs font-medium text-gray-400">Speaking Style / Tone</label>
              <textarea id={`personaStyle-${index}`} rows={2} value={personaStyles[index] || ''} onChange={(e) => handlePersonaStyleChange(index, e.target.value)} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-500" />
            </div>
          </div>
        ))}
        
        <div>
          <label htmlFor="userGuidance" className="block text-sm font-medium text-gray-300 mb-1">User Guidance (Optional)</label>
          <textarea id="userGuidance" rows={2} className="mt-1 block w-full p-3 border border-gray-700 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500" value={userGuidanceInput} onChange={(e) => setUserGuidanceInput(e.target.value)} placeholder="e.g., Focus on the cat's reaction, make the architect sound more condescending, discuss the historical context..." />
        </div>

        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-300 mb-1">Transcript Summary (Optional - AI will generate if blank & video provided)</label>
          <textarea id="transcript" rows={3} className="mt-1 block w-full p-3 border border-gray-700 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>

        <div>
          <label htmlFor="speakingPace" className="block text-sm font-medium text-gray-300 mb-1">Speaking Pace: {speakingPace.toFixed(1)}x</label>
          <input 
            type="range" id="speakingPace" min="0.5" max="1.5" step="0.1" 
            value={speakingPace} onChange={(e) => setSpeakingPace(parseFloat(e.target.value))} 
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
        
        <button type="button" onClick={handleGenerate} disabled={isLoading || !videoUrlInput} 
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors duration-150">
          {isLoading ? 'Generating Video...' : 'Generate Commentary Video'}
        </button>
      </div>

      {error && <div className="w-full max-w-2xl p-4 mt-6 text-sm text-red-200 bg-red-700 bg-opacity-50 rounded-lg shadow-lg"><p className="font-bold">Error:</p><p>{error}</p></div>}
      
      {generatedSummaryInfo && (
        <div className="w-full max-w-2xl p-4 mt-6 space-y-1 text-sm text-gray-200 bg-gray-700 bg-opacity-50 rounded-lg shadow-lg">
            <p className="font-semibold text-indigo-400">AI Generated Summary:</p>
            <p className="italic">{generatedSummaryInfo}</p>
        </div>
      )}

      {finalVideoR2Url && (
        <div className="w-full max-w-2xl mt-8 p-6 border border-green-700 rounded-xl shadow-xl bg-green-900 bg-opacity-30">
          <h2 className="text-2xl font-bold mb-3 text-green-300 text-center">Your Video is Ready!</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <a href={finalVideoR2Url} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-green-500 text-white font-semibold text-lg rounded-lg hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-green-300 dark:focus:ring-green-800 transition-colors duration-150 w-full sm:w-auto text-center">
              🎬 Watch Video
            </a>
            <button 
              type="button"
              onClick={async () => {
                if (finalVideoR2Url) {
                  try {
                    await navigator.clipboard.writeText(finalVideoR2Url);
                    setShareLinkCopied(true);
                    setTimeout(() => setShareLinkCopied(false), 2000); // Reset after 2 seconds
                  } catch (err) {
                    console.error('Failed to copy link: ', err);
                    alert('Failed to copy link.'); // Simple feedback for now
                  }
                }
              }}
              className="inline-block px-8 py-3 bg-blue-500 text-white font-semibold text-lg rounded-lg hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors duration-150 w-full sm:w-auto text-center"
            >
              {shareLinkCopied ? '✅ Copied!' : '🔗 Copy Share Link'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">Link expires in 24 hours.</p>
        </div>
      )}

      {audioUrl && !finalVideoR2Url && (
        <div className="w-full max-w-2xl mt-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Voiceover Audio Preview:</h2>
          <audio controls autoPlay src={audioUrl} className="w-full rounded-lg"></audio>
        </div>
      )}

      {dialogue.length > 0 && (
        <div className="w-full max-w-2xl mt-8 p-6 bg-gray-800 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-indigo-400">Generated Dialogue:</h2>
          <div className="space-y-3">
            {dialogue.map((line, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-lg shadow"><strong className="text-indigo-300">{line.speaker}:</strong> <span className="text-gray-200">{line.text}</span></div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
} 