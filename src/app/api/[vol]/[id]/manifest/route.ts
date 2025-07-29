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

  const manifestId = decodeSlug(id);

  // Firestoreのクエリを作成
  const annotationsRef = db.collection('test').where('target_manifest', '==', manifestId);
  const snapshot = await annotationsRef.get();

  const annotations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as NewAnnotation;
  });

  const manfiestWithAnnotations = await downloadIIIFManifest(manifestId, annotations);

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
