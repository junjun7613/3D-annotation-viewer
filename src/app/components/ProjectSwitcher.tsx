'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAtom } from 'jotai';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaChevronDown, FaCheck, FaPlus, FaFolder, FaLock, FaGlobe } from 'react-icons/fa';
import { auth } from '@/lib/firebase/firebase';
import { projectService } from '@/lib/services/projects';
import { currentProjectIdAtom, currentProjectAtom } from '@/app/atoms/currentProjectAtom';
import type { Project } from '@/types/main';

/**
 * ヘッダのプロジェクト切替ドロップダウン。
 * URL の `?pid=...` を書き換えてプロジェクトを切替える。
 */
export default function ProjectSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const [projectId] = useAtom(currentProjectIdAtom);
  const [currentProject] = useAtom(currentProjectAtom);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return;
    }
    projectService.listForMember(user.uid).then(setProjects);
  }, [user?.uid]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const switchTo = (pid: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('pid', pid);
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
  };

  const goToCreate = () => {
    router.push('/projects/new');
    setOpen(false);
  };

  if (!user) return null;

  const label = currentProject?.name ?? (projectId ? '読み込み中…' : 'プロジェクト未選択');

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--primary)] text-sm text-[var(--text-primary)] transition-colors"
      >
        <FaFolder className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <span className="max-w-[200px] truncate">{label}</span>
        <FaChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-96 overflow-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg z-50">
          {projects.length === 0 ? (
            <div className="p-4 text-sm text-[var(--text-secondary)]">
              所属プロジェクトがありません
            </div>
          ) : (
            <ul className="py-1">
              {projects.map((p) => {
                const active = p.id === projectId;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => switchTo(p.id)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--background)] flex items-center gap-2"
                    >
                      <span className="w-4 flex-shrink-0">
                        {active && <FaCheck className="w-3.5 h-3.5 text-[var(--primary)]" />}
                      </span>
                      <span className="flex-1 truncate text-sm text-[var(--text-primary)]">
                        {p.name}
                      </span>
                      {p.visibility === 'public' ? (
                        <FaGlobe className="w-3 h-3 text-[var(--text-secondary)]" />
                      ) : (
                        <FaLock className="w-3 h-3 text-[var(--text-secondary)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-[var(--border)]">
            <button
              onClick={goToCreate}
              className="w-full text-left px-3 py-2 hover:bg-[var(--background)] flex items-center gap-2 text-sm text-[var(--primary)]"
            >
              <FaPlus className="w-3 h-3" />
              新規プロジェクト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
