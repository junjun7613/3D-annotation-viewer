import { atom } from 'jotai';

/**
 * 領域 / Object Annotation 一覧で「他プロジェクトのアノテーションも含めて表示する」モード。
 * セッション内のみ（リロード・別タブで OFF に戻る）。ON のときの編集は不可（read-only）。
 */
export const showAllProjectsAtom = atom<boolean>(false);

/**
 * プロジェクト ID → 表示名 のセッションキャッシュ。
 * バッジ表示用に各アノテの projectId から名前を引くために使う。
 * 取得は遅延（必要になったタイミングで projectService.get）。
 */
export const projectNameCacheAtom = atom<Record<string, string>>({});
