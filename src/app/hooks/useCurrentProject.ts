'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAtom } from 'jotai';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/firebase';
import {
  currentProjectIdAtom,
  currentProjectAtom,
  currentProjectRoleAtom,
} from '@/app/atoms/currentProjectAtom';
import {
  projectService,
  projectMemberService,
  canEdit,
  canView,
} from '@/lib/services/projects';

/**
 * URL クエリ `?pid=...` を一次情報源として、現在の研究プロジェクトを解決するフック。
 *
 * 戻り値:
 * - projectId: URL の pid（無ければ null）
 * - project:   プロジェクト本体（取得中は null）
 * - role:      現在ユーザーのロール（非メンバーは null）
 * - canEdit:   編集可否（UI 用ヒント。実権限は Firestore Rules で担保）
 * - canView:   閲覧可否
 * - loading:   解決中フラグ
 */
export function useCurrentProject() {
  const searchParams = useSearchParams();
  const pidFromUrl = searchParams.get('pid');

  const [user] = useAuthState(auth);
  const [projectId, setProjectId] = useAtom(currentProjectIdAtom);
  const [project, setProject] = useAtom(currentProjectAtom);
  const [role, setRole] = useAtom(currentProjectRoleAtom);

  // URL → atom の同期
  useEffect(() => {
    if (pidFromUrl !== projectId) {
      setProjectId(pidFromUrl);
      setProject(null);
      setRole(null);
    }
  }, [pidFromUrl, projectId, setProjectId, setProject, setRole]);

  // pid からプロジェクト本体を取得
  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setProject(null);
      return;
    }
    projectService.get(projectId).then((p) => {
      if (!cancelled) setProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, setProject]);

  // ロール解決（ログインユーザー × pid）
  useEffect(() => {
    let cancelled = false;
    if (!projectId || !user?.uid) {
      setRole(null);
      return;
    }
    projectMemberService.getRole(projectId, user.uid).then((r) => {
      if (!cancelled) setRole(r);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, user?.uid, setRole]);

  const loading = projectId !== null && project === null;

  return {
    projectId,
    project,
    role,
    canEdit: canEdit(role),
    canView: project?.visibility === 'public' || canView(role),
    loading,
  };
}
