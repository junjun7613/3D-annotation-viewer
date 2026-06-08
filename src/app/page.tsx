'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import SignIn from '@/app/components/SignIn';
import { FaDownload, FaPlus, FaFolder, FaLock, FaGlobe, FaUser } from 'react-icons/fa';
import { auth } from '@/lib/firebase/firebase';
import { projectService, getProjectStats } from '@/lib/services/projects';
import { buildVocabularyTurtle } from '@/utils/rdf';
import type { Project } from '@/types/main';

type ProjectCard = Project & {
  annotationCount: number;
  lastUpdatedAt: number | null;
};

function formatDate(ms: number | null): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Home() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list = await projectService.listForMember(user.uid);
      const enriched = await Promise.all(
        list.map(async (p) => {
          const stats = await getProjectStats(p.id);
          return { ...p, ...stats };
        })
      );
      if (!cancelled) {
        // 最終更新日降順、無いものは末尾
        enriched.sort(
          (a, b) => (b.lastUpdatedAt ?? 0) - (a.lastUpdatedAt ?? 0)
        );
        setProjects(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const openProject = (pid: string) => {
    router.push(`/projects/${pid}`);
  };

  const downloadVocabulary = () => {
    const ttl = buildVocabularyTurtle();
    const blob = new Blob([ttl], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.ttl';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] h-14 px-6 flex justify-between items-center shadow-sm flex-shrink-0">
        <h1 className="m-0 text-lg sm:text-xl font-bold text-[var(--text-primary)]">IIIF Semantic Editor</h1>
        <nav className="flex items-center gap-4">
          <a href="/about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors text-sm font-medium">
            About
          </a>
          <div className="ml-2 border-l border-[var(--border)] pl-4">
            <SignIn />
          </div>
        </nav>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {!user && !authLoading && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                ログインしてプロジェクトを利用
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                右上の「ログインして利用」からサインインしてください。
              </p>
            </div>
          )}

          {user && (
            <>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    研究プロジェクト
                  </h2>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    所属しているプロジェクトの一覧
                  </p>
                </div>
                <button
                  onClick={() => router.push('/projects/new')}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  <FaPlus className="w-3 h-3" />
                  新規プロジェクト
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
                  読み込み中…
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16 bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-xl">
                  <FaFolder className="w-10 h-10 mx-auto text-[var(--text-secondary)] mb-4 opacity-40" />
                  <p className="text-[var(--text-primary)] font-medium mb-1">
                    プロジェクトがまだありません
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm mb-6">
                    新しいプロジェクトを作成して始めましょう
                  </p>
                  <button
                    onClick={() => router.push('/projects/new')}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                  >
                    プロジェクトを作成
                  </button>
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => openProject(p.id)}
                        className="w-full text-left p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-[var(--text-primary)] flex-1 truncate">
                            {p.name}
                          </h3>
                          {p.visibility === 'public' ? (
                            <FaGlobe className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0 mt-1" title="public" />
                          ) : (
                            <FaLock className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0 mt-1" title="private" />
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                            {p.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-3">
                          <span>
                            アノテ <strong className="text-[var(--text-primary)]">{p.annotationCount}</strong>
                          </span>
                          <span>•</span>
                          <span>更新 {formatDate(p.lastUpdatedAt)}</span>
                          {p.createdBy === user.uid && (
                            <span className="ml-auto flex items-center gap-1 text-[var(--primary)]">
                              <FaUser className="w-2.5 h-2.5" />
                              owner
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-12 border-t border-[var(--border)] pt-8">
                <button
                  onClick={downloadVocabulary}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-5 py-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full group-hover:bg-emerald-100 transition-colors">
                    <FaDownload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[var(--text-primary)] text-sm">Vocabulary をダウンロード</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">オントロジーを Turtle (.ttl) で出力</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
