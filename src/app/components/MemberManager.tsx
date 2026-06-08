'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaUserPlus, FaTrash, FaCrown, FaUserEdit, FaEye } from 'react-icons/fa';
import { auth } from '@/lib/firebase/firebase';
import { projectMemberService } from '@/lib/services/projects';
import type { ProjectMember, ProjectRole } from '@/types/main';

interface MemberManagerProps {
  projectId: string;
  canManage: boolean;
}

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

function RoleIcon({ role }: { role: ProjectRole }) {
  if (role === 'owner') return <FaCrown className="w-3 h-3 text-yellow-500" />;
  if (role === 'editor') return <FaUserEdit className="w-3 h-3 text-blue-500" />;
  return <FaEye className="w-3 h-3 text-[var(--text-secondary)]" />;
}

export default function MemberManager({ projectId, canManage }: MemberManagerProps) {
  const [user] = useAuthState(auth);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await projectMemberService.list(projectId);
      list.sort((a, b) => {
        // owner > editor > viewer
        const order = { owner: 0, editor: 1, viewer: 2 } as const;
        return order[a.role] - order[b.role];
      });
      setMembers(list);
    } catch (err) {
      console.warn('[MemberManager.list] failed:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.hint || data.error || '招待に失敗しました');
      } else {
        setInviteEmail('');
        await reload();
      }
    } catch (err) {
      console.error(err);
      setError('通信エラーが発生しました');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (uid: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    await projectMemberService.remove(projectId, uid);
    await reload();
  };

  const changeRole = async (uid: string, role: ProjectRole) => {
    if (!user) return;
    await projectMemberService.upsert(projectId, uid, role, user.uid);
    await reload();
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-end justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">メンバー</h3>
        <span className="text-xs text-[var(--text-secondary)]">{members.length} 人</span>
      </div>

      {canManage && (
        <form onSubmit={invite} className="flex flex-wrap items-stretch gap-2 mb-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="招待する email アドレス"
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
            className="input-field"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm disabled:opacity-50"
          >
            <FaUserPlus className="w-3 h-3" />
            {inviting ? '送信中…' : '招待'}
          </button>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--text-secondary)]">読み込み中…</div>
      ) : members.length === 0 ? (
        <div className="text-sm text-[var(--text-secondary)]">メンバーがいません</div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {members.map((m) => (
            <li key={m.uid} className="py-2 flex items-center gap-3">
              <RoleIcon role={m.role} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-mono truncate">{m.uid}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {ROLE_LABEL[m.role]} ・ 参加 {new Date(m.joinedAt).toISOString().slice(0, 10)}
                </p>
              </div>
              {canManage && m.uid !== user?.uid && (
                <div className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.uid, e.target.value as ProjectRole)}
                    className="text-xs px-2 py-1 border border-[var(--border)] rounded-md bg-[var(--card-bg)]"
                  >
                    <option value="owner">Owner</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.uid)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 rounded-md"
                    title="削除"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              )}
              {m.uid === user?.uid && (
                <span className="text-xs text-[var(--text-secondary)]">あなた</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
