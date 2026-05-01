'use client';

import { useEffect, useState } from 'react';
import type { WikidataItem, BibliographyItem } from '@/types/main';

export interface ManifestIndexEntry {
  manifestUrl: string;
  thumbnailUrl?: string;
  manifestLabel?: string;
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
  location?: { lat: number; lng: number };
  geoPoints: { lat: number; lng: number; label: string; source: 'location' | 'wikidata' }[];
}

export interface BibliographyIndexEntry {
  bib: BibliographyItem;
  manifestUrls: string[];
}

export type SearchScope = 'all' | 'mine';

export function useManifestIndex(scope: SearchScope = 'all', idToken?: string | null) {
  const [entries, setEntries] = useState<ManifestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // scope=mine のときはトークンが揃うまで待つ
    if (scope === 'mine' && idToken === undefined) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const url = scope === 'mine' ? '/api/search/manifests?scope=mine' : '/api/search/manifests';
        const headers: HeadersInit = {};
        if (scope === 'mine' && idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }
        const res = await fetch(url, { headers });
        const data: ManifestIndexEntry[] = await res.json();
        setEntries(data);
      } catch (e) {
        console.error('Failed to fetch manifest index', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [scope, idToken]);

  return { entries, loading };
}
