'use client';

import { useState, useMemo } from 'react';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { WikidataItem } from '@/types/main';
import ManifestCard from './ManifestCard';

interface WikidataWithManifests {
  wikidata: WikidataItem;
  manifestUrls: string[];
}

interface Props {
  entries: ManifestIndexEntry[];
  loading: boolean;
}

const isQid = (q: string) => /^Q\d+$/i.test(q.trim());

export default function WikidataSearchPanel({ entries, loading }: Props) {
  const [query, setQuery] = useState('');
  const [selectedWikidata, setSelectedWikidata] = useState<WikidataItem[]>([]);

  const allWikidata = useMemo<WikidataWithManifests[]>(() => {
    const map = new Map<string, WikidataWithManifests>();
    entries.forEach((entry) => {
      entry.wikidata.forEach((w) => {
        if (!w.uri) return;
        if (map.has(w.uri)) {
          map.get(w.uri)!.manifestUrls.push(entry.manifestUrl);
        } else {
          map.set(w.uri, { wikidata: w, manifestUrls: [entry.manifestUrl] });
        }
      });
    });
    return Array.from(map.values());
  }, [entries]);

  const filtered = useMemo<WikidataWithManifests[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allWikidata.filter(({ wikidata: w }) => {
      if (isQid(query)) {
        const qid = w.uri.split('/').pop()?.toLowerCase() ?? '';
        return qid === q.toLowerCase();
      }
      return w.label.toLowerCase().includes(q);
    });
  }, [query, allWikidata]);

  // AND: 選択した全エンティティを含むマニフェスト
  const resultEntries = useMemo<ManifestIndexEntry[]>(() => {
    if (selectedWikidata.length === 0) return [];
    const uris = selectedWikidata.map((w) => w.uri);
    return entries.filter((entry) =>
      uris.every((uri) => entry.wikidata.some((w) => w.uri === uri))
    );
  }, [selectedWikidata, entries]);

  const toggleSelection = (w: WikidataItem) => {
    setSelectedWikidata((prev) => {
      const exists = prev.some((s) => s.uri === w.uri);
      return exists ? prev.filter((s) => s.uri !== w.uri) : [...prev, w];
    });
  };

  const isSelected = (uri: string) => selectedWikidata.some((s) => s.uri === uri);

  return (
    <div className="flex flex-col gap-6">
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ラベル（例: 東大寺）または QID（例: Q276748）で絞り込み"
          className="input-field mb-0 flex-1"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--text-secondary)]">読み込み中...</p>}

      {/* Selected chips */}
      {selectedWikidata.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              選択中（AND 検索）
            </p>
            <button
              onClick={() => setSelectedWikidata([])}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              すべて解除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedWikidata.map((w) => (
              <span
                key={w.uri}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
              >
                {w.thumbnail && (
                  <img src={w.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                )}
                {w.label}
                <button
                  onClick={() => toggleSelection(w)}
                  className="ml-0.5 leading-none opacity-70 hover:opacity-100"
                  aria-label={`${w.label}を解除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Candidate list */}
      {!loading && (
        <>
          {query.trim() ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {filtered.length > 0
                ? `${filtered.length} 件のエンティティが見つかりました。`
                : '条件に一致するエンティティがありません。'}
            </p>
          ) : (
            selectedWikidata.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">ラベルまたは QID を入力してください。</p>
            )
          )}

          <div className="flex flex-col gap-2">
            {filtered.map(({ wikidata: w, manifestUrls }) => {
              const selected = isSelected(w.uri);
              return (
                <button
                  key={w.uri}
                  onClick={() => toggleSelection(w)}
                  className={`flex items-center gap-3 p-3 text-left rounded-xl border transition-colors group ${
                    selected
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/10'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    selected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)]'
                  }`}>
                    {selected && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  {w.thumbnail && (
                    <img src={w.thumbnail} alt={w.label} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${selected ? 'text-[var(--primary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--primary)]'}`}>
                      {w.label}
                    </p>
                    <div className="flex gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                      {w.type && <span>{w.type}</span>}
                      <span className="font-mono opacity-60">{w.uri.split('/').pop()}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                    {manifestUrls.length} 件のオブジェクト
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Results */}
      {!loading && selectedWikidata.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {resultEntries.length > 0
              ? `条件に一致する ${resultEntries.length} 件のオブジェクト`
              : '選択したすべてのエンティティに一致するオブジェクトはありません。'}
          </p>
          {resultEntries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultEntries.map((entry) => (
                <ManifestCard
                  key={entry.manifestUrl}
                  entry={entry}
                  highlightWikidataUri={selectedWikidata[0]?.uri}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
