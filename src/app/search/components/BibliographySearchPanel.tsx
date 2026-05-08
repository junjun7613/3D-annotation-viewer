'use client';

import { useState, useMemo } from 'react';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { BibliographyItem, BibliographyRoleType, ReferenceLevel } from '@/types/main';

// roleType から CRM プロパティを導出（後方互換）
function effectiveRoleType(bib: BibliographyItem): BibliographyRoleType {
  if (bib.roleType) return bib.roleType;
  if (bib.property === 'crm:P67_refers_to') return ':ResearchLiterature';
  return ':PrimarySource';
}

const ROLE_OPTIONS: { value: BibliographyRoleType | 'all'; label: string; description: string }[] = [
  { value: 'all', label: 'すべて', description: '' },
  { value: ':PrimarySource', label: 'Primary Source', description: '一次資料・報告書' },
  { value: ':SurveyReport', label: 'Survey Report', description: '調査報告書' },
  { value: ':ResearchLiterature', label: 'Research Literature', description: '研究論文・書籍' },
];

const ROLE_BADGE: Record<string, string> = {
  ':PrimarySource': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ':SurveyReport': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  ':ResearchLiterature': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const ROLE_LABEL: Record<string, string> = {
  ':PrimarySource': 'Primary Source',
  ':SurveyReport': 'Survey Report',
  ':ResearchLiterature': 'Research Literature',
};

const REF_LEVEL_BADGE: Record<string, string> = {
  ':DirectReference': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ':IndirectReference': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const REF_LEVEL_LABEL: Record<string, string> = {
  ':DirectReference': 'Direct',
  ':IndirectReference': 'Indirect',
};

type RefFilter = 'all' | ReferenceLevel;

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
  const [roleFilter, setRoleFilter] = useState<BibliographyRoleType | 'all'>('all');
  const [refFilter, setRefFilter] = useState<RefFilter>('all');
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
    if (!q) return [];
    return allBibs.filter(({ bib }) => {
      const roleMatch = roleFilter === 'all' || effectiveRoleType(bib) === roleFilter;
      if (!roleMatch) return false;
      const refMatch = refFilter === 'all' || (bib.referenceLevel ?? ':DirectReference') === refFilter;
      if (!refMatch) return false;
      return (
        bib.author?.toLowerCase().includes(q) ||
        bib.title?.toLowerCase().includes(q) ||
        bib.doi?.toLowerCase().includes(q) ||
        bib.year?.includes(q) ||
        bib.publisher?.toLowerCase().includes(q) ||
        bib.containerTitle?.toLowerCase().includes(q)
      );
    });
  }, [query, roleFilter, refFilter, allBibs]);

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

  return (
    <div className="flex flex-col gap-6">

      {/* Role type filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">役割種別</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value as BibliographyRoleType | 'all')}
              title={opt.description}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                roleFilter === opt.value
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {roleFilter !== 'all' && (
          <p className="text-xs text-[var(--text-secondary)] mt-1.5">
            {ROLE_OPTIONS.find((o) => o.value === roleFilter)?.description}
          </p>
        )}
      </div>

      {/* Reference level filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">参照レベル</p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'all' as const, label: 'すべて' },
            { value: ':DirectReference' as const, label: 'Direct（インスタンスレベル）' },
            { value: ':IndirectReference' as const, label: 'Indirect（カテゴリレベル）' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRefFilter(value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                refFilter === value
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
              const role = effectiveRoleType(bib);
              const ref = bib.referenceLevel ?? ':DirectReference';
              return (
                <span
                  key={bib.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[role] ?? ROLE_BADGE[':PrimarySource']}`}
                >
                  <span className="max-w-[16rem] truncate">{bib.title || '（タイトルなし）'}</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${REF_LEVEL_BADGE[ref]}`}>
                    {REF_LEVEL_LABEL[ref] ?? ref}
                  </span>
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
            {!query.trim()
              ? 'テキストを入力してください。'
              : filteredBibs.length > 0
              ? `${filteredBibs.length} 件の書誌が見つかりました。`
              : allBibs.length === 0
              ? '登録された書誌情報がありません。'
              : '条件に一致する書誌がありません。'}
          </p>

          <div className="flex flex-col gap-2">
            {filteredBibs.map(({ bib, manifestUrls }) => {
              const role = effectiveRoleType(bib);
              const ref = bib.referenceLevel ?? ':DirectReference';
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[role] ?? ROLE_BADGE[':PrimarySource']}`}>
                      {ROLE_LABEL[role] ?? role}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${REF_LEVEL_BADGE[ref]}`}>
                      {REF_LEVEL_LABEL[ref] ?? ref}
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
