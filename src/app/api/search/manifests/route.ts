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
  const scope = req.nextUrl.searchParams.get('scope');

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

  // アノテーション（test）と manifest_metadata を並行取得
  const [annotSnap, metaSnap] = await Promise.all([
    filterUid
      ? db.collection('test').where('creator', '==', filterUid).get()
      : db.collection('test').get(),
    db.collection('manifest_metadata').get(),
  ]);

  // manifest_metadata を manifest_url でインデックス化
  const metaByUrl = new Map<string, FirebaseFirestore.DocumentData>();
  metaSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.manifest_url) metaByUrl.set(data.manifest_url, data);
  });

  // アノテーションを target_manifest ごとに集約
  const annotBibByManifest = new Map<string, Map<string, BibliographyItem>>();
  const annotWikiByManifest = new Map<string, Map<string, WikidataItem>>();
  const manifestUrls = new Set<string>();

  annotSnap.docs.forEach((doc) => {
    const data = doc.data();
    const manifestUrl: string = data.target_manifest ?? '';
    if (!manifestUrl) return;
    manifestUrls.add(manifestUrl);

    const bibs: BibliographyItem[] = data.bibliography ?? [];
    if (!annotBibByManifest.has(manifestUrl)) annotBibByManifest.set(manifestUrl, new Map());
    const bibMap = annotBibByManifest.get(manifestUrl)!;
    bibs.forEach((b) => { if (b.id) bibMap.set(b.id, b); });

    const wikis: WikidataItem[] = data.wikidata ?? [];
    if (!annotWikiByManifest.has(manifestUrl)) annotWikiByManifest.set(manifestUrl, new Map());
    const wikiMap = annotWikiByManifest.get(manifestUrl)!;
    wikis.forEach((w) => { if (w.uri) wikiMap.set(w.uri, w); });
  });

  // manifest_metadata のみのエントリも含める（scope=all のとき）
  if (!filterUid) {
    metaSnap.docs.forEach((doc) => {
      const url: string = doc.data().manifest_url ?? '';
      if (url) manifestUrls.add(url);
    });
  }

  const entries: ManifestIndexEntry[] = Array.from(manifestUrls).map((manifestUrl) => {
    const meta = metaByUrl.get(manifestUrl);

    // オブジェクトレベルの wikidata / bibliography（manifest_metadata があれば）
    const objectWiki: WikidataItem[] = meta?.wikidata ?? [];
    const objectBibs: BibliographyItem[] = meta?.bibliography ?? [];

    // アノテーションレベルとマージ（uri / id で重複除去）
    const wikiMap = new Map<string, WikidataItem>();
    [...objectWiki, ...Array.from(annotWikiByManifest.get(manifestUrl)?.values() ?? [])].forEach(
      (w) => { if (w.uri) wikiMap.set(w.uri, w); }
    );
    const bibMap = new Map<string, BibliographyItem>();
    [...objectBibs, ...Array.from(annotBibByManifest.get(manifestUrl)?.values() ?? [])].forEach(
      (b) => { if (b.id) bibMap.set(b.id, b); }
    );

    const wikidata = Array.from(wikiMap.values());
    const bibliography = Array.from(bibMap.values());

    const geoPoints: ManifestIndexEntry['geoPoints'] = [];
    if (meta?.location?.lat && meta?.location?.lng) {
      const lat = parseFloat(meta.location.lat);
      const lng = parseFloat(meta.location.lng);
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
      thumbnailUrl: meta?.thumbnail_url,
      manifestLabel: meta?.manifest_label,
      wikidata,
      bibliography,
      location: meta?.location?.lat
        ? { lat: parseFloat(meta.location.lat), lng: parseFloat(meta.location.lng) }
        : undefined,
      geoPoints,
    };
  });

  return NextResponse.json(entries, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
