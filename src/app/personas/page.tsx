'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

// Should match a subset of OpenAI TTSVoice type if defined elsewhere
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
}

// Add SortOption type
const SORT_OPTIONS = {
  NAME_ASC: 'Name (A-Z)',
  NAME_DESC: 'Name (Z-A)',
  DATE_ASC: 'Date Created (Oldest)',
  DATE_DESC: 'Date Created (Newest)',
} as const;
type SortOptionKey = keyof typeof SORT_OPTIONS;

const DEFAULT_FORM_STATE: Omit<CustomPersona, 'id' | 'created_at'> = {
  name: '',
  style: '',
  constraints: '',
  voice_preference: null,
  backstory: '',
  tags: [],
};

export default function PersonaManagerPage() {
  const [allPersonas, setAllPersonas] = useState<CustomPersona[]>([]); // Store all fetched personas
  const [displayedPersonas, setDisplayedPersonas] = useState<CustomPersona[]>([]); // For sorting/filtering
  const [currentSort, setCurrentSort] = useState<SortOptionKey>('DATE_DESC');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<CustomPersona | null>(null);
  const [formData, setFormData] = useState<Omit<CustomPersona, 'id' | 'created_at'>>(DEFAULT_FORM_STATE);
  const [currentTags, setCurrentTags] = useState<string>(''); // For the comma-separated tag input field
  const [formError, setFormError] = useState<string | null>(null);
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null); // URL of audio being played
  const [audioError, setAudioError] = useState<string | null>(null);

  async function fetchPersonas() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/personas');
      if (!response.ok) {
        let errorDetails = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorDetails = errorData.details || errorData.error || errorDetails;
        } catch (e) {
          // If response is not JSON, try to get text
          const responseText = await response.text().catch(() => 'Could not read response body.');
          errorDetails = `${errorDetails}. Response body: ${responseText.substring(0, 500)}`; // Limit length
        }
        throw new Error(errorDetails);
      }
      const data = await response.json();
      setAllPersonas(data.personas || []);
      // setDisplayedPersonas will be handled by a new useEffect watching allPersonas and currentSort
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred while fetching history.');
      console.error('[HistoryPage] Error fetching history:', err); // Should be PersonaManagerPage
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchPersonas();
  }, []);

  // Effect to sort personas when allPersonas or currentSort changes
  useEffect(() => {
    let sorted = [...allPersonas];
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
  }, [allPersonas, currentSort]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'tags') {
      setCurrentTags(value); // Update the raw tags string
      // Convert comma-separated string to array for actual formData.tags
      const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      setFormData(prev => ({ ...prev, tags: tagsArray.length > 0 ? tagsArray : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value === '' && name === 'voice_preference' ? null : value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) {
      setFormError('Persona name is required.');
      return;
    }

    const url = isEditing ? `/api/personas/${isEditing.id}` : '/api/personas';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json(); 
      if (!response.ok) {
        throw new Error(result.details || result.error || `Failed to ${isEditing ? 'update' : 'create'} persona`);
      }
      await fetchPersonas(); // Refresh list
      setShowForm(false);
      setIsEditing(null);
      setFormData(DEFAULT_FORM_STATE);
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleEdit = (persona: CustomPersona) => {
    setIsEditing(persona);
    setFormData({
      name: persona.name,
      style: persona.style || '',
      constraints: persona.constraints || '',
      voice_preference: persona.voice_preference || null,
      backstory: persona.backstory || '',
      tags: persona.tags || [],
    });
    setCurrentTags((persona.tags || []).join(', ')); // Set the raw string for the input field
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;
    setFormError(null);
    try {
      const response = await fetch(`/api/personas/${personaId}`, { method: 'DELETE' });
      const result = await response.json(); 
      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to delete persona');
      }
      await fetchPersonas(); // Refresh list
    } catch (err) {
      setError((err as Error).message); // Show error at list level for delete
    }
  };

  const openNewPersonaForm = () => {
    setIsEditing(null);
    setFormData(DEFAULT_FORM_STATE);
    setCurrentTags(''); // Reset tags input
    setShowForm(true);
    setFormError(null);
  };

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
      // Optional: clean up audio element or setPreviewingAudio(null) after it finishes
      // audio.onended = () => setPreviewingAudio(null);
    }
  }, [previewingAudio]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 space-y-6 bg-gray-900 text-white">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-400">Persona Manager</h1>
          <Link href="/" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700"> &larr; Back to Generator </Link>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          {!showForm && (
            <button 
              onClick={openNewPersonaForm}
              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-150 w-full sm:w-auto"
            >
              + Create New Persona
            </button>
          )}
          <div className={showForm ? 'w-full sm:w-auto sm:ml-auto' : 'w-full sm:w-auto'}> {/* Adjust margin if form is shown */}
            <label htmlFor="sortPersonas" className="sr-only">Sort Personas</label>
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

        {showForm && (
          <form onSubmit={handleSubmit} className="p-6 mb-8 bg-gray-800 rounded-xl shadow-2xl space-y-4">
            <h2 className="text-xl font-semibold text-indigo-300">{isEditing ? 'Edit Persona' : 'Create New Persona'}</h2>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name*</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
            </div>
            <div>
              <label htmlFor="style" className="block text-sm font-medium text-gray-300">Style</label>
              <textarea name="style" id="style" rows={3} value={formData.style || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="Describe the persona's speaking style, tone, and mannerisms."/>
            </div>
            <div>
              <label htmlFor="constraints" className="block text-sm font-medium text-gray-300">Constraints</label>
              <textarea name="constraints" id="constraints" rows={3} value={formData.constraints || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="e.g., No profanity, avoid talking about X, focus on Y."/>
            </div>
            <div>
              <label htmlFor="backstory" className="block text-sm font-medium text-gray-300">Backstory / Contextual Knowledge</label>
              <textarea name="backstory" id="backstory" rows={3} value={formData.backstory || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="e.g., Knows about 80s movies, is a Star Trek fan, remembers the dial-up internet era."/>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300">Tags (comma-separated)</label>
              <input type="text" name="tags" id="tags" value={currentTags} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="e.g., funny, sarcastic, knowledgeable"/>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <label htmlFor="voice_preference" className="block text-sm font-medium text-gray-300">Voice Preference</label>
                <select name="voice_preference" id="voice_preference" value={formData.voice_preference || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white">
                  <option value="">-- None --</option>
                  {AVAILABLE_TTS_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                </select>
              </div>
              <button 
                type="button" 
                onClick={() => playVoicePreview(formData.voice_preference)}
                disabled={!formData.voice_preference}
                className="px-3 py-2 bg-teal-500 text-white font-semibold rounded-md hover:bg-teal-600 disabled:opacity-50 text-sm h-[38px] whitespace-nowrap"
              >
                Play Voice
              </button>
            </div>
            {formError && <p className="text-sm text-red-400">Error: {formError}</p>}
            <div className="flex gap-4">
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">{isEditing ? 'Save Changes' : 'Create Persona'}</button>
              <button type="button" onClick={() => { setShowForm(false); setIsEditing(null); setFormError(null); }} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">Cancel</button>
            </div>
          </form>
        )}

        {isLoading && <p className="text-center text-gray-400">Loading personas...</p>}
        {error && <div className="w-full p-4 my-4 text-sm text-red-200 bg-red-700 bg-opacity-50 rounded-lg shadow-lg"><p className="font-bold">Error:</p><p>{error}</p></div>}
        {!isLoading && !error && displayedPersonas.length === 0 && !showForm && (
          <p className="text-center text-gray-500">No custom personas match your criteria or none created yet.</p>
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
                  <button onClick={() => handleEdit(p)} className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded w-full">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded w-full">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 