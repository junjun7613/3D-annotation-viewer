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
  const [selectedBibs, setSelectedBibs] = useState<BibliographyItem[]>([]);

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

  const filteredBibs = useMemo<BibWithManifests[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q && propertyFilter === 'all') return [];
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

  // AND: 選択した全書誌を含むマニフェスト
  const resultEntries = useMemo<ManifestIndexEntry[]>(() => {
    if (selectedBibs.length === 0) return [];
    const ids = selectedBibs.map((b) => b.id);
    return entries.filter((entry) =>
      ids.every((id) => entry.bibliography.some((b) => b.id === id))
    );
  }, [selectedBibs, entries]);

  const toggleSelection = (bib: BibliographyItem) => {
    setSelectedBibs((prev) => {
      const exists = prev.some((s) => s.id === bib.id);
      return exists ? prev.filter((s) => s.id !== bib.id) : [...prev, bib];
    });
  };

  const isSelected = (id?: string) => selectedBibs.some((s) => s.id === id);

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
              onClick={() => setPropertyFilter(opt.value as BibliographyProperty | 'all')}
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="著者・タイトル・DOI・出版社などで絞り込み"
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
      {selectedBibs.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              選択中（AND 検索）
            </p>
            <button
              onClick={() => setSelectedBibs([])}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              すべて解除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedBibs.map((bib) => {
              const prop = bib.property ?? 'crm:P67_refers_to';
              return (
                <span
                  key={bib.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${CRM_BADGE[prop] ?? CRM_BADGE['crm:P67_refers_to']}`}
                >
                  <span className="max-w-[16rem] truncate">{bib.title || '（タイトルなし）'}</span>
                  <button
                    onClick={() => toggleSelection(bib)}
                    className="ml-0.5 leading-none opacity-70 hover:opacity-100"
                    aria-label={`${bib.title}を解除`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Bibliography candidate list */}
      {!loading && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            {!query.trim() && propertyFilter === 'all'
              ? 'CRM プロパティを選択するか、テキストを入力してください。'
              : filteredBibs.length > 0
              ? `${filteredBibs.length} 件の書誌が見つかりました。`
              : allBibs.length === 0
              ? '登録された書誌情報がありません。'
              : '条件に一致する書誌がありません。'}
          </p>

          <div className="flex flex-col gap-2">
            {filteredBibs.map(({ bib, manifestUrls }) => {
              const prop = bib.property ?? 'crm:P67_refers_to';
              const selected = isSelected(bib.id);
              return (
                <button
                  key={bib.id}
                  onClick={() => toggleSelection(bib)}
                  className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-colors group ${
                    selected
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/10'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                  <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    selected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)]'
                  }`}>
                    {selected && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${selected ? 'text-[var(--primary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--primary)]'}`}>
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

      {/* Results */}
      {!loading && selectedBibs.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {resultEntries.length > 0
              ? `条件に一致する ${resultEntries.length} 件のオブジェクト`
              : '選択したすべての書誌に一致するオブジェクトはありません。'}
          </p>
          {resultEntries.map((entry) => {
            const thumbnail = entry.thumbnailUrl ?? entry.wikidata.find((w) => w.thumbnail)?.thumbnail;
            return (
              <div key={entry.manifestUrl} className="flex gap-4 p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl items-center">
                <div className="w-28 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--secondary-bg)] flex items-center justify-center" style={{ minHeight: '4.5rem' }}>
                  {thumbnail ? (
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">No image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug mb-1">
                    {entry.manifestLabel ?? entry.manifestUrl.replace(/^https?:\/\//, '').slice(0, 60)}
                  </p>
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
      )}
    </div>
  );
}
