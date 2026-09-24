/**
 * タグ語彙サービス
 *
 * - projects/{projectId}/tagVocabulary/{encodedKey} : 分類軸ごとの値リスト
 *
 * タグは事前定義せず、使われた key / value をここへ自動蓄積する。
 * 入力補完（サジェスト）の材料であり、入力を制限するものではない。
 *
 * 権限は projects/{pid} 配下のサブコレクションとして親の membership 判定に従う。
 * collectionGroup は使わない（client SDK ではルールの静的評価で permission-denied になる）。
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  arrayUnion,
} from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import type { TagItem } from '@/types/main';

const PROJECTS = 'projects';
const TAG_VOCABULARY = 'tagVocabulary';

/** 分類軸ごとの語彙エントリ */
export interface TagVocabularyEntry {
  key: string;
  values: string[];
  updatedAt: number;
}

/**
 * key をドキュメント ID に使うためのエンコード。
 * Firestore のドキュメント ID は '/' を含められず、'.' '..' が予約されているため。
 */
function encodeKey(key: string): string {
  return encodeURIComponent(key).replace(/\./g, '%2E');
}

function vocabularyCol(projectId: string) {
  return collection(db, PROJECTS, projectId, TAG_VOCABULARY);
}

function vocabularyRef(projectId: string, key: string) {
  return doc(db, PROJECTS, projectId, TAG_VOCABULARY, encodeKey(key));
}

export const tagVocabularyService = {
  /**
   * プロジェクトの全タグ語彙を取得。
   * 読み取りに失敗してもタグ入力自体は続行できるよう、常に配列を返す。
   */
  async list(projectId: string): Promise<TagVocabularyEntry[]> {
    try {
      const snap = await getDocs(vocabularyCol(projectId));
      return snap.docs.map((d) => d.data() as TagVocabularyEntry);
    } catch (err) {
      console.warn(`[tagVocabularyService.list] failed for ${projectId}:`, err);
      return [];
    }
  },

  /**
   * 使われた key / value を語彙へ追記する。
   *
   * arrayUnion により同じ値の重複登録は起きない。
   * 語彙の蓄積はタグ付与の副作用であり、失敗してもタグ本体の保存を妨げない
   * （呼び出し側は await するが、エラーは握りつぶす）。
   */
  async record(projectId: string, key: string, value: string): Promise<void> {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) return;
    try {
      await setDoc(
        vocabularyRef(projectId, trimmedKey),
        {
          key: trimmedKey,
          values: arrayUnion(trimmedValue),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn(`[tagVocabularyService.record] failed for ${projectId}/${trimmedKey}:`, err);
    }
  },

  /** 複数タグをまとめて語彙へ記録する */
  async recordAll(projectId: string, tags: TagItem[]): Promise<void> {
    await Promise.all(tags.map((t) => this.record(projectId, t.key, t.value)));
  },

  /** 特定の key に紐づく値の一覧（サジェスト用） */
  async valuesFor(projectId: string, key: string): Promise<string[]> {
    try {
      const snap = await getDoc(vocabularyRef(projectId, key.trim()));
      if (!snap.exists()) return [];
      return (snap.data() as TagVocabularyEntry).values ?? [];
    } catch (err) {
      console.warn(`[tagVocabularyService.valuesFor] failed for ${projectId}/${key}:`, err);
      return [];
    }
  },
};
