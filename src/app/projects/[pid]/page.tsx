'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  FaArrowLeft,
  FaLock,
  FaGlobe,
  FaPencilAlt,
  FaCube,
  FaImage,
  FaFileAlt,
  FaTrash,
} from 'react-icons/fa';
import { auth } from '@/lib/firebase/firebase';
import SignIn from '@/app/components/SignIn';
import MemberManager from '@/app/components/MemberManager';
import {
  projectService,
  projectMemberService,
  listProjectManifests,
  deleteProjectManifest,
  canEdit,
  canManageProject,
} from '@/lib/services/projects';
import { detectManifestType, type ManifestType } from '@/utils/manifestType';
import type { Project, ProjectRole, ProjectVisibility } from '@/types/main';

type ManifestRow = {
  manifestUrl: string;
  annotationCount: number;
  lastUpdatedAt: number | null;
  type: ManifestType;
};

function formatDate(ms: number | null): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ pid: string }>();
  const pid = params.pid;
  const [user, authLoading] = useAuthState(auth);

  const [project, setProject] = useState<Project | null>(null);
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [manifests, setManifests] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState<ProjectVisibility>('private');
  const [savingMeta, setSavingMeta] = useState(false);
  const [newManifestUrl, setNewManifestUrl] = useState('');

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let p: Project | null = null;
      try {
        p = await projectService.get(pid);
      } catch (err) {
        console.warn('[projectDetail] projectService.get failed:', err);
      }
      if (cancelled) return;
      setProject(p);
      if (p) {
        setEditName(p.name);
        setEditDesc(p.description ?? '');
        setEditVisibility(p.visibility);
      }
      const rawManifests = await listProjectManifests(pid);
      const enriched: ManifestRow[] = await Promise.all(
        rawManifests.map(async (m) => ({
          ...m,
          type: await detectManifestType(m.manifestUrl),
        }))
      );
      enriched.sort(
        (a, b) => (b.lastUpdatedAt ?? 0) - (a.lastUpdatedAt ?? 0)
      );
      if (!cancelled) {
        setManifests(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pid]);

  useEffect(() => {
    if (!pid || !user?.uid) {
      setRole(null);
      return;
    }
    projectMemberService.getRole(pid, user.uid).then(setRole);
  }, [pid, user?.uid]);

  const openEditor = (manifestUrl: string, mode: '2d' | '3d' | 'textual') => {
    const params = new URLSearchParams({ manifest: manifestUrl, pid });
    router.push(`/editor/${mode}?${params.toString()}`);
  };

  const addManifest = () => {
    const url = newManifestUrl.trim();
    if (!url) return;
    // 新規マニフェスト → タイプ判定して該当エディタへ
    detectManifestType(url).then((t) => {
      const mode = t === '3d' ? '3d' : '2d';
      openEditor(url, mode);
    });
  };

  const saveMeta = async () => {
    if (!project) return;
    const name = editName.trim();
    if (!name) return;
    setSavingMeta(true);
    await projectService.update(project.id, {
      name,
      description: editDesc.trim(),
      visibility: editVisibility,
    });
    setProject({
      ...project,
      name,
      description: editDesc.trim(),
      visibility: editVisibility,
    });
    setEditingMeta(false);
    setSavingMeta(false);
  };

  const deleteProject = async () => {
    if (!project) return;
    if (!confirm(`プロジェクト「${project.name}」を削除します。\nアノテーションは残りますが、本プロジェクトに紐づかなくなります。本当に削除しますか？`)) return;
    await projectService.delete(project.id);
    router.push('/');
  };

  const deleteManifest = async (manifestUrl: string, annotationCount: number) => {
    if (!project) return;
    const msg = `この資料を本プロジェクトから削除します。\n\nURL: ${manifestUrl}\nアノテーション: ${annotationCount} 件\n\nアノテーションと、他のアノテに参照されていない領域も削除されます（manifest_metadata は残ります）。本当に削除しますか？`;
    if (!confirm(msg)) return;
    try {
      const res = await deleteProjectManifest(project.id, manifestUrl);
      alert(`削除しました: アノテ ${res.annotationsDeleted} 件, 領域 ${res.regionsDeleted} 件`);
      setManifests((prev) => prev.filter((m) => m.manifestUrl !== manifestUrl));
    } catch (err) {
      console.error('[deleteManifest] failed:', err);
      alert('削除に失敗しました。Console を確認してください。');
    }
  };

  const editable = canEdit(role);
  const manageable = canManageProject(role);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] h-14 px-6 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            aria-label="戻る"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="m-0 text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate max-w-md">
            {project?.name ?? '...'}
          </h1>
        </div>
        <nav className="flex items-center gap-4">
          <SignIn />
        </nav>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {loading || authLoading ? (
            <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
              読み込み中…
            </div>
          ) : !project ? (
            <div className="text-center py-20">
              <p className="text-[var(--text-primary)] font-medium mb-2">プロジェクトが見つかりません</p>
              <button
                onClick={() => router.push('/')}
                className="text-[var(--primary)] hover:underline text-sm"
              >
                ホームに戻る
              </button>
            </div>
          ) : (
            <>
              {/* プロジェクト情報 */}
              <section className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
                {editingMeta ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">プロジェクト名</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">説明</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                        className="input-field w-full resize-y"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={editVisibility === 'private'}
                          onChange={() => setEditVisibility('private')}
                        />
                        <FaLock className="w-3 h-3" /> Private
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={editVisibility === 'public'}
                          onChange={() => setEditVisibility('public')}
                        />
                        <FaGlobe className="w-3 h-3" /> Public
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingMeta(false)}
                        className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={saveMeta}
                        disabled={savingMeta || !editName.trim()}
                        className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-md text-sm disabled:opacity-50"
                      >
                        {savingMeta ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                          {project.name}
                        </h2>
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                          {project.visibility === 'public' ? (
                            <><FaGlobe className="w-2.5 h-2.5" /> Public</>
                          ) : (
                            <><FaLock className="w-2.5 h-2.5" /> Private</>
                          )}
                        </span>
                      </div>
                      {project.description ? (
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)] italic">説明がありません</p>
                      )}
                      <p className="text-xs text-[var(--text-secondary)] mt-3">
                        作成 {formatDate(project.createdAt)}
                      </p>
                    </div>
                    {manageable && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMeta(true)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] rounded-md hover:bg-[var(--background)]"
                          title="編集"
                        >
                          <FaPencilAlt className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={deleteProject}
                          className="p-2 text-[var(--text-secondary)] hover:text-red-600 rounded-md hover:bg-[var(--background)]"
                          title="削除"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 資料（manifest）一覧 */}
              <section>
                <div className="flex items-end justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">資料</h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {manifests.length} 件
                  </span>
                </div>

                {editable && (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newManifestUrl}
                      onChange={(e) => setNewManifestUrl(e.target.value)}
                      placeholder="新しい IIIF Manifest URL を入力してエディタへ"
                      className="input-field flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') addManifest(); }}
                    />
                    <button
                      onClick={addManifest}
                      disabled={!newManifestUrl.trim()}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm disabled:opacity-50"
                    >
                      開く
                    </button>
                  </div>
                )}

                {manifests.length === 0 ? (
                  <div className="text-center py-10 bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-xl">
                    <p className="text-sm text-[var(--text-secondary)]">
                      このプロジェクトにはまだ資料がありません
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {manifests.map((m) => (
                      <li
                        key={m.manifestUrl}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 flex items-center gap-4"
                      >
                        <div className="flex-shrink-0 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                          {m.type === '3d' ? (
                            <FaCube className="w-4 h-4 text-[var(--primary)]" />
                          ) : m.type === '2d' ? (
                            <FaImage className="w-4 h-4 text-[var(--primary)]" />
                          ) : (
                            <FaFileAlt className="w-4 h-4 text-[var(--text-secondary)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)] truncate font-mono">
                            {m.manifestUrl}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            アノテ {m.annotationCount} ・ 更新 {formatDate(m.lastUpdatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditor(m.manifestUrl, m.type === '3d' ? '3d' : '2d')}
                            className="px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-md hover:opacity-90"
                          >
                            {m.type === '3d' ? '3D' : '2D'} エディタ
                          </button>
                          <button
                            onClick={() => openEditor(m.manifestUrl, 'textual')}
                            className="px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:border-[var(--primary)]"
                          >
                            Textual
                          </button>
                          {manageable && (
                            <button
                              onClick={() => deleteManifest(m.manifestUrl, m.annotationCount)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 rounded-md hover:bg-[var(--background)]"
                              title="この資料をプロジェクトから削除"
                              aria-label="この資料をプロジェクトから削除"
                            >
                              <FaTrash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* メンバー管理 */}
              <section>
                <MemberManager projectId={project.id} canManage={manageable} />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
