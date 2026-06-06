'use client';

import { useEffect, useState } from 'react';
import type { MediaItem } from '@/types/main';

// プロセス全体でキャッシュを共有（再描画でも維持）
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** IIIF manifest から最初のサムネ URL を抽出 */
function pickThumbnail(manifest: unknown): string | null {
  const m = manifest as Record<string, unknown>;
  // v3: manifest.thumbnail[0].id
  const t3 = (m.thumbnail as Array<{ id?: string }> | undefined)?.[0]?.id;
  if (t3) return t3;
  // v3: items[0].thumbnail[0].id
  const items = m.items as Array<Record<string, unknown>> | undefined;
  const ct3 = (items?.[0]?.thumbnail as Array<{ id?: string }> | undefined)?.[0]?.id;
  if (ct3) return ct3;
  // v2: manifest.thumbnail['@id']
  const t2 = (m.thumbnail as { '@id'?: string } | undefined)?.['@id'];
  if (t2) return t2;
  // v2: sequences[0].canvases[0].thumbnail['@id']
  const seqs = m.sequences as Array<{ canvases?: Array<Record<string, unknown>> }> | undefined;
  const c2 = (seqs?.[0]?.canvases?.[0]?.thumbnail as { '@id'?: string } | undefined)?.['@id'];
  if (c2) return c2;
  // fallback: v3 painting body の Image API service から作る
  const body = items?.[0]?.items as Array<Record<string, unknown>> | undefined;
  const paintingBody = (body?.[0]?.items as Array<{ body?: Record<string, unknown> }> | undefined)?.[0]?.body;
  if (paintingBody) {
    const svc = Array.isArray(paintingBody.service) ? paintingBody.service[0] : paintingBody.service;
    const serviceId = (svc as { id?: string; '@id'?: string } | undefined)?.id
      || (svc as { '@id'?: string } | undefined)?.['@id'];
    if (serviceId) return `${String(serviceId).replace(/\/$/, '')}/full/240,/0/default.jpg`;
  }
  return null;
}

async function fetchManifestThumbnail(manifestUrl: string): Promise<string | null> {
  if (cache.has(manifestUrl)) return cache.get(manifestUrl) ?? null;
  if (inflight.has(manifestUrl)) return inflight.get(manifestUrl)!;
  const p = (async () => {
    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const thumb = pickThumbnail(json);
      cache.set(manifestUrl, thumb);
      return thumb;
    } catch {
      cache.set(manifestUrl, null);
      return null;
    } finally {
      inflight.delete(manifestUrl);
    }
  })();
  inflight.set(manifestUrl, p);
  return p;
}

/**
 * media[] の中の IIIF アイテムについて manifest を fetch しサムネ URL マップを返す。
 * key は manifestUrl、value は thumbnail URL（無ければ null）。
 */
export function useIIIFThumbnails(media: MediaItem[] | undefined): Record<string, string | null> {
  const [map, setMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!media) return;
    const iiifUrls = media
      .filter((m) => m.type === 'iiif' && m.manifestUrl)
      .map((m) => m.manifestUrl as string);
    if (iiifUrls.length === 0) return;

    // 既にキャッシュ済みのものを反映
    const initial: Record<string, string | null> = {};
    let anyCached = false;
    iiifUrls.forEach((url) => {
      if (cache.has(url)) {
        initial[url] = cache.get(url) ?? null;
        anyCached = true;
      }
    });
    if (anyCached) setMap((prev) => ({ ...prev, ...initial }));

    // 未取得分をフェッチ
    const toFetch = iiifUrls.filter((url) => !cache.has(url));
    if (toFetch.length === 0) return;

    let cancelled = false;
    Promise.all(toFetch.map((url) => fetchManifestThumbnail(url).then((thumb) => [url, thumb] as const)))
      .then((results) => {
        if (cancelled) return;
        setMap((prev) => {
          const next = { ...prev };
          results.forEach(([url, thumb]) => { next[url] = thumb; });
          return next;
        });
      });

    return () => { cancelled = true; };
  }, [media]);

  return map;
}
