// force commit
import React from "react";
import Link from "next/link";

const sampleFeed = [
  {
    id: 1,
    summary: "A hilarious take on a cat video by FabOne and SarcasticSue.",
    status: "completed",
    videoUrl: "#",
    created_at: "2024-06-01T12:00:00Z",
    characters: ["FabOne", "SarcasticSue"],
  },
  {
    id: 2,
    summary: "ExcitableEddie and ProfessorPrudence break down a science experiment.",
    status: "completed",
    videoUrl: "#",
    created_at: "2024-06-02T15:30:00Z",
    characters: ["ExcitableEddie", "ProfessorPrudence"],
  },
];

export default function FeedPage() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-900 py-12 px-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-blue-600 mb-8 text-center">Feed</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sampleFeed.map(entry => (
            <div key={entry.id} className="bg-blue-50 rounded-xl shadow-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-blue-600 mb-2 truncate" title={entry.summary}>{entry.summary}</h3>
              <p className="text-xs text-gray-500 mb-1">Characters: {entry.characters.join(", ")}</p>
              <p className="text-xs text-gray-400 mb-1">Status: <span className="font-semibold text-green-500">{entry.status}</span></p>
              <a href={entry.videoUrl} className="mt-2 block w-full text-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-150 text-sm">Watch Video</a>
              <p className="text-xs text-gray-400 mt-2 text-right">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/generator" className="text-blue-600 hover:underline">Generate New</Link>
          <Link href="/characters" className="text-blue-600 hover:underline">Browse Characters</Link>
        </div>
      </div>
    </main>
  );
} 