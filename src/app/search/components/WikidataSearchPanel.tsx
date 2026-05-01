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
  const [selectedWikidata, setSelectedWikidata] = useState<WikidataItem | null>(null);

  // 全 Wikidata エンティティを uri で重複排除しつつ集約
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

  // フィルタ後の候補（未入力時は空）
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

  // 選択した Wikidata に紐づくマニフェスト
  const resultEntries = useMemo<ManifestIndexEntry[]>(() => {
    if (!selectedWikidata) return [];
    return entries.filter((entry) =>
      entry.wikidata.some((w) => w.uri === selectedWikidata.uri)
    );
  }, [selectedWikidata, entries]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedWikidata(null); }}
          placeholder="ラベル（例: 東大寺）または QID（例: Q276748）で絞り込み"
          className="input-field mb-0 flex-1"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSelectedWikidata(null); }}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--text-secondary)]">読み込み中...</p>}

      {/* Step 1: Wikidata 候補一覧 */}
      {!loading && !selectedWikidata && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            {!query.trim()
              ? 'ラベルまたは QID を入力してください。'
              : filtered.length > 0
              ? `${filtered.length} 件のエンティティが見つかりました。検索の起点にするエンティティを選択してください。`
              : '条件に一致するエンティティがありません。'}
          </p>

          <div className="flex flex-col gap-2">
            {filtered.map(({ wikidata: w, manifestUrls }) => (
              <button
                key={w.uri}
                onClick={() => setSelectedWikidata(w)}
                className="flex items-center gap-3 p-3 text-left rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
              >
                {w.thumbnail && (
                  <img
                    src={w.thumbnail}
                    alt={w.label}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
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
            ))}
          </div>
        </>
      )}

      {/* Step 2: 選択したエンティティに紐づくマニフェスト */}
      {!loading && selectedWikidata && (
        <>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-[var(--primary)]">
            {selectedWikidata.thumbnail && (
              <img
                src={selectedWikidata.thumbnail}
                alt={selectedWikidata.label}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-secondary)] mb-0.5">選択中のエンティティ</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedWikidata.label}</p>
              <p className="text-xs text-[var(--text-secondary)] font-mono">{selectedWikidata.uri}</p>
            </div>
            <button
              onClick={() => setSelectedWikidata(null)}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
            >
              ← 戻る
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            このエンティティが紐づく {resultEntries.length} 件のオブジェクト
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultEntries.map((entry) => (
              <ManifestCard
                key={entry.manifestUrl}
                entry={entry}
                highlightWikidataUri={selectedWikidata.uri}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
