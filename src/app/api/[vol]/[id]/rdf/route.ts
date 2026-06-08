import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase/admin';
import { decodeSlug, createSlug } from '@/utils/converter';
import { buildTurtle } from '@/utils/rdf';
import type { NewAnnotation, ObjectMetadata } from '@/types/main';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vol: string; id: string }> }
) {
  const { id } = await params;
  const manifestId = decodeSlug(id);

  const url = new URL(request.url);
  const pid = url.searchParams.get('pid');

  // ----- 認証 (Bearer ID Token) を先に試みる。任意：private 判定に必要なら 401 を返す。
  let callerUid: string | null = null;
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
      callerUid = decoded.uid;
    } catch {
      // トークン不正は無視（未認証として扱う）
      callerUid = null;
    }
  }

  // ----- pid 指定時：プロジェクト存在チェック + private なら member 必須
  if (pid) {
    const pjSnap = await db.collection('projects').doc(pid).get();
    if (!pjSnap.exists) {
      return new NextResponse('project not found', { status: 404, headers: CORS_HEADERS });
    }
    const visibility = (pjSnap.data() as { visibility?: string }).visibility ?? 'private';
    if (visibility === 'private') {
      if (!callerUid) {
        return new NextResponse('unauthenticated', { status: 401, headers: CORS_HEADERS });
      }
      const memberSnap = await db.doc(`projects/${pid}/members/${callerUid}`).get();
      if (!memberSnap.exists) {
        return new NextResponse('forbidden: not a member', { status: 403, headers: CORS_HEADERS });
      }
    }
  }

  // ----- 全件出力 (pid 無し) のときに private を弾くため、public プロジェクト集合を先に取る
  let publicProjectIds: Set<string> | null = null;
  if (!pid) {
    const pubSnap = await db.collection('projects').where('visibility', '==', 'public').get();
    publicProjectIds = new Set(pubSnap.docs.map((d) => d.id));
  }

  // ----- アノテーション取得
  const baseQuery = db.collection('test').where('target_manifest', '==', manifestId);
  const annotationsSnap = pid
    ? await baseQuery.where('researchProjectId', '==', pid).get()
    : await baseQuery.get();
  const objectMetadataDoc = await db
    .collection('manifest_metadata')
    .doc(createSlug(manifestId))
    .get();

  const allDocs = annotationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // 全件出力時：private プロジェクト所属のアノテを除外
  const visibleDocs = !pid && publicProjectIds
    ? allDocs.filter((d) => {
        const rpid = (d as Record<string, unknown>).researchProjectId as string | undefined;
        // researchProjectId 欠落（過渡期データ）は出力する（旧 RDF と互換）。
        // private に属していたら除外。
        return !rpid || publicProjectIds!.has(rpid);
      })
    : allDocs;

  // isObjectLevel アノテーションと通常アノテーションを分離
  const objectLevelDocs = visibleDocs.filter((d) => (d as Record<string, unknown>).isObjectLevel);
  const annotations = visibleDocs.filter((d) => !(d as Record<string, unknown>).isObjectLevel) as NewAnnotation[];

  // objectMetadata: manifest_metadata の location + isObjectLevel アノテーションのリソースをマージ
  let objectMetadata: ObjectMetadata | null = null;
  const metaBase: Partial<ObjectMetadata> = {};
  if (objectMetadataDoc.exists) {
    const d = objectMetadataDoc.data()!;
    metaBase.location = d.location;
  }
  if (objectLevelDocs.length > 0 || objectMetadataDoc.exists) {
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
