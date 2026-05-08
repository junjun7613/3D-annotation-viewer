'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';
import type { WikidataItem, AuthorityRoleType, ReferenceLevel } from '@/types/main';
import ManifestCard from './ManifestCard';

interface WikidataWithManifests {
  wikidata: WikidataItem;
  manifestUrls: string[];
}

interface Props {
  entries: ManifestIndexEntry[];
  loading: boolean;
}

const GEO_ALL_TYPES = new Set<AuthorityRoleType>([
  ':GeographicAuthority',
  ':DepictedPlace',
  ':FoundAt',
  ':ProducedAt',
  ':OriginatedAt',
  ':DepictedAt',
]);

const ROLE_TYPE_LABELS: Record<string, string> = {
  ':ObjectAuthority': 'Object',
  ':GeographicAuthority': 'Geographic',
  ':DepictedPlace': 'Depicted Place',
  ':FoundAt': 'Found At',
  ':ProducedAt': 'Produced At',
  ':OriginatedAt': 'Originated At',
  ':DepictedAt': 'Depicted At',
};

const ROLE_TYPE_BADGE: Record<string, string> = {
  ':ObjectAuthority': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ':GeographicAuthority': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ':DepictedPlace': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ':FoundAt': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ':ProducedAt': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ':OriginatedAt': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ':DepictedAt': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

const REF_LEVEL_LABELS: Record<string, string> = {
  ':DirectReference': 'Direct',
  ':IndirectReference': 'Indirect',
};

const REF_LEVEL_BADGE: Record<string, string> = {
  ':DirectReference': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ':IndirectReference': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

type RoleFilter = 'all' | ':ObjectAuthority' | 'geo' | AuthorityRoleType;
type RefFilter = 'all' | ReferenceLevel;

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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [refFilter, setRefFilter] = useState<RefFilter>('all');
  const [geoExpanded, setGeoExpanded] = useState(false);
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

  const matchesRoleFilter = (w: WikidataItem): boolean => {
    if (roleFilter === 'all') return true;
    const role = w.roleType ?? ':ObjectAuthority';
    if (roleFilter === ':ObjectAuthority') return role === ':ObjectAuthority';
    if (roleFilter === 'geo') return GEO_ALL_TYPES.has(role as AuthorityRoleType);
    return role === roleFilter;
  };

  const matchesRefFilter = (w: WikidataItem): boolean => {
    if (refFilter === 'all') return true;
    return (w.referenceLevel ?? ':DirectReference') === refFilter;
  };

  const filtered = useMemo<WikidataWithManifests[]>(() => {
    const q = query.trim();
    if (!q && roleFilter === 'all' && refFilter === 'all') return [];

    let candidates = allWikidata;

    // テキスト / QID フィルタ
    if (q) {
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
    }

    // roleType フィルタ
    candidates = candidates.filter(({ wikidata: w }) => matchesRoleFilter(w));

    // referenceLevel フィルタ
    candidates = candidates.filter(({ wikidata: w }) => matchesRefFilter(w));

    return candidates;
  }, [query, allWikidata, wikidataQids, roleFilter, refFilter]);

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

  const hasActiveFilter = roleFilter !== 'all' || refFilter !== 'all';

  const statusMessage = () => {
    const q = query.trim();
    if (!q && !hasActiveFilter) return selectedWikidata.length === 0 ? 'ラベルまたは QID を入力するか、フィルタを選択してください。' : null;
    if (wikidataSearching) return 'Wikidata を検索中...';
    if (filtered.length > 0) return `${filtered.length} 件のエンティティが見つかりました。`;
    return '条件に一致するエンティティがありません。';
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Role filter */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">役割種別</p>
        <div className="flex flex-col gap-1">
          {/* Top-level buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', ':ObjectAuthority'] as const).map((val) => (
              <button
                key={val}
                onClick={() => { setRoleFilter(val); setGeoExpanded(false); }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  roleFilter === val
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                {val === 'all' ? 'すべて' : 'Object'}
              </button>
            ))}

            {/* Geographic parent button + expand toggle */}
            <div className={`inline-flex rounded-lg border overflow-hidden transition-colors ${
              roleFilter === 'geo' || GEO_ALL_TYPES.has(roleFilter as AuthorityRoleType)
                ? 'border-[var(--primary)]'
                : 'border-[var(--border)]'
            }`}>
              <button
                onClick={() => setRoleFilter('geo')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  roleFilter === 'geo' || GEO_ALL_TYPES.has(roleFilter as AuthorityRoleType)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                Geographic
              </button>
              <button
                onClick={() => setGeoExpanded((v) => !v)}
                className={`px-2 py-1.5 border-l transition-colors ${
                  roleFilter === 'geo' || GEO_ALL_TYPES.has(roleFilter as AuthorityRoleType)
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20 text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
                aria-label={geoExpanded ? 'サブタイプを閉じる' : 'サブタイプを開く'}
              >
                {geoExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
              </button>
            </div>
          </div>

          {/* Geographic sub-types */}
          {geoExpanded && (
            <div className="flex flex-wrap gap-2 pl-4 pt-1">
              {([
                { value: ':DepictedPlace' as AuthorityRoleType, label: 'Depicted Place' },
                { value: ':FoundAt' as AuthorityRoleType, label: 'Found At' },
                { value: ':ProducedAt' as AuthorityRoleType, label: 'Produced At' },
                { value: ':OriginatedAt' as AuthorityRoleType, label: 'Originated At' },
                { value: ':DepictedAt' as AuthorityRoleType, label: 'Depicted At' },
                { value: ':GeographicAuthority' as AuthorityRoleType, label: 'Geographic (other)' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRoleFilter(value)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    roleFilter === value
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
            {selectedWikidata.map((w) => {
              const role = w.roleType ?? ':ObjectAuthority';
              const ref = w.referenceLevel ?? ':DirectReference';
              return (
                <span
                  key={w.uri}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                >
                  {w.thumbnail && (
                    <img src={w.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                  )}
                  {w.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${ROLE_TYPE_BADGE[role] ?? ROLE_TYPE_BADGE[':ObjectAuthority']}`}>
                    {ROLE_TYPE_LABELS[role] ?? role}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${REF_LEVEL_BADGE[ref]}`}>
                    {REF_LEVEL_LABELS[ref] ?? ref}
                  </span>
                  <button
                    onClick={() => toggleSelection(w)}
                    className="ml-0.5 leading-none opacity-70 hover:opacity-100"
                    aria-label={`${w.label}を解除`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
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
              const role = w.roleType ?? ':ObjectAuthority';
              const ref = w.referenceLevel ?? ':DirectReference';
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
                      <span className={`px-1.5 py-0.5 rounded-full ${ROLE_TYPE_BADGE[role] ?? ROLE_TYPE_BADGE[':ObjectAuthority']}`}>
                        {ROLE_TYPE_LABELS[role] ?? role}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full ${REF_LEVEL_BADGE[ref]}`}>
                        {REF_LEVEL_LABELS[ref] ?? ref}
                      </span>
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
