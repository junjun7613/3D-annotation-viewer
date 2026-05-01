'use client';

import { useState, useMemo } from 'react';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { BibliographyItem, BibliographyProperty } from '@/types/main';

const CRM_PROPERTIES: { value: BibliographyProperty | 'all'; label: string; description: string }[] = [
  { value: 'all', label: 'すべて', description: '' },
  { value: 'crm:P67_refers_to', label: 'P67 Refers to', description: '論文・書籍がこの対象に言及している' },
  { value: 'crm:P70_documents', label: 'P70 Documents', description: '報告書・記録がこの対象を記録している' },
  { value: 'crm:P65_shows_visual_item', label: 'P65 Shows visual item', description: '図録・報告書に図版・写真が掲載されている' },
];

const CRM_BADGE: Record<string, string> = {
  'crm:P67_refers_to': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'crm:P70_documents': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'crm:P65_shows_visual_item': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

interface BibWithManifests {
  bib: BibliographyItem;
  manifestUrls: string[];
}

interface Props {
  entries: ManifestIndexEntry[];
  loading: boolean;
}

export default function BibliographySearchPanel({ entries, loading }: Props) {
  const [query, setQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<BibliographyProperty | 'all'>('all');
  const [selectedBib, setSelectedBib] = useState<BibliographyItem | null>(null);

  // 全書誌を id で重複排除しつつ集約、どのマニフェストに紐づくかも保持
  const allBibs = useMemo<BibWithManifests[]>(() => {
    const bibMap = new Map<string, BibWithManifests>();
    entries.forEach((entry) => {
      entry.bibliography.forEach((bib) => {
        if (!bib.id) return;
        if (bibMap.has(bib.id)) {
          bibMap.get(bib.id)!.manifestUrls.push(entry.manifestUrl);
        } else {
          bibMap.set(bib.id, { bib, manifestUrls: [entry.manifestUrl] });
        }
      });
    });
    return Array.from(bibMap.values());
  }, [entries]);

  // フィルタ適用後の書誌候補
  const filteredBibs = useMemo<BibWithManifests[]>(() => {
    const q = query.trim().toLowerCase();
    return allBibs.filter(({ bib }) => {
      const propMatch =
        propertyFilter === 'all' ||
        (bib.property ?? 'crm:P67_refers_to') === propertyFilter;
      if (!propMatch) return false;
      if (!q) return true;
      return (
        bib.author?.toLowerCase().includes(q) ||
        bib.title?.toLowerCase().includes(q) ||
        bib.doi?.toLowerCase().includes(q) ||
        bib.year?.includes(q) ||
        bib.publisher?.toLowerCase().includes(q) ||
        bib.containerTitle?.toLowerCase().includes(q)
      );
    });
  }, [query, propertyFilter, allBibs]);

  // 選択した書誌に紐づくマニフェストのエントリ
  const resultEntries = useMemo<ManifestIndexEntry[]>(() => {
    if (!selectedBib) return [];
    return entries.filter((entry) =>
      entry.bibliography.some((b) => b.id === selectedBib.id)
    );
  }, [selectedBib, entries]);

  const propLabel = (prop?: string) =>
    CRM_PROPERTIES.find((o) => o.value === (prop ?? 'crm:P67_refers_to'))?.label ?? prop ?? '';

  return (
    <div className="flex flex-col gap-6">

      {/* CRM property filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">CIDOC CRM プロパティ</p>
        <div className="flex flex-wrap gap-2">
          {CRM_PROPERTIES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPropertyFilter(opt.value as BibliographyProperty | 'all'); setSelectedBib(null); }}
              title={opt.description}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                propertyFilter === opt.value
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {propertyFilter !== 'all' && (
          <p className="text-xs text-[var(--text-secondary)] mt-1.5">
            {CRM_PROPERTIES.find((o) => o.value === propertyFilter)?.description}
          </p>
        )}
      </div>

      {/* Text filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedBib(null); }}
          placeholder="著者・タイトル・DOI・出版社などで絞り込み"
          className="input-field mb-0 flex-1"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSelectedBib(null); }}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--text-secondary)]">読み込み中...</p>}

      {/* Step 1: 書誌候補一覧 */}
      {!loading && !selectedBib && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            {filteredBibs.length > 0
              ? `${filteredBibs.length} 件の書誌が見つかりました。検索の起点にする書誌を選択してください。`
              : allBibs.length === 0
              ? '登録された書誌情報がありません。'
              : '条件に一致する書誌がありません。'}
          </p>

          <div className="flex flex-col gap-2">
            {filteredBibs.map(({ bib, manifestUrls }) => {
              const prop = bib.property ?? 'crm:P67_refers_to';
              return (
                <button
                  key={bib.id}
                  onClick={() => setSelectedBib(bib)}
                  className="flex items-start gap-3 p-3 text-left rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] leading-snug">
                      {bib.title || '（タイトルなし）'}
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)] mt-0.5">
                      {bib.author && <span>{bib.author}</span>}
                      {bib.year && <span>{bib.year}</span>}
                      {bib.containerTitle && <span>{bib.containerTitle}</span>}
                      {bib.doi && <span>DOI: {bib.doi}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${CRM_BADGE[prop] ?? CRM_BADGE['crm:P67_refers_to']}`}>
                      {propLabel(prop)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {manifestUrls.length} 件のオブジェクト
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2: 選択した書誌に紐づくマニフェスト */}
      {!loading && selectedBib && (
        <>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-[var(--primary)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-secondary)] mb-0.5">選択中の書誌</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedBib.title}</p>
              {selectedBib.author && (
                <p className="text-xs text-[var(--text-secondary)]">{selectedBib.author}{selectedBib.year ? `（${selectedBib.year}）` : ''}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedBib(null)}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
            >
              ← 戻る
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            この書誌が紐づく {resultEntries.length} 件のオブジェクト
          </p>

          <div className="flex flex-col gap-3">
            {resultEntries.map((entry) => {
              const thumbnail = entry.thumbnailUrl ?? entry.wikidata.find((w) => w.thumbnail)?.thumbnail;
              return (
                <div key={entry.manifestUrl} className="flex gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl items-center">
                  <div className="w-28 h-18 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--secondary-bg)] flex items-center justify-center" style={{ minHeight: '4.5rem' }}>
                    {thumbnail ? (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)]">No image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-secondary)] font-mono truncate">{entry.manifestUrl}</p>
                    {entry.wikidata.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.wikidata.slice(0, 4).map((w) => (
                          <span key={w.uri} className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--text-secondary)]">
                            {w.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <a
                    href={`/editor/3d?manifest=${encodeURIComponent(entry.manifestUrl)}`}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    3D Editorで開く
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
