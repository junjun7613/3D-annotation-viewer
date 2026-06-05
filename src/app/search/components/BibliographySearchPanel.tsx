'use client';

import { useState, useMemo } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { BibliographyItem, BibliographyRoleType, BibliographicRelationType, DirectBibliographicRelation, ConceptualBibliographicRelation } from '@/types/main';

function effectiveRoleType(bib: BibliographyItem): BibliographyRoleType {
  if (bib.roleType) return bib.roleType;
  if (bib.property === 'crm:P67_refers_to') return ':ResearchLiterature';
  return ':PrimarySource';
}

const ROLE_OPTIONS: { value: BibliographyRoleType | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: ':PrimarySource', label: 'Primary Source' },
  { value: ':SurveyReport', label: 'Survey Report' },
  { value: ':ResearchLiterature', label: 'Research Literature' },
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

const DIRECT_RELATION_OPTIONS: { value: DirectBibliographicRelation; label: string }[] = [
  // Generic Direct（Bib○）
  { value: ':mentions',    label: 'Mentions' },
  { value: ':illustrates', label: 'Illustrates' },
  // Bibliographic Direct
  { value: ':describes',   label: 'Describes' },
  { value: ':reports',     label: 'Reports' },
  { value: ':analyzes',    label: 'Analyzes' },
  { value: ':catalogues',  label: 'Catalogues' },
  { value: ':transcribes', label: 'Transcribes' },
  { value: ':translates',  label: 'Translates' },
];

const CONCEPTUAL_RELATION_OPTIONS: { value: ConceptualBibliographicRelation; label: string }[] = [
  // Generic Conceptual（Bib○）
  { value: ':contextualizes',    label: 'Contextualizes' },
  { value: ':compares_with',     label: 'Compares With' },
  { value: ':related_to_concept', label: 'Related to Concept' },
  // Bibliographic Conceptual
  { value: ':discusses_related_concept', label: 'Discusses Related Concept' },
  { value: ':provides_typology',         label: 'Provides Typology' },
  // Authority Conceptual（Bib○）
  { value: ':associated_with_period',   label: 'Assoc. Period' },
  { value: ':associated_with_region',   label: 'Assoc. Region' },
  { value: ':associated_with_person',   label: 'Assoc. Person' },
  { value: ':associated_with_culture',  label: 'Assoc. Culture' },
  // 後方互換（旧データ表示のみ）
  { value: ':relevant_to_period', label: 'Relevant to Period (旧)' },
  { value: ':relevant_to_region', label: 'Relevant to Region (旧)' },
];

const RELATION_BADGE: Record<string, string> = {
  direct: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  conceptual: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const DIRECT_VALUES = new Set<string>(DIRECT_RELATION_OPTIONS.map((o) => o.value));
const RELATION_LABEL: Record<string, string> = Object.fromEntries([
  ...DIRECT_RELATION_OPTIONS.map((o) => [o.value, o.label]),
  ...CONCEPTUAL_RELATION_OPTIONS.map((o) => [o.value, o.label]),
]);

type RelationFilter = 'all' | 'direct' | 'conceptual' | BibliographicRelationType;

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
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [conceptualExpanded, setConceptualExpanded] = useState(false);
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

  const matchesRelationFilter = (bib: BibliographyItem): boolean => {
    if (relationFilter === 'all') return true;
    const types = bib.relationTypes ?? [];
    if (types.length === 0) return false;
    if (relationFilter === 'direct') return types.some((t) => DIRECT_VALUES.has(t));
    if (relationFilter === 'conceptual') return types.some((t) => !DIRECT_VALUES.has(t));
    return types.includes(relationFilter as BibliographicRelationType);
  };

  const filteredBibs = useMemo<BibWithManifests[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allBibs.filter(({ bib }) => {
      if (roleFilter !== 'all' && effectiveRoleType(bib) !== roleFilter) return false;
      if (!matchesRelationFilter(bib)) return false;
      return (
        bib.author?.toLowerCase().includes(q) ||
        bib.title?.toLowerCase().includes(q) ||
        bib.doi?.toLowerCase().includes(q) ||
        bib.year?.includes(q) ||
        bib.publisher?.toLowerCase().includes(q) ||
        bib.containerTitle?.toLowerCase().includes(q)
      );
    });
  }, [query, roleFilter, relationFilter, allBibs]);

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

  const isConceptualActive =
    relationFilter === 'conceptual' ||
    CONCEPTUAL_RELATION_OPTIONS.some((o) => o.value === relationFilter);

  return (
    <div className="flex flex-col gap-6">

      {/* Document type filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">文書タイプ</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value as BibliographyRoleType | 'all')}
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
      </div>

      {/* Relation type filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">関係性タイプ</p>
        <div className="flex flex-col gap-1">
          {/* All */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setRelationFilter('all'); setConceptualExpanded(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                relationFilter === 'all'
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              すべて
            </button>

            {/* Direct group */}
            <button
              onClick={() => { setRelationFilter('direct'); setConceptualExpanded(false); }}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                relationFilter === 'direct' || DIRECT_RELATION_OPTIONS.some((o) => o.value === relationFilter)
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              Direct（直接関連）
            </button>

            {/* Conceptual group + expand toggle */}
            <div className={`inline-flex rounded-lg border overflow-hidden transition-colors ${
              isConceptualActive ? 'border-[var(--primary)]' : 'border-[var(--border)]'
            }`}>
              <button
                onClick={() => setRelationFilter('conceptual')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  isConceptualActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                Conceptual（概念的関連）
              </button>
              <button
                onClick={() => setConceptualExpanded((v) => !v)}
                className={`px-2 py-1.5 border-l transition-colors ${
                  isConceptualActive
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
                aria-label={conceptualExpanded ? 'サブタイプを閉じる' : 'サブタイプを開く'}
              >
                {conceptualExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
              </button>
            </div>
          </div>

          {/* Direct sub-types */}
          {(relationFilter === 'direct' || DIRECT_RELATION_OPTIONS.some((o) => o.value === relationFilter)) && (
            <div className="flex flex-wrap gap-2 pl-4 pt-1">
              {DIRECT_RELATION_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRelationFilter(value)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    relationFilter === value
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Conceptual sub-types */}
          {conceptualExpanded && (
            <div className="flex flex-wrap gap-2 pl-4 pt-1">
              {CONCEPTUAL_RELATION_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRelationFilter(value)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    relationFilter === value
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
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
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">選択中（AND 検索）</p>
            <button onClick={() => setSelectedBibs([])} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              すべて解除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedBibs.map((bib) => {
              const role = effectiveRoleType(bib);
              return (
                <span key={bib.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[role] ?? ROLE_BADGE[':PrimarySource']}`}>
                  <span className="max-w-[16rem] truncate">{bib.title || '（タイトルなし）'}</span>
                  <button onClick={() => toggleSelection(bib)} className="ml-0.5 leading-none opacity-70 hover:opacity-100" aria-label={`${bib.title}を解除`}>×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate list */}
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
              const selected = isSelected(bib.id);
              const relationTypes = bib.relationTypes ?? [];
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
                    {relationTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {relationTypes.map((t) => (
                          <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full ${DIRECT_VALUES.has(t) ? RELATION_BADGE.direct : RELATION_BADGE.conceptual}`}>
                            {RELATION_LABEL[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[role] ?? ROLE_BADGE[':PrimarySource']}`}>
                      {ROLE_LABEL[role] ?? role}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{manifestUrls.length} 件のオブジェクト</span>
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
                        <span key={w.uri} className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--text-secondary)]">{w.label}</span>
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
