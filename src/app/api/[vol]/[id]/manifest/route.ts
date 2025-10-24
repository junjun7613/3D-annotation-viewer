import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { downloadIIIFManifest } from '@/utils/converter';
import { NewAnnotation } from '@/types/main';
import { decodeSlug } from '@/utils/converter';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vol: string; id: string }> }
) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const { id } = await params;
  console.log('=== IIIF Manifest API Called ===');
  console.log('Encoded slug (id param):', id);

  const manifestId = decodeSlug(id);
  console.log('Decoded manifest ID:', manifestId);

  // Firestoreのクエリを作成
  const annotationsRef = db.collection('test').where('target_manifest', '==', manifestId);
  const snapshot = await annotationsRef.get();

  console.log(`Found ${snapshot.size} annotations in Firebase`);

  const annotations = snapshot.docs.map((doc) => {
    const data = doc.data();
    console.log(`Annotation ${doc.id}:`, {
      target_manifest: data.target_manifest,
      target_canvas: data.target_canvas,
      label: data.data?.body?.label,
    });
    return {
      id: doc.id,
      ...data,
    } as NewAnnotation;
  });

  console.log('Fetching original IIIF manifest from:', manifestId);
  const manfiestWithAnnotations = await downloadIIIFManifest(manifestId, annotations);
  console.log('Manifest with annotations prepared, returning...');

  return NextResponse.json(manfiestWithAnnotations, { headers });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
