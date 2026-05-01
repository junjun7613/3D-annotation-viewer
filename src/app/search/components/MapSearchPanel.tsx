'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import ManifestCard from './ManifestCard';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface Props {
  entries: ManifestIndexEntry[];
  loading: boolean;
}

export default function MapSearchPanel({ entries, loading }: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const geoEntries = entries.filter((e) => e.geoPoints.length > 0);
  const selectedEntry = entries.find((e) => e.manifestUrl === selectedUrl) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <p className="text-sm text-[var(--text-secondary)]">読み込み中...</p>
      )}
      {!loading && geoEntries.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">地理情報を持つマニフェストがありません。</p>
      )}

      {!loading && geoEntries.length > 0 && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            {geoEntries.length} 件のマニフェストに地理情報があります。マーカーをクリックして詳細を表示します。
          </p>
          <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
              オブジェクト位置情報
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" />
              Wikidata エンティティ位置
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
              選択中
            </span>
          </div>

          <div className="flex gap-4 h-[520px]">
            {/* Map */}
            <div className="flex-1 rounded-xl overflow-hidden border border-[var(--border)]">
              <MapView
                entries={geoEntries}
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </div>

            {/* Side panel */}
            <div className="w-72 flex-shrink-0 overflow-y-auto">
              {selectedEntry ? (
                <ManifestCard entry={selectedEntry} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-[var(--text-secondary)] text-center px-4">
                  マップ上のマーカーをクリックするとここに詳細が表示されます
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
