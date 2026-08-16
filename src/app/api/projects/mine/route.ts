import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase/admin';
import type { Project } from '@/types/main';

/**
 * 呼び出し元ユーザーが所属している全プロジェクトを返す API。
 *
 * Admin SDK 経由なので Firestore ルールをバイパスする。
 * collectionGroup('members') クエリを client-side で行うとルールの静的評価で
 * permission-denied になるため、サーバ側で解決する経路として用意している。
 *
 * 認証: Authorization: Bearer <ID トークン>
 * 返却: { projects: Project[] } — 自作プロジェクトは含まず、招待経由（membership 経由）のみ。
 *       重複除去・マージはクライアント側 (listForMember) の責務。
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';
    if (!token) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (err) {
      console.warn('[/api/projects/mine] verifyIdToken failed:', err);
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }

    const memberSnap = await db
      .collectionGroup('members')
      .where('uid', '==', uid)
      .get();

    const pids = Array.from(
      new Set(
        memberSnap.docs
          .map((d) => d.ref.parent.parent?.id)
          .filter((id): id is string => !!id)
      )
    );

    const projects: Project[] = [];
    await Promise.all(
      pids.map(async (pid) => {
        try {
          const snap = await db.doc(`projects/${pid}`).get();
          if (snap.exists) {
            projects.push(snap.data() as Project);
          }
        } catch (err) {
          console.warn(`[/api/projects/mine] project ${pid} not readable:`, err);
        }
      })
    );

    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[/api/projects/mine] fatal:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'internal', message }, { status: 500 });
  }
}
