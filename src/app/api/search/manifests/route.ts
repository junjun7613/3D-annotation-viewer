import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import type { ManifestIndexEntry } from '@/app/search/hooks/useManifestIndex';
import type { WikidataItem, BibliographyItem } from '@/types/main';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope'); // 'mine' | null

  // scope=mine の場合は Authorization ヘッダーから uid を取得
  let filterUid: string | null = null;
  if (scope === 'mine') {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.replace(/^Bearer\s+/, '');
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      filterUid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS_HEADERS });
    }
  }

  // manifest_metadata と test（アノテーション）を並行取得
  const [metaSnap, annotSnap] = await Promise.all([
    db.collection('manifest_metadata').get(),
    filterUid
      ? db.collection('test').where('creator', '==', filterUid).get()
      : db.collection('test').get(),
  ]);

  // scope=mine のとき: 自分のアノテーションが存在する manifest_url の集合を作る
  const allowedManifestUrls = filterUid
    ? new Set(annotSnap.docs.map((d) => d.data().target_manifest as string).filter(Boolean))
    : null;

  // アノテーションの書誌・wikidata を manifest_url ごとに集約（重複除去は id/uri 基準）
  const annotBibByManifest = new Map<string, Map<string, BibliographyItem>>();
  const annotWikiByManifest = new Map<string, Map<string, WikidataItem>>();

  annotSnap.docs.forEach((doc) => {
    const data = doc.data();
    const manifestUrl: string = data.target_manifest ?? '';
    if (!manifestUrl) return;

    const bibs: BibliographyItem[] = data.bibliography ?? [];
    if (!annotBibByManifest.has(manifestUrl)) annotBibByManifest.set(manifestUrl, new Map());
    const bibMap = annotBibByManifest.get(manifestUrl)!;
    bibs.forEach((b) => { if (b.id) bibMap.set(b.id, b); });

    const wikis: WikidataItem[] = data.wikidata ?? [];
    if (!annotWikiByManifest.has(manifestUrl)) annotWikiByManifest.set(manifestUrl, new Map());
    const wikiMap = annotWikiByManifest.get(manifestUrl)!;
    wikis.forEach((w) => { if (w.uri) wikiMap.set(w.uri, w); });
  });

  const entries: ManifestIndexEntry[] = metaSnap.docs
    .map((doc) => {
      const data = doc.data();
      const manifestUrl: string = data.manifest_url ?? '';
      return { data, manifestUrl };
    })
    .filter(({ manifestUrl }) => {
      if (!manifestUrl) return false;
      // scope=mine: 自分のアノテーションが紐づくオブジェクトのみ
      if (allowedManifestUrls && !allowedManifestUrls.has(manifestUrl)) return false;
      return true;
    })
    .map(({ data, manifestUrl }) => {
      const objectWiki: WikidataItem[] = data.wikidata ?? [];
      const annotWiki = Array.from(annotWikiByManifest.get(manifestUrl)?.values() ?? []);
      const wikiMap = new Map<string, WikidataItem>();
      [...objectWiki, ...annotWiki].forEach((w) => { if (w.uri) wikiMap.set(w.uri, w); });
      const wikidata = Array.from(wikiMap.values());

      const objectBibs: BibliographyItem[] = data.bibliography ?? [];
      const annotBibs = Array.from(annotBibByManifest.get(manifestUrl)?.values() ?? []);
      const bibMap = new Map<string, BibliographyItem>();
      [...objectBibs, ...annotBibs].forEach((b) => { if (b.id) bibMap.set(b.id, b); });
      const bibliography = Array.from(bibMap.values());

      const geoPoints: ManifestIndexEntry['geoPoints'] = [];
      if (data.location?.lat && data.location?.lng) {
        const lat = parseFloat(data.location.lat);
        const lng = parseFloat(data.location.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          geoPoints.push({ lat, lng, label: manifestUrl, source: 'location' });
        }
      }
      wikidata.forEach((item) => {
        if (item.lat && item.lng) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            geoPoints.push({ lat, lng, label: item.label, source: 'wikidata' });
          }
        }
      });

      return {
        manifestUrl,
        thumbnailUrl: data.thumbnail_url,
        manifestLabel: data.manifest_label,
        wikidata,
        bibliography,
        location: data.location?.lat
          ? { lat: parseFloat(data.location.lat), lng: parseFloat(data.location.lng) }
          : undefined,
        geoPoints,
      };
    });

  return NextResponse.json(entries, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
