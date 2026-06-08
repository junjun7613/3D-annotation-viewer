import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase/admin';
import type { ProjectRole, ProjectMember } from '@/types/main';

/**
 * メンバー招待 API。
 * - 入力：email（招待先）、role（'editor' | 'viewer' | 'owner'）
 * - 認証：Authorization: Bearer <ID トークン> （呼び出し元）
 * - 認可：呼び出し元が当該プロジェクトの owner であること
 * - 処理：Admin SDK で email → UID 解決し、projects/{pid}/members/{uid} に upsert
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pid: string }> }
) {
  const { pid } = await params;

  // 1. 呼び出し元の認証
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';
  if (!token) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  let callerUid: string;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  // 2. 呼び出し元が owner か確認
  const callerMemberSnap = await db
    .doc(`projects/${pid}/members/${callerUid}`)
    .get();
  if (!callerMemberSnap.exists) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const callerRole = (callerMemberSnap.data() as ProjectMember).role;
  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'owner only' }, { status: 403 });
  }

  // 3. リクエストボディ
  let body: { email?: string; role?: ProjectRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const role: ProjectRole = body.role ?? 'editor';
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  if (role !== 'owner' && role !== 'editor' && role !== 'viewer') {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  // 4. email → UID 解決
  let targetUid: string;
  let targetEmail: string;
  try {
    const userRecord = await getAuth().getUserByEmail(email);
    targetUid = userRecord.uid;
    targetEmail = userRecord.email ?? email;
  } catch {
    return NextResponse.json(
      { error: 'user not found', hint: '招待先ユーザーが先にサインインしている必要があります' },
      { status: 404 }
    );
  }

  // 5. メンバー upsert
  const memberRef = db.doc(`projects/${pid}/members/${targetUid}`);
  const existing = await memberRef.get();
  if (existing.exists) {
    await memberRef.update({ role });
  } else {
    const member: ProjectMember = {
      uid: targetUid,
      role,
      joinedAt: Date.now(),
      invitedBy: callerUid,
    };
    await memberRef.set(member);
  }

  return NextResponse.json({ ok: true, uid: targetUid, email: targetEmail, role });
}
