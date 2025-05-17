// force commit
import React from "react";
import Link from "next/link";

export default function CharactersManagerPage() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-900 py-12 px-4">
      <div className="w-full max-w-4xl bg-blue-50 rounded-xl shadow-lg p-8 mt-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">Characters Manager</h1>
        <p className="text-gray-700 mb-4 text-center">(User-specific character management coming soon!)</p>
        <div className="flex flex-col gap-4 items-center">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700">+ Create New Character</button>
          <div className="w-full text-center text-gray-400 mt-8">No custom characters yet.</div>
        </div>
      </div>
      <div className="mt-8 flex gap-4">
        <Link href="/feed" className="text-blue-600 hover:underline">Go to Feed</Link>
        <Link href="/characters" className="text-blue-600 hover:underline">Browse Characters</Link>
      </div>
    </main>
  );
} 