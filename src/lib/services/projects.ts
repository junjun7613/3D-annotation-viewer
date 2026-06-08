/**
 * Research Project サービス層
 *
 * - projects/{projectId} : プロジェクト本体
 * - projects/{projectId}/members/{uid} : メンバーシップ（サブコレクション）
 *
 * 権限判定はメンバーシップに基づく。`creator` は来歴記録のみ。
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  ProjectMember,
  ProjectRole,
  ProjectVisibility,
} from '@/types/main';

const PROJECTS = 'projects';
const MEMBERS = 'members';

function projectRef(projectId: string) {
  return doc(db, PROJECTS, projectId);
}

function memberRef(projectId: string, uid: string) {
  return doc(db, PROJECTS, projectId, MEMBERS, uid);
}

function membersCol(projectId: string) {
  return collection(db, PROJECTS, projectId, MEMBERS);
}

export const projectService = {
  /** プロジェクトを作成し、作成者を owner として登録する */
  async create(params: {
    name: string;
    description?: string;
    visibility: ProjectVisibility;
    ownerUid: string;
  }): Promise<Project> {
    const id = uuidv4();
    const now = Date.now();
    const project: Project = {
      id,
      name: params.name,
      description: params.description ?? '',
      visibility: params.visibility,
      createdAt: now,
      createdBy: params.ownerUid,
    };
    await setDoc(projectRef(id), project);
    const member: ProjectMember = {
      uid: params.ownerUid,
      role: 'owner',
      joinedAt: now,
      invitedBy: params.ownerUid,
    };
    await setDoc(memberRef(id, params.ownerUid), member);
    return project;
  },

  /** プロジェクトを取得 */
  async get(projectId: string): Promise<Project | null> {
    const snap = await getDoc(projectRef(projectId));
    return snap.exists() ? (snap.data() as Project) : null;
  },

  /** プロジェクトの基本情報を更新（owner のみ想定。権限判定はルールで担保） */
  async update(
    projectId: string,
    patch: Partial<Pick<Project, 'name' | 'description' | 'visibility'>>
  ): Promise<void> {
    await updateDoc(projectRef(projectId), patch);
  },

  /** プロジェクトを削除（owner のみ想定。サブコレクションのクリーンアップは別途必要） */
  async delete(projectId: string): Promise<void> {
    await deleteDoc(projectRef(projectId));
  },

  /** 公開プロジェクトの一覧（visibility = 'public'） */
  async listPublic(): Promise<Project[]> {
    const q = query(collection(db, PROJECTS), where('visibility', '==', 'public'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Project);
  },

  /**
   * 指定ユーザーが所属しているプロジェクト一覧。
   *
   * 現状は `createdBy == uid` で projects を直接検索する。
   * 招待された他プロジェクトの取得（collectionGroup('members') 経由）は
   * Phase 5 以降の課題：collectionGroup ルール `match /{path=**}/members/{uid}` を
   * 別途定義する必要があり、セキュリティ評価が要るため見送る。
   */
  async listForMember(uid: string): Promise<Project[]> {
    try {
      const createdSnap = await getDocs(
        query(collection(db, PROJECTS), where('createdBy', '==', uid))
      );
      return createdSnap.docs.map((d) => d.data() as Project);
    } catch (err) {
      console.warn('[projectService.listForMember] failed:', err);
      return [];
    }
  },
};

/**
 * プロジェクト内に存在するユニークな manifest（資料）の一覧。
 * 個別プロジェクト画面の「資料」セクションで使う。
 */
export async function listProjectManifests(projectId: string): Promise<
  Array<{ manifestUrl: string; annotationCount: number; lastUpdatedAt: number | null }>
> {
  let snap;
  try {
    const q = query(
      collection(db, 'test'),
      where('researchProjectId', '==', projectId)
    );
    snap = await getDocs(q);
  } catch (err) {
    console.warn(`[listProjectManifests] failed for ${projectId}:`, err);
    return [];
  }
  const byManifest = new Map<
    string,
    { annotationCount: number; lastUpdatedAt: number | null }
  >();
  snap.docs.forEach((d) => {
    const data = d.data() as {
      target_manifest?: string;
      createdAt?: number;
      updatedAt?: number;
    };
    const m = data.target_manifest;
    if (!m) return;
    const t = data.updatedAt ?? data.createdAt ?? null;
    const existing = byManifest.get(m);
    if (existing) {
      existing.annotationCount += 1;
      if (t !== null && (existing.lastUpdatedAt === null || t > existing.lastUpdatedAt)) {
        existing.lastUpdatedAt = t;
      }
    } else {
      byManifest.set(m, { annotationCount: 1, lastUpdatedAt: t });
    }
  });
  return Array.from(byManifest.entries()).map(([manifestUrl, v]) => ({
    manifestUrl,
    ...v,
  }));
}

/**
 * プロジェクトに紐づくアノテーション統計（test コレクション集計）。
 * UI の「アノテーション数 / 最終更新日」表示用。
 */
export async function getProjectStats(projectId: string): Promise<{
  annotationCount: number;
  lastUpdatedAt: number | null;
}> {
  try {
    const q = query(
      collection(db, 'test'),
      where('researchProjectId', '==', projectId)
    );
    const snap = await getDocs(q);
    let lastUpdatedAt: number | null = null;
    snap.docs.forEach((d) => {
      const data = d.data() as { createdAt?: number; updatedAt?: number };
      const t = data.updatedAt ?? data.createdAt ?? null;
      if (t !== null && (lastUpdatedAt === null || t > lastUpdatedAt)) {
        lastUpdatedAt = t;
      }
    });
    return { annotationCount: snap.size, lastUpdatedAt };
  } catch (err) {
    console.warn(`[getProjectStats] failed for ${projectId}:`, err);
    return { annotationCount: 0, lastUpdatedAt: null };
  }
}

/**
 * プロジェクト内の特定資料（target_manifest）に紐づくアノテーションを一括削除する。
 *
 * 削除対象:
 *   - test コレクションのうち researchProjectId == pid かつ target_manifest == url のドキュメント全て
 *     （領域アノテと Object Annotation の両方）
 *   - 上記削除後、参照されなくなった regions ドキュメント（同じ target_manifest のもの）
 *
 * 残すもの:
 *   - manifest_metadata（資料の事実情報。他プロジェクトと共有）
 *
 * 戻り値: 削除件数（アノテと領域それぞれ）
 */
export async function deleteProjectManifest(
  projectId: string,
  manifestUrl: string
): Promise<{ annotationsDeleted: number; regionsDeleted: number }> {
  // 1. 当該 (projectId, manifestUrl) の test ドキュメントを削除
  const annSnap = await getDocs(
    query(
      collection(db, 'test'),
      where('researchProjectId', '==', projectId),
      where('target_manifest', '==', manifestUrl)
    )
  );
  const affectedRegionIds = new Set<string>();
  await Promise.all(
    annSnap.docs.map(async (d) => {
      const rid = (d.data().regionId as string | undefined) ?? undefined;
      if (rid) affectedRegionIds.add(rid);
      await deleteDoc(d.ref);
    })
  );

  // 2. 影響を受けた region について、まだ他のアノテに参照されていないかチェックして掃除
  //    region は creator しか削除できないため、他人作の region は権限エラーで失敗する。
  //    その場合はカウントせず warn のみ残す（孤立 region は後日の整理タスクへ）。
  let regionsDeleted = 0;
  await Promise.all(
    Array.from(affectedRegionIds).map(async (rid) => {
      try {
        const remainingSnap = await getDocs(
          query(collection(db, 'test'), where('regionId', '==', rid))
        );
        if (remainingSnap.empty) {
          await deleteDoc(doc(db, 'regions', rid));
          regionsDeleted += 1;
        }
      } catch (err) {
        console.warn(`[deleteProjectManifest] region ${rid} not deleted:`, err);
      }
    })
  );

  return { annotationsDeleted: annSnap.size, regionsDeleted };
}

export const projectMemberService = {
  /** メンバーを追加 / 既存ロールを更新 */
  async upsert(
    projectId: string,
    uid: string,
    role: ProjectRole,
    invitedBy: string
  ): Promise<void> {
    const existing = await getDoc(memberRef(projectId, uid));
    if (existing.exists()) {
      await updateDoc(memberRef(projectId, uid), { role });
      return;
    }
    const member: ProjectMember = {
      uid,
      role,
      joinedAt: Date.now(),
      invitedBy,
    };
    await setDoc(memberRef(projectId, uid), member);
  },

  /** メンバーを削除（退会・除名） */
  async remove(projectId: string, uid: string): Promise<void> {
    await deleteDoc(memberRef(projectId, uid));
  },

  /** 指定ユーザーのロールを取得（メンバーでなければ null） */
  async getRole(projectId: string, uid: string): Promise<ProjectRole | null> {
    const snap = await getDoc(memberRef(projectId, uid));
    if (!snap.exists()) return null;
    return (snap.data() as ProjectMember).role;
  },

  /** プロジェクトの全メンバー一覧 */
  async list(projectId: string): Promise<ProjectMember[]> {
    const snap = await getDocs(membersCol(projectId));
    return snap.docs.map((d) => d.data() as ProjectMember);
  },
};

/** クライアント側の権限チェックヘルパ（UI 表示用。実権限は Firestore Rules で担保） */
export function canEdit(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'editor';
}

export function canView(role: ProjectRole | null): boolean {
  return role !== null;
}

export function canManageProject(role: ProjectRole | null): boolean {
  return role === 'owner';
}
