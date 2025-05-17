import React from 'react';
import Link from 'next/link';

// Sample data - replace with actual data fetching
const sampleFeedItems = [
  {
    id: '1',
    title: 'My First Doodad.AI Video Commentary',
    summary: 'A fun take on a classic cat video using the "FabOne" character.',
    status: 'Completed',
    videoUrl: '#',
    createdAt: new Date().toISOString(),
    characters: ["FabOne"],
  },
  {
    id: '2',
    title: 'Science Explained with Doodad.AI',
    summary: 'Professor Prudence and Excitable Eddie make learning fun!',
    status: 'Completed',
    videoUrl: '#',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    characters: ['ProfessorPrudence', 'ExcitableEddie'],
  },
  {
    id: '3',
    title: 'New Doodad Video in Progress',
    summary: 'Working on a new commentary with SarcasticSue.',
    status: 'Processing',
    videoUrl: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // An hour ago
    characters: ['SarcasticSue'],
  },
];

export default function FeedPage() {
  // In a real app, you'd fetch feedItems from an API
  const feedItems = sampleFeedItems;
  const isLoading = false; // Replace with actual loading state
  const error = null; // Replace with actual error state

  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-900 py-12 px-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-blue-600 text-center sm:text-left">My Feed</h1>
          <Link 
            href="/generator"
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-150 w-full sm:w-auto text-center"
          >
            + Create New Video
          </Link>
        </div>

        {isLoading && <p className="text-center text-gray-500">Loading feed...</p>}
        {error && (
          <div className="w-full p-4 my-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg shadow-md">
            <p className="font-bold">Error loading feed:</p>
            {/* For this sample, error is just null, so direct display isn't very useful. 
                A real implementation would have more specific error handling. 
                We'll just indicate an error occurred. */}
            <p>An error occurred while loading the feed.</p>
          </div>
        )}
        
        {!isLoading && !error && feedItems.length === 0 && (
          <p className="text-center text-gray-500 py-10">No videos in your feed yet. <Link href="/generator" className="text-blue-600 hover:underline">Create one now!</Link></p>
        )}

        {!isLoading && !error && feedItems.length > 0 && (
          <div className="space-y-6">
            {feedItems.map((entry) => (
              <div key={entry.id} className="bg-blue-50 rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row items-start">
                {/* Thumbnail placeholder */}
                <div className="w-full md:w-48 h-36 md:h-auto bg-blue-100 flex items-center justify-center text-blue-400 md:rounded-l-xl md:rounded-r-none flex-shrink-0">
                  {entry.videoUrl ? (
                    // In a real app, you might have a thumbnail image here
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <span>No Preview</span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-blue-700 mb-2" title={entry.title}>
                    {entry.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1 flex-grow" style={{ minHeight: '40px' }}>{entry.summary}</p>
                  <p className="text-xs text-gray-500 mb-1">Characters: {entry.characters.join(', ') || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mb-3">Status: 
                    <span className={`font-semibold ${entry.status === 'Completed' ? 'text-green-600' : entry.status === 'Processing' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {entry.status}
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 items-center mt-auto">
                    {entry.videoUrl && entry.status === 'Completed' ? (
                      <a 
                        href={entry.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors duration-150 w-full sm:w-auto text-center"
                      >
                        Watch Video
                      </a>
                    ) : entry.status === 'Processing' ? (
                      <div className="px-4 py-2 text-sm bg-yellow-500 text-white font-semibold rounded-md w-full sm:w-auto text-center animate-pulse">
                        Processing...
                      </div>
                    ) : (
                      <div className="px-4 py-2 text-sm bg-gray-400 text-white font-semibold rounded-md w-full sm:w-auto text-center">
                        Unavailable
                      </div>
                    )}
                    {/* Add Remix, Copy Link, Delete buttons here if needed, styled for Doodad.AI theme */}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-right">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 