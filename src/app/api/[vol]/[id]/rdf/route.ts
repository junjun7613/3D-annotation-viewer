import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { decodeSlug, createSlug } from '@/utils/converter';
import { buildTurtle } from '@/utils/rdf';
import type { NewAnnotation, ObjectMetadata } from '@/types/main';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vol: string; id: string }> }
) {
  const { id } = await params;
  const manifestId = decodeSlug(id);

  const [annotationsSnap, objectMetadataDoc] = await Promise.all([
    db.collection('test').where('target_manifest', '==', manifestId).get(),
    db.collection('manifest_metadata').doc(createSlug(manifestId)).get(),
  ]);

  const allDocs = annotationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // isObjectLevel アノテーションと通常アノテーションを分離
  const objectLevelDocs = allDocs.filter((d) => (d as Record<string, unknown>).isObjectLevel);
  const annotations = allDocs.filter((d) => !(d as Record<string, unknown>).isObjectLevel) as NewAnnotation[];

  // objectMetadata: manifest_metadata の location + isObjectLevel アノテーションのリソースをマージ
  let objectMetadata: ObjectMetadata | null = null;
  const metaBase: Partial<ObjectMetadata> = {};
  if (objectMetadataDoc.exists) {
    const d = objectMetadataDoc.data()!;
    metaBase.location = d.location;
  }
  if (objectLevelDocs.length > 0 || objectMetadataDoc.exists) {
    // 全 isObjectLevel アノテーションのリソースをマージ
    const mergedMedia = objectLevelDocs.flatMap((d) => (d as Record<string, unknown>).media as ObjectMetadata['media'] ?? []);
    const mergedWikidata = objectLevelDocs.flatMap((d) => (d as Record<string, unknown>).wikidata as ObjectMetadata['wikidata'] ?? []);
    const mergedBibliography = objectLevelDocs.flatMap((d) => (d as Record<string, unknown>).bibliography as ObjectMetadata['bibliography'] ?? []);
    objectMetadata = {
      manifest_url: manifestId,
      media: mergedMedia,
      wikidata: mergedWikidata,
      bibliography: mergedBibliography,
      location: metaBase.location,
    };
  }

  const turtle = buildTurtle(manifestId, annotations, objectMetadata);

  return new NextResponse(turtle, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/turtle; charset=utf-8',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
