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

  const annotations = annotationsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NewAnnotation[];

  let objectMetadata: ObjectMetadata | null = null;
  if (objectMetadataDoc.exists) {
    const d = objectMetadataDoc.data()!;
    objectMetadata = {
      manifest_url: manifestId,
      media: d.media ?? [],
      wikidata: d.wikidata ?? [],
      bibliography: d.bibliography ?? [],
      location: d.location,
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
