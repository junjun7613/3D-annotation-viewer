import { atom } from 'jotai';
import type { Project, ProjectRole } from '@/types/main';

/**
 * 現在選択中の研究プロジェクト ID。
 * 一次情報源は URL クエリ `?pid=...` だが、
 * ヘッダや非エディタ画面でも参照できるよう atom にキャッシュする。
 */
export const currentProjectIdAtom = atom<string | null>(null);

/** 取得済みのプロジェクト本体（id, name, visibility 等）。null = 未読み込み / 該当なし */
export const currentProjectAtom = atom<Project | null>(null);

/** 現在ユーザーの当該プロジェクトでのロール。null = 非メンバー */
export const currentProjectRoleAtom = atom<ProjectRole | null>(null);
