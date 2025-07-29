import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const url = new URL(request.url);
    const manifestId = url.searchParams.get('manifest');

    if (!manifestId) {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400, headers });
    }

    // Firestoreのクエリを作成
    const annotationsRef = db.collection('annotations').where('target_manifest', '==', manifestId);
    const snapshot = await annotationsRef.get();

    const annotations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });

    return NextResponse.json({ annotations }, { headers });
  } catch (error) {
    // エラーの詳細なログ出力
    console.error('Fetch annotations error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers }
    );
  }
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
