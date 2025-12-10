import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import {
  GeoFeature,
  createGeoFeatureFromLocation,
  createGeoFeatureFromWikidata,
  fetchManifestLabel,
} from '@/utils/converter';
import { NewAnnotation, WikidataItem } from '@/types/main';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Firestoreからドキュメントを取得
  const docRef = db.collection('test').doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404, headers: CORS_HEADERS });
  }

  const doc = {
    id: docSnap.id,
    ...docSnap.data(),
  } as NewAnnotation;

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // マニフェストラベルを取得
  const { label: manifestLabel } = await fetchManifestLabel(doc.target_manifest);

  // GeoFeatureを生成
  let geoFeature: GeoFeature | null = null;

  // まずWikidataから生成を試みる
  if (doc.wikidata && doc.wikidata.length > 0) {
    for (const wikiItem of doc.wikidata as WikidataItem[]) {
      const feature = createGeoFeatureFromWikidata(
        doc,
        wikiItem,
        baseUrl,
        manifestLabel,
        doc.target_manifest
      );
      if (feature) {
        geoFeature = feature;
        break;
      }
    }
  }

  // Wikidataからの生成に失敗した場合、locationから生成
  if (!geoFeature) {
    geoFeature = createGeoFeatureFromLocation(doc, baseUrl, manifestLabel, doc.target_manifest);
  }

  if (!geoFeature) {
    return NextResponse.json(
      { error: 'No geo feature available for this annotation' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(geoFeature, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
