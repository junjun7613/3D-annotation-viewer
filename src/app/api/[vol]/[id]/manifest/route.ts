import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase/admin';
import { downloadIIIFManifest, type ProjectInfo } from '@/utils/converter';
import { NewAnnotation } from '@/types/main';
import { decodeSlug, createSlug } from '@/utils/converter';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // ----- 認証 (Bearer ID Token) を任意で読む。private 判定に必要。
  let callerUid: string | null = null;
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
      callerUid = decoded.uid;
    } catch {
      callerUid = null;
    }
  }

  // ----- pid 指定時：プロジェクト存在チェック + private なら member 必須
  let projectVisibility: string | null = null;
  let projectData: Record<string, unknown> | null = null;
  if (pid) {
    const pjSnap = await db.collection('projects').doc(pid).get();
    if (!pjSnap.exists) {
      return new NextResponse('project not found', { status: 404, headers: CORS_HEADERS });
    }
    projectData = pjSnap.data() as Record<string, unknown>;
    projectVisibility = (projectData.visibility as string) ?? 'private';
    if (projectVisibility === 'private') {
      if (!callerUid) {
        return new NextResponse('unauthenticated', { status: 401, headers: CORS_HEADERS });
      }
      const memberSnap = await db.doc(`projects/${pid}/members/${callerUid}`).get();
      if (!memberSnap.exists) {
        return new NextResponse('forbidden: not a member', { status: 403, headers: CORS_HEADERS });
      }
    }
  }

  // ----- 全件出力 (pid 無し) のときに private を弾くため、public プロジェクト集合を取る
  let publicProjectIds: Set<string> | null = null;
  if (!pid) {
    const pubSnap = await db.collection('projects').where('visibility', '==', 'public').get();
    publicProjectIds = new Set(pubSnap.docs.map((d) => d.id));
  }

  // アノテーション取得：pid 指定があれば当該プロジェクトのみ、無ければ全件
  const baseQuery = db.collection('test').where('target_manifest', '==', manifestId);
  const annotationsRef = pid
    ? baseQuery.where('researchProjectId', '==', pid)
    : baseQuery;
  const snapshot = await annotationsRef.get();

  const allDocs = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as NewAnnotation;
  });

  // 全件出力時：private プロジェクト所属のアノテを除外
  // researchProjectId 欠落（過渡期データ）は許容（旧 IIIF と互換）。
  const annotations = !pid && publicProjectIds
    ? allDocs.filter((d) => {
        const rpid = (d as unknown as { researchProjectId?: string }).researchProjectId;
        return !rpid || publicProjectIds!.has(rpid);
      })
    : allDocs;

  // regions コレクションを取得（regionId → selector のマップを構築）
  const regionIds = [...new Set(
    annotations.map((a) => (a as unknown as Record<string, unknown>).regionId as string | undefined).filter(Boolean)
  )] as string[];

  const regionsMap = new Map<string, Record<string, unknown>>();
  if (regionIds.length > 0) {
    const regionSnapshots = await Promise.all(
      regionIds.map((rid) => db.collection('regions').doc(rid).get())
    );
    regionSnapshots.forEach((snap) => {
      if (snap.exists) {
        regionsMap.set(snap.id, snap.data() as Record<string, unknown>);
      }
    });
  }

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

  // プロジェクト情報を manifest に付加（pid 指定時のみ）
  let project: ProjectInfo | null = null;
  if (pid && projectData) {
    project = {
      id: pid,
      name: (projectData.name as string) ?? pid,
      description: (projectData.description as string | undefined) ?? undefined,
      visibility: projectVisibility ?? 'private',
    };
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  const manfiestWithAnnotations = await downloadIIIFManifest(
    manifestId,
    annotations,
    baseUrl,
    objectMetadata,
    regionsMap,
    project
  );

  return NextResponse.json(manfiestWithAnnotations, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
