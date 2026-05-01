'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PiGraphLight } from 'react-icons/pi';
import { useAuth } from '@/context/auth';
import { useManifestIndex, type SearchScope } from './hooks/useManifestIndex';
import WikidataSearchPanel from './components/WikidataSearchPanel';
import MapSearchPanel from './components/MapSearchPanel';
import BibliographySearchPanel from './components/BibliographySearchPanel';

type Tab = 'wikidata' | 'map' | 'bibliography';

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('wikidata');
  const [scope, setScope] = useState<SearchScope>('all');
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);

  // scope=mine に切り替えたときだけトークンを取得
  useEffect(() => {
    if (scope === 'mine' && user) {
      user.getIdToken().then(setIdToken).catch(() => setIdToken(null));
    } else if (scope === 'all') {
      setIdToken(undefined);
    }
  }, [scope, user]);

  const { entries, loading } = useManifestIndex(scope, idToken);

  const canUseMine = !!user;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] h-14 px-6 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <PiGraphLight className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Semantic Search</h1>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium"
        >
          ← Back
        </button>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Scope toggle */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-[var(--text-secondary)]">対象データ：</span>
          <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
            <button
              onClick={() => setScope('all')}
              className={`px-4 py-1.5 transition-colors ${
                scope === 'all'
                  ? 'bg-[var(--primary)] text-white font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              全データ
            </button>
            <button
              onClick={() => canUseMine && setScope('mine')}
              title={!canUseMine ? 'ログインが必要です' : ''}
              className={`px-4 py-1.5 transition-colors border-l border-[var(--border)] ${
                scope === 'mine'
                  ? 'bg-[var(--primary)] text-white font-medium'
                  : canUseMine
                  ? 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                  : 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
              }`}
            >
              自分のデータのみ
            </button>
          </div>
          {!canUseMine && (
            <span className="text-xs text-[var(--text-secondary)]">（ログインすると自分のデータのみ表示できます）</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[var(--border)]">
          {([
            { key: 'wikidata', label: 'Wikidata 検索' },
            { key: 'map', label: 'マップ検索' },
            { key: 'bibliography', label: '書誌検索' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'wikidata' && (
          <WikidataSearchPanel entries={entries} loading={loading} />
        )}
        {tab === 'map' && (
          <MapSearchPanel entries={entries} loading={loading} />
        )}
        {tab === 'bibliography' && (
          <BibliographySearchPanel entries={entries} loading={loading} />
        )}
      </main>
    </div>
  );
}
