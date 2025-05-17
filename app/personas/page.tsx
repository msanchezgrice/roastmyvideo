'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

// Define types locally for this component
const AVAILABLE_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type TTSVoiceType = typeof AVAILABLE_TTS_VOICES[number];

interface CustomPersona {
  id: string;
  created_at?: string;
  name: string;
  description: string | null;
  voice_preference: TTSVoiceType | null;
  backstory: string | null;
  tags: string[] | null;
}

const DEFAULT_FORM_STATE: Omit<CustomPersona, 'id' | 'created_at'> = {
  name: '',
  description: '',
  voice_preference: null,
  backstory: '',
  tags: [],
};

const SORT_OPTIONS = {
  DATE_DESC: 'Date Created (Newest)',
  DATE_ASC: 'Date Created (Oldest)',
  NAME_ASC: 'Name (A-Z)',
  NAME_DESC: 'Name (Z-A)',
} as const;
type SortOptionKey = keyof typeof SORT_OPTIONS;
// End of local type definitions

export default function PersonaManagerPage() {
  const [allPersonas, setAllPersonas] = useState<CustomPersona[]>([]);
  const [displayedPersonas, setDisplayedPersonas] = useState<CustomPersona[]>([]);
  const [currentSort, setCurrentSort] = useState<SortOptionKey>('DATE_DESC');
  const [uniqueTags, setUniqueTags] = useState<string[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<CustomPersona | null>(null);
  const [formData, setFormData] = useState<Omit<CustomPersona, 'id' | 'created_at'>>(DEFAULT_FORM_STATE);
  const [currentTags, setCurrentTags] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [previewingAudio, setPreviewingAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  async function fetchPersonas() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/personas');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `API Error: ${response.statusText}`);
      }
      const data = await response.json();
      setAllPersonas(data.personas || []);
    } catch (err) {
      setError((err as Error).message);
      setAllPersonas([]);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchPersonas();
  }, []);

  useEffect(() => {
    const tagsSet = new Set<string>();
    allPersonas.forEach(p => {
      p.tags?.forEach(tag => tagsSet.add(tag));
    });
    setUniqueTags(Array.from(tagsSet).sort());
  }, [allPersonas]);

  useEffect(() => {
    let filtered = [...allPersonas];
    if (selectedFilterTags.length > 0) {
      filtered = allPersonas.filter(p => 
        selectedFilterTags.every(filterTag => p.tags?.includes(filterTag))
      );
    }
    let sorted = [...filtered];
    switch (currentSort) {
      case 'NAME_ASC': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'NAME_DESC': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'DATE_ASC': sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()); break;
      case 'DATE_DESC': default: sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
    }
    setDisplayedPersonas(sorted);
  }, [allPersonas, currentSort, selectedFilterTags]);

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'tags') {
      setCurrentTags(value);
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
      await fetchPersonas();
      setShowForm(false);
      setIsEditing(null);
      setFormData(DEFAULT_FORM_STATE);
      setCurrentTags('');
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleEdit = (persona: CustomPersona) => {
    setIsEditing(persona);
    setFormData({
      name: persona.name,
      description: persona.description || '',
      voice_preference: persona.voice_preference || null,
      backstory: persona.backstory || '',
      tags: persona.tags || [],
    });
    setCurrentTags((persona.tags || []).join(', '));
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
      await fetchPersonas();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const openNewPersonaForm = () => {
    setIsEditing(null);
    setFormData(DEFAULT_FORM_STATE);
    setCurrentTags('');
    setShowForm(true);
    setFormError(null);
  };

  const playVoicePreview = async (voice: TTSVoiceType | null, text?: string) => {
    if (!voice) { setAudioError('No voice selected to preview.'); return; }
    setAudioError(null);
    setPreviewingAudio(null);
    try {
      const response = await fetch('/api/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, text: text || `Hello, I am voice ${voice}.` }),
      });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to generate TTS preview.'); }
      setPreviewingAudio(result.audioUrl);
    } catch (err) { setAudioError((err as Error).message); }
  };

  useEffect(() => {
    if (previewingAudio) {
      const audio = new Audio(previewingAudio);
      audio.play().catch(e => {
        console.error("Error playing audio preview:", e);
        setAudioError("Could not play audio. Browser might block autoplay.");
      });
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
            <button onClick={openNewPersonaForm} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-150 w-full sm:w-auto">
              + Create New Persona
            </button>
          )}
          <div className={showForm ? 'w-full sm:w-auto sm:ml-auto' : 'w-full sm:w-auto'}>
            <label htmlFor="sortPersonas" className="sr-only">Sort Personas</label>
            <select id="sortPersonas" value={currentSort} onChange={(e) => setCurrentSort(e.target.value as SortOptionKey)} className="p-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto">
              {Object.entries(SORT_OPTIONS).map(([key, value]) => (<option key={key} value={key}>{value}</option>))}
            </select>
          </div>
        </div>
        
        {uniqueTags.length > 0 && !showForm && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Filter by Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {uniqueTags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => toggleFilterTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 
                    ${selectedFilterTags.includes(tag) 
                      ? 'bg-sky-500 text-white' 
                      : 'bg-sky-800 text-sky-200 hover:bg-sky-700'}`}
                >
                  {tag}
                </button>
              ))}
              {selectedFilterTags.length > 0 && (
                <button 
                  onClick={() => setSelectedFilterTags([])}
                  className="px-3 py-1 text-xs rounded-full bg-red-700 text-red-100 hover:bg-red-600 transition-colors duration-150 ml-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {audioError && <p className="text-sm text-red-400 my-2">Audio Error: {audioError}</p>}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-6 mb-8 bg-gray-800 rounded-xl shadow-2xl space-y-4">
            <h2 className="text-xl font-semibold text-indigo-300">{isEditing ? 'Edit Persona' : 'Create New Persona'}</h2>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name*</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
              <textarea name="description" id="description" rows={3} value={formData.description || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
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
              <button type="button" onClick={() => playVoicePreview(formData.voice_preference)} disabled={!formData.voice_preference} className="px-3 py-2 bg-teal-500 text-white font-semibold rounded-md hover:bg-teal-600 disabled:opacity-50 text-sm h-[38px] whitespace-nowrap">
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
                  <p className="text-sm text-gray-400 mt-1 italic mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }} title={p.description || ''}>
                    {p.description || 'No description'}
                  </p>
                  {p.backstory && (
                    <p className="text-xs text-gray-500 mt-1 mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={p.backstory}>
                      <span className="font-semibold text-gray-400">Context:</span> {p.backstory}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Voice: {p.voice_preference || 'Not set'}
                    {p.voice_preference && (
                      <button onClick={() => playVoicePreview(p.voice_preference, `This is the voice of ${p.name}.`)} className="ml-2 text-xs px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded-sm">
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