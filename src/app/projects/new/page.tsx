'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaLock, FaGlobe, FaArrowLeft } from 'react-icons/fa';
import { auth } from '@/lib/firebase/firebase';
import SignIn from '@/app/components/SignIn';
import { projectService } from '@/lib/services/projects';
import type { ProjectVisibility } from '@/types/main';

export default function NewProjectPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('プロジェクト名を入力してください');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await projectService.create({
        name: trimmed,
        description: description.trim() || undefined,
        visibility,
        ownerUid: user.uid,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      setError('作成に失敗しました');
      setSubmitting(false);
    }
  };

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
          <h1 className="m-0 text-lg sm:text-xl font-bold text-[var(--text-primary)]">新規プロジェクト</h1>
        </div>
        <nav className="flex items-center gap-4">
          <SignIn />
        </nav>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-xl mx-auto">
          {!user && !authLoading ? (
            <div className="text-center py-20 text-[var(--text-secondary)] text-sm">
              ログインが必要です
            </div>
          ) : (
            <form onSubmit={submit} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  プロジェクト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：ペルシア絨毯銘文プロジェクト"
                  className="input-field w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="プロジェクトの目的・対象・期間など"
                  rows={4}
                  className="input-field w-full resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  可視性
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      visibility === 'private'
                        ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                  >
                    <FaLock className="w-4 h-4 text-[var(--text-secondary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Private</p>
                      <p className="text-xs text-[var(--text-secondary)]">招待メンバーのみ</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      visibility === 'public'
                        ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                  >
                    <FaGlobe className="w-4 h-4 text-[var(--text-secondary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Public</p>
                      <p className="text-xs text-[var(--text-secondary)]">誰でも閲覧可</p>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {submitting ? '作成中…' : '作成'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
