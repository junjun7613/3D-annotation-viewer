'use client';

import { useEffect, useState } from 'react';
import type { WikidataItem, BibliographyItem } from '@/types/main';

export interface ManifestIndexEntry {
  manifestUrl: string;
  thumbnailUrl?: string;
  manifestLabel?: string;
  wikidata: WikidataItem[];
  // オブジェクトレベル + アノテーションレベルの書誌を統合したもの
  bibliography: BibliographyItem[];
  location?: { lat: number; lng: number };
  geoPoints: { lat: number; lng: number; label: string; source: 'location' | 'wikidata' }[];
}

// 書誌検索UIで使う、書誌とそれが紐づくマニフェストのリスト
export interface BibliographyIndexEntry {
  bib: BibliographyItem;
  manifestUrls: string[];
}

export function useManifestIndex() {
  const [entries, setEntries] = useState<ManifestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/search/manifests');
        const data: ManifestIndexEntry[] = await res.json();
        setEntries(data);
      } catch (e) {
        console.error('Failed to fetch manifest index', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return { entries, loading };
}
