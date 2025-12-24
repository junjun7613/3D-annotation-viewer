import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { downloadIIIFManifest } from '@/utils/converter';
import { NewAnnotation } from '@/types/main';
import { decodeSlug, createSlug } from '@/utils/converter';

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

  // Firestoreのクエリを作成（Annotations）
  const annotationsRef = db.collection('test').where('target_manifest', '==', manifestId);
  const snapshot = await annotationsRef.get();

  const annotations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as NewAnnotation;
  });

  // Objectメタデータを取得
  const manifestDocId = createSlug(manifestId);
  const objectMetadataRef = db.collection('manifest_metadata').doc(manifestDocId);
  const objectMetadataDoc = await objectMetadataRef.get();

  let objectMetadata = null;
  if (objectMetadataDoc.exists) {
    const data = objectMetadataDoc.data();
    objectMetadata = {
      media: data?.media || [],
      wikidata: data?.wikidata || [],
      bibliography: data?.bibliography || [],
      location: data?.location,
    };
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const manfiestWithAnnotations = await downloadIIIFManifest(manifestId, annotations, baseUrl, objectMetadata);

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
