'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from "next/link";

// Define interface for result state
interface GeneratorResult {
  summary: string;
  // Add other properties as needed
}

export default function GeneratorPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [character, setCharacter] = useState("");
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    // Simulate API call
    setTimeout(() => {
      setResult({
        summary: "Sample AI-generated commentary for your video!",
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-900 py-12 px-4">
      <div className="w-full max-w-2xl bg-blue-50 rounded-xl shadow-lg p-8 mt-8">
        <div className="w-full max-w-4xl flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-center text-blue-600">Make a video now</h1>
          <div className="flex space-x-2">
            <Link href="/feed" className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition-colors duration-150 text-sm">
              View Feed
            </Link>
            <Link href="/characters" className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-150 text-sm">
              Manage Characters
            </Link>
          </div>
        </div>
        <p className="text-center text-gray-500">Create unique AI-powered commentary for your videos!</p>
        <div className="mb-4">
          <label htmlFor="videoUrl" className="block text-sm font-medium text-blue-700 mb-1">YouTube Video URL</label>
          <input
            id="videoUrl"
            type="url"
            className="w-full p-3 border border-blue-200 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="character" className="block text-sm font-medium text-blue-700 mb-1">Character Name</label>
          <input
            id="character"
            type="text"
            className="w-full p-3 border border-blue-200 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. FabOne, SarcasticSue, etc."
            value={character}
            onChange={e => setCharacter(e.target.value)}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !videoUrl || !character}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
        >
          {loading ? "Generating..." : "Generate Commentary"}
        </button>
        {result && (
          <div className="mt-8 p-4 bg-white border border-blue-100 rounded-lg shadow text-center">
            <h2 className="text-lg font-bold text-blue-600 mb-2">AI Commentary</h2>
            <p className="text-gray-800">{result.summary}</p>
          </div>
        )}
      </div>
    </main>
  );
} 