'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignIn from '@/app/components/SignIn';
import { FaCube, FaImage } from 'react-icons/fa';

export default function Home() {
  const router = useRouter();
  const [manifestUrl, setManifestUrl] = useState('');

  const openEditor = (mode: '2d' | '3d') => {
    const path = `/editor/${mode}${manifestUrl ? `?manifest=${encodeURIComponent(manifestUrl)}` : ''}`;
    router.push(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] h-14 px-6 flex justify-between items-center shadow-sm flex-shrink-0">
        <h1 className="m-0 text-lg sm:text-xl font-bold text-[var(--text-primary)]">IIIF Semantic Editor</h1>
        <nav className="flex items-center gap-4">
          <a href="/about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
            About
          </a>
          <div className="ml-2 border-l border-[var(--border)] pl-4">
            <SignIn />
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl flex flex-col items-center gap-10">

          <div className="text-center">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Open a IIIF Manifest</h2>
            <p className="text-[var(--text-secondary)] text-sm">Enter a IIIF Manifest URL and select an editor mode.</p>
          </div>

          <div className="w-full flex gap-2">
            <input
              type="text"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && manifestUrl) openEditor('3d'); }}
              placeholder="https://example.org/iiif/manifest"
              className="input-field mb-0 flex-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 w-full">
            <button
              onClick={() => openEditor('2d')}
              className="flex flex-col items-center gap-4 p-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-100 transition-colors">
                <FaImage className="w-8 h-8 text-[var(--primary)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)] text-lg">2D Editor</p>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Annotate images and canvases</p>
              </div>
            </button>

            <button
              onClick={() => openEditor('3d')}
              className="flex flex-col items-center gap-4 p-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-100 transition-colors">
                <FaCube className="w-8 h-8 text-[var(--primary)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)] text-lg">3D Editor</p>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Annotate 3D models and scenes</p>
              </div>
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
