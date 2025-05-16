'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-indigo-400 sm:text-6xl">
          Welcome to Queer-AI Commentary Generator
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl">
          Unleash the power of AI to create unique, engaging, and fabulously queer commentary for your videos. Transform your content with a click!
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/generator" // Link to the main application page
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get Started
          </Link>
          <Link
            href="/auth/signin" // Link to your sign-in page
            className="text-sm font-semibold leading-6 text-gray-300 hover:text-indigo-400"
          >
            Sign In <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}