'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message');

  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'white', minHeight: '100vh', backgroundColor: '#111827' /* bg-gray-900 */, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '2em', marginBottom: '20px' }}>Authentication Error</h1>
      <p style={{ marginBottom: '10px' }}>There was a problem authenticating your session.</p>
      {errorMessage && <p style={{ color: '#f87171' /* Tailwind red-400 */, marginBottom: '20px', border: '1px solid red', padding: '10px', borderRadius: '5px' }}>Error: {decodeURIComponent(errorMessage)}</p>}
      <div style={{ marginTop: '20px'}}>
        <Link href="/auth/signin" style={{ color: '#93c5fd' /* Tailwind blue-300 */, marginRight: '15px', textDecoration: 'underline' }}>Try signing in again</Link>
        <br /> <br />
        <Link href="/" style={{ color: '#d1d5db' /* Tailwind gray-300 */, textDecoration: 'underline' }}>Go to homepage</Link>
      </div>
    </div>
  );
} 