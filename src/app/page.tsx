'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="flex flex-col md:flex-row items-center gap-10 max-w-5xl w-full">
          <div className="flex-1 text-center md:text-left space-y-6">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-indigo-400">
              Queer-AI Commentary Generator
            </h1>
            <p className="text-lg sm:text-2xl text-gray-300 max-w-xl">
              Unleash the power of AI to create unique, engaging, and fabulously queer commentary for your videos. Transform your content with a click!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mt-6">
              <Link
                href="/generator"
                className="rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get Started
              </Link>
              <Link
                href="/auth/signin"
                className="text-lg font-semibold leading-6 text-gray-300 hover:text-indigo-400 flex items-center gap-1"
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <Image src="/globe.svg" alt="Queer AI Globe" width={220} height={220} className="drop-shadow-xl" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full max-w-5xl py-16 px-4">
        <h2 className="text-3xl font-bold text-indigo-300 mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center text-center shadow-lg">
            <Image src="/file.svg" alt="Upload" width={48} height={48} className="mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-indigo-200">1. Paste a Video Link</h3>
            <p className="text-gray-400">Enter a YouTube video URL to get started. No downloads, no hassle.</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center text-center shadow-lg">
            <Image src="/window.svg" alt="Customize" width={48} height={48} className="mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-indigo-200">2. Choose Personas</h3>
            <p className="text-gray-400">Pick or create fabulous AI commentators to add unique flair to your video.</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center text-center shadow-lg">
            <Image src="/globe.svg" alt="Generate" width={48} height={48} className="mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-indigo-200">3. Generate & Share</h3>
            <p className="text-gray-400">Let the AI work its magic! Download or share your new commentary video in seconds.</p>
          </div>
        </div>
      </section>

      {/* Examples Carousel Section */}
      <section className="w-full max-w-5xl py-16 px-4">
        <h2 className="text-3xl font-bold text-indigo-300 mb-8 text-center">See It In Action</h2>
        {/* Simple Carousel Placeholder */}
        <div className="relative w-full flex items-center justify-center">
          <div className="w-full md:w-3/4 bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center">
            {/* Replace with dynamic video carousel in the future */}
            <div className="aspect-video w-full bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xl">
              Example Video Carousel Coming Soon
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 bg-indigo-600 rounded text-white text-sm hover:bg-indigo-500" disabled>Prev</button>
              <button className="px-3 py-1 bg-indigo-600 rounded text-white text-sm hover:bg-indigo-500" disabled>Next</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full max-w-5xl py-16 px-4">
        <h2 className="text-3xl font-bold text-indigo-300 mb-8 text-center">What Our Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center text-center">
            <p className="text-lg text-gray-200 italic mb-4">“Absolutely fabulous! My videos have never been this entertaining.”</p>
            <span className="text-indigo-400 font-semibold">— Alex Q.</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center text-center">
            <p className="text-lg text-gray-200 italic mb-4">“The AI personas are hilarious and spot-on. Love the creativity!”</p>
            <span className="text-indigo-400 font-semibold">— Jamie L.</span>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex flex-col items-center text-center">
            <p className="text-lg text-gray-200 italic mb-4">“Super easy to use and the results are amazing. Highly recommend!”</p>
            <span className="text-indigo-400 font-semibold">— Taylor S.</span>
          </div>
        </div>
      </section>
    </main>
  );
}