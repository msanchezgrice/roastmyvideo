import React from "react";
import Image from 'next/image';

const publicCharacters = [
  {
    name: 'FabOne',
    style: 'Witty and insightful',
    description: 'Knows all about classic internet memes and always has a clever take.'
  },
  {
    name: 'SarcasticSue',
    style: 'Curious and slightly sarcastic',
    description: 'Secretly a history buff with a PhD in ancient civilizations.'
  },
  {
    name: 'ExcitableEddie',
    style: 'Energetic and easily amazed',
    description: 'Easily impressed by anything new or shiny.'
  },
  {
    name: 'ProfessorPrudence',
    style: 'Calm and analytical',
    description: 'Specializes in early 20th-century cinema.'
  },
  {
    name: 'BubblyBeatrice',
    style: 'Cheerful and optimistic',
    description: 'Runs a popular motivational YouTube channel.'
  },
  {
    name: 'GrumpyGus',
    style: 'Cynical curmudgeon',
    description: 'Used to be a roadie for a famous rock band in the 70s.'
  },
  {
    name: 'ValleyVera',
    style: '80s valley scene',
    description: 'Still owns a Members Only jacket and a working Walkman.'
  },
  {
    name: 'NoirNarrator',
    style: 'Dramatic detective',
    description: 'Haunted by one case he could never solve... the case of the missing stapler.'
  },
  {
    name: 'CaptainCommentary',
    style: 'Heroic announcer',
    description: 'Once won a hot dog eating contest by consuming 70 hot dogs.'
  },
];

export default function CharactersPage() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-white text-gray-900 py-16 px-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-8 text-center">Characters</h1>
      <p className="text-lg text-gray-600 mb-12 text-center max-w-2xl">Explore our fun and diverse set of AI characters! Use them to add unique commentary styles to your videos. More coming soon.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full max-w-6xl">
        {publicCharacters.map((char, idx) => (
          <div key={idx} className="bg-blue-50 rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="mb-4">
              <Image src="/globe.svg" alt={char.name} width={48} height={48} />
            </div>
            <h2 className="text-xl font-bold text-blue-600 mb-1">{char.name}</h2>
            <p className="text-blue-500 font-semibold mb-2">{char.style}</p>
            <p className="text-gray-700 text-sm">{char.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
} 