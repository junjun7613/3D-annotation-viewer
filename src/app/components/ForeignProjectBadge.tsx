'use client';

import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { projectNameCacheAtom } from '@/app/atoms/annotationFilterAtom';
import { projectService } from '@/lib/services/projects';

interface Props {
  projectId: string;
  className?: string;
}

/**
 * 他プロジェクトのアノテーションに付けるバッジ。プロジェクト名を非同期で解決し、
 * 取得済みの名前はセッションキャッシュに残す。未解決の間は ID 先頭 6 文字を仮表示。
 */
export default function ForeignProjectBadge({ projectId, className = '' }: Props) {
  const [cache, setCache] = useAtom(projectNameCacheAtom);

  useEffect(() => {
    if (!projectId || cache[projectId] !== undefined) return;
    let cancelled = false;
    projectService
      .get(projectId)
      .then((p) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [projectId]: p?.name ?? `(unknown: ${projectId.slice(0, 6)})` }));
      })
      .catch(() => {
        // private project でメンバーでなければ read 拒否される。プレースホルダ名をキャッシュして再試行を防ぐ。
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [projectId]: `(private: ${projectId.slice(0, 6)})` }));
      });
    return () => { cancelled = true; };
  }, [projectId, cache, setCache]);

  const label = cache[projectId] ?? `…${projectId.slice(0, 6)}`;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 ${className}`}
      title={`他プロジェクト: ${label}`}
    >
      {label}
    </span>
  );
}
