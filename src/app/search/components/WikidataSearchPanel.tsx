'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { WikidataItem, AuthorityRelationType, DirectAuthorityRelation, ConceptualAuthorityRelation } from '@/types/main';
import ManifestCard from './ManifestCard';

interface WikidataWithManifests {
  wikidata: WikidataItem;
  manifestUrls: string[];
}

interface Props {
  entries: ManifestIndexEntry[];
  loading: boolean;
}

const DIRECT_TYPES = new Set<DirectAuthorityRelation>([
  ':mentions', ':depicts',
  ':identifies',
  ':depicts_object', ':depicts_person', ':depicts_place', ':depicts_event',
  ':mentions_person', ':mentions_place', ':mentions_event',
]);

const RELATION_LABELS: Record<string, string> = {
  // Generic Direct
  ':mentions': 'Mentions',
  ':depicts':  'Depicts',
  // Authority Direct
  ':identifies': 'Identifies',
  ':depicts_object': 'Depicts Object',
  ':depicts_person': 'Depicts Person',
  ':depicts_place':  'Depicts Place',
  ':depicts_event':  'Depicts Event',
  ':mentions_person': 'Mentions Person',
  ':mentions_place':  'Mentions Place',
  ':mentions_event':  'Mentions Event',
  // Generic Conceptual
  ':contextualizes':    'Contextualizes',
  ':compares_with':     'Compares With',
  ':related_to_concept':'Related Concept',
  // Authority Conceptual
  ':associated_with_period':  'Assoc. Period',
  ':associated_with_region':  'Assoc. Region',
  ':associated_with_person':  'Assoc. Person',
  ':associated_with_culture': 'Assoc. Culture',
  ':classified_as': 'Classified As',
  ':has_type':      'Has Type',
  ':written_in_language': 'Language',
  ':uses_script':   'Script',
  ':created_by':    'Created By',
  ':discovered_by': 'Discovered By',
  ':discovered_at': 'Discovered At',
};

type RelationFilter = 'all' | 'direct' | 'conceptual' | AuthorityRelationType;

const isQid = (q: string) => /^Q\d+$/i.test(q.trim());

async function searchWikidataQids(query: string): Promise<Set<string>> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', query);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('uselang', 'ja');
  url.searchParams.set('type', 'item');
  url.searchParams.set('limit', '50');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url.toString());
  const data = await res.json();
  const qids = new Set<string>();
  for (const item of data.search ?? []) {
    if (item.id) qids.add(item.id);
  }
  return qids;
}

export default function WikidataSearchPanel({ entries, loading }: Props) {
  const [query, setQuery] = useState('');
  const [selectedWikidata, setSelectedWikidata] = useState<WikidataItem[]>([]);
  const [wikidataQids, setWikidataQids] = useState<Set<string> | null>(null);
  const [wikidataSearching, setWikidataSearching] = useState(false);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [conceptualExpanded, setConceptualExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const q = query.trim();
    if (!q) { setWikidataQids(null); return; }
    if (isQid(q)) { setWikidataQids(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setWikidataSearching(true);
      try {
        const qids = await searchWikidataQids(q);
        setWikidataQids(qids);
      } catch {
        setWikidataQids(null);
      } finally {
        setWikidataSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const matchesRelationFilter = (w: WikidataItem): boolean => {
    if (relationFilter === 'all') return true;
    const types = w.relationTypes ?? [];
    if (types.length === 0) return false;
    if (relationFilter === 'direct') return types.some((t) => DIRECT_TYPES.has(t as DirectAuthorityRelation));
    if (relationFilter === 'conceptual') return types.some((t) => !DIRECT_TYPES.has(t as DirectAuthorityRelation));
    return types.includes(relationFilter as AuthorityRelationType);
  };

  const filtered = useMemo<WikidataWithManifests[]>(() => {
    const q = query.trim();
    if (!q) return [];

    let candidates = allWikidata;

    if (isQid(q)) {
      candidates = candidates.filter(({ wikidata: w }) => {
        const qid = w.uri.split('/').pop()?.toUpperCase() ?? '';
        return qid === q.toUpperCase();
      });
    } else if (wikidataQids !== null) {
      candidates = candidates.filter(({ wikidata: w }) => {
        const qid = w.uri.split('/').pop() ?? '';
        return wikidataQids.has(qid);
      });
    } else {
      candidates = candidates.filter(({ wikidata: w }) =>
        w.label.toLowerCase().includes(q.toLowerCase())
      );
    }

    candidates = candidates.filter(({ wikidata: w }) => matchesRelationFilter(w));

    return candidates;
  }, [query, allWikidata, wikidataQids, relationFilter]);

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

  const statusMessage = () => {
    const q = query.trim();
    if (!q) return selectedWikidata.length === 0 ? 'ラベルまたは QID を入力してください。' : null;
    if (wikidataSearching) return 'Wikidata を検索中...';
    if (filtered.length > 0) return `${filtered.length} 件のエンティティが見つかりました。`;
    return '条件に一致するエンティティがありません。';
  };

  const CONCEPTUAL_OPTIONS: { value: ConceptualAuthorityRelation; label: string }[] = [
    { value: ':contextualizes',    label: 'Contextualizes' },
    { value: ':compares_with',     label: 'Compares With' },
    { value: ':related_to_concept', label: 'Related Concept' },
    { value: ':associated_with_period',  label: 'Assoc. Period' },
    { value: ':associated_with_region',  label: 'Assoc. Region' },
    { value: ':associated_with_person',  label: 'Assoc. Person' },
    { value: ':associated_with_culture', label: 'Assoc. Culture' },
    { value: ':classified_as', label: 'Classified As' },
    { value: ':has_type',      label: 'Has Type' },
    { value: ':written_in_language', label: 'Language' },
    { value: ':uses_script',   label: 'Script' },
    { value: ':created_by', label: 'Created By' },
    { value: ':discovered_by', label: 'Discovered By' },
    { value: ':discovered_at', label: 'Discovered At' },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Relation filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">関係種別</p>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'all' as const, label: 'すべて' },
              { value: 'direct' as const, label: 'Direct — 直接関連' },
            ] as { value: RelationFilter; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setRelationFilter(value); setConceptualExpanded(false); }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  relationFilter === value
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                {label}
              </button>
            ))}

            {/* Conceptual parent + expand */}
            <div className={`inline-flex rounded-lg border overflow-hidden transition-colors ${
              relationFilter === 'conceptual' || CONCEPTUAL_OPTIONS.some((o) => o.value === relationFilter)
                ? 'border-[var(--primary)]' : 'border-[var(--border)]'
            }`}>
              <button
                onClick={() => setRelationFilter('conceptual')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  relationFilter === 'conceptual' || CONCEPTUAL_OPTIONS.some((o) => o.value === relationFilter)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                Conceptual — 概念的関連
              </button>
              <button
                onClick={() => setConceptualExpanded((v) => !v)}
                className={`px-2 py-1.5 border-l transition-colors ${
                  relationFilter === 'conceptual' || CONCEPTUAL_OPTIONS.some((o) => o.value === relationFilter)
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                {conceptualExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
              </button>
            </div>
          </div>

          {/* Conceptual sub-types */}
          {conceptualExpanded && (
            <div className="flex flex-wrap gap-2 pl-4 pt-1">
              {CONCEPTUAL_OPTIONS.map(({ value, label }) => (
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

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ラベル（例: Artemis）または QID（例: Q39503）で絞り込み"
          className="input-field mb-0 flex-1"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setWikidataQids(null); }}
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
                {(w.relationTypes ?? []).map((t) => (
                  <span
                    key={t}
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      DIRECT_TYPES.has(t as DirectAuthorityRelation)
                        ? 'bg-blue-200 text-blue-800 dark:bg-blue-800/40 dark:text-blue-200'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}
                  >
                    {RELATION_LABELS[t] ?? t}
                  </span>
                ))}
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
          {statusMessage() && (
            <p className="text-sm text-[var(--text-secondary)]">{statusMessage()}</p>
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
                    <div className="flex flex-wrap gap-1.5 text-xs mt-0.5">
                      {w.type && <span className="text-[var(--text-secondary)]">{w.type}</span>}
                      <span className="font-mono text-[var(--text-secondary)] opacity-60">{w.uri.split('/').pop()}</span>
                      {(w.relationTypes ?? []).map((t) => (
                        <span
                          key={t}
                          className={`px-1.5 py-0.5 rounded-full ${
                            DIRECT_TYPES.has(t as DirectAuthorityRelation)
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}
                        >
                          {RELATION_LABELS[t] ?? t}
                        </span>
                      ))}
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
