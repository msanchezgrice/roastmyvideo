'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Match the global Persona type from src/types.ts
interface UIPersona {
  name: string;
  style?: string | null; 
  constraints?: string | null;
  backstory?: string | null;
  // No need for voice_preference or tags if not displayed directly on history card
}

// Match the global HistoryEntry type from src/types.ts
interface HistoryEntryUI {
  id: string;
  created_at: string;
  video_r2_url: string | null; // Can be null if processing or failed before R2 upload
  thumbnail_url: string | null;
  source_video_url: string | null;
  num_speakers: number;
  personas: UIPersona[]; // Use the local UIPersona
  transcript_summary: string | null;
  speaking_pace: number;
  job_id?: string | null; // Added
  status?: 'queued' | 'processing' | 'completed' | 'failed' | string | null; // Added, string for flexibility
  error_message?: string | null; // Added
  user_guidance?: string | null; // Added
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntryUI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/history');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || `API Error: ${response.statusText}`);
        }
        const data = await response.json();
        setHistory(data.history || []);
        setError(null);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred while fetching history.');
        console.error('[HistoryPage] Error fetching history:', err);
      }
    }

    setIsLoading(true);
    fetchHistory().finally(() => setIsLoading(false));

    const intervalId = setInterval(fetchHistory, 15000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 space-y-6 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-400">Generation History</h1>
          <Link href="/" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-150">
            &larr; Back to Generator
          </Link>
        </div>

        {isLoading && <p className="text-center text-gray-400">Loading history...</p>}
        {error && <div className="w-full p-4 my-4 text-sm text-red-200 bg-red-700 bg-opacity-50 rounded-lg shadow-lg"><p className="font-bold">Error loading history:</p><p>{error}</p></div>}
        
        {!isLoading && !error && history.length === 0 && (
          <p className="text-center text-gray-500">No history found. Go generate some videos!</p>
        )}

        {!isLoading && !error && history.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((entry) => (
              <div key={entry.id} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                {entry.thumbnail_url ? (
                  <img src={entry.thumbnail_url} alt={`Thumbnail for video ${entry.id}`} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-700 flex items-center justify-center text-gray-500">No Thumbnail</div>
                )}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-lg font-semibold text-indigo-300 mb-2 truncate" title={entry.transcript_summary || 'N/A'}>
                    Summary: {entry.transcript_summary ? (entry.transcript_summary.substring(0, 50) + (entry.transcript_summary.length > 50 ? '...' : '')) : (entry.status === 'processing' || entry.status === 'queued' ? 'Processing...' : 'N/A')}
                  </h3>
                  <p className="text-xs text-gray-400 mb-1">Job ID: {entry.job_id || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mb-1">Status: 
                    <span className={`font-semibold ${entry.status === 'completed' ? 'text-green-400' : entry.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : 'Unknown'}
                    </span>
                  </p>
                  {entry.status === 'failed' && entry.error_message && (
                    <p className="text-xs text-red-300 bg-red-700 bg-opacity-30 p-1 rounded my-1">Error: {entry.error_message.substring(0, 100)}{entry.error_message.length > 100 ? '...' : ''}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-1">Speakers: {entry.num_speakers}, Pace: {entry.speaking_pace}x</p>
                  {entry.user_guidance && (
                     <p className="text-xs text-gray-500 mt-1 mb-2 text-ellipsis overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={entry.user_guidance}>
                      <span className="font-semibold text-gray-400">Guidance:</span> {entry.user_guidance}
                    </p>
                  )}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Personas:</p>
                    <ul className="text-xs text-gray-500 list-disc list-inside pl-1 max-h-20 overflow-y-auto simple-scrollbar">
                      {entry.personas?.map((p, idx) => (
                        <li key={idx} title={`${p.name} - Style: ${p.style || 'N/A'}`} className="truncate">
                          {p.name}: <span className="italic">{p.style ? (p.style.substring(0,30) + (p.style.length > 30 ? '...' : '')) : 'Style N/A'}</span>
                        </li>
                      )) || <li>N/A</li>}
                    </ul>
                  </div>
                  {entry.status === 'completed' && entry.video_r2_url && (
                    <a 
                      href={entry.video_r2_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-auto block w-full text-center px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors duration-150 text-sm"
                    >
                      Watch Video
                    </a>
                  )}
                  {(entry.status === 'processing' || entry.status === 'queued') && (
                    <div className="mt-auto block w-full text-center px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md text-sm animate-pulse">
                      Processing...
                    </div>
                  )}
                  <Link 
                    href={`/?videoUrl=${encodeURIComponent(entry.source_video_url || entry.video_r2_url || '')}&numSpeakers=${entry.num_speakers}&pace=${entry.speaking_pace}&summary=${encodeURIComponent(entry.transcript_summary || '')}&userGuidance=${encodeURIComponent(entry.user_guidance || '')}${entry.personas.map((p, i) => `&personaName${i}=${encodeURIComponent(p.name)}&personaStyle${i}=${encodeURIComponent(p.style || '')}&personaBackstory${i}=${encodeURIComponent(p.backstory || '')}&personaConstraints${i}=${encodeURIComponent(p.constraints || '')}`).join('')}`}
                    className="mt-2 block w-full text-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors duration-150 text-sm"
                    title="Remix this video with its settings"
                  >
                    Remix
                  </Link>
                  {entry.video_r2_url && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (entry.video_r2_url) {
                          try {
                            await navigator.clipboard.writeText(entry.video_r2_url);
                            setLinkCopiedId(entry.id); 
                            setTimeout(() => setLinkCopiedId(null), 2000); 
                          } catch (err) {
                            console.error('Failed to copy link: ', err);
                            alert('Failed to copy link.');
                          }
                        } else {
                          alert('No video link available to copy.');
                        }
                      }}
                      className="mt-2 w-full px-4 py-2 bg-teal-500 text-white font-semibold rounded-md hover:bg-teal-600 focus:ring-4 focus:outline-none focus:ring-teal-300 dark:focus:ring-teal-800 transition-colors duration-150 text-sm"
                    >
                      {linkCopiedId === entry.id ? '✅ Link Copied!' : '🔗 Copy Share Link'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete this history entry (Job ID: ${entry.job_id || entry.id})? This action cannot be undone.`)) {
                        try {
                          const response = await fetch(`/api/history/${entry.id}`, { method: 'DELETE' });
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.details || errorData.error || 'Failed to delete history entry.');
                          }
                          // Refresh history list by removing the deleted item or re-fetching
                          setHistory(prevHistory => prevHistory.filter(item => item.id !== entry.id));
                          alert('History entry deleted.'); // Or a more subtle notification
                        } catch (err) {
                          console.error('Error deleting history entry:', err);
                          alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
                        }
                      }
                    }}
                    className="mt-2 w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 transition-colors duration-150 text-sm"
                  >
                    🗑️ Delete Entry
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-right">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 