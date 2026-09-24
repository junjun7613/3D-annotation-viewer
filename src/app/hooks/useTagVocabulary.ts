'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  tagVocabularyService,
  type TagVocabularyEntry,
} from '@/lib/services/tagVocabulary';
import type { TagItem } from '@/types/main';

/**
 * 現在プロジェクトのタグ語彙を読み込み、入力サジェストに使うフック。
 *
 * 語彙は入力を制限するものではなく補完の材料。取得に失敗しても
 * 空配列で動作を続け、タグの自由入力は常に可能。
 *
 * @param projectId 対象プロジェクト ID（null なら語彙なしで動作）
 */
export function useTagVocabulary(projectId: string | null) {
  const [entries, setEntries] = useState<TagVocabularyEntry[]>([]);

  const reload = useCallback(() => {
    if (!projectId) {
      setEntries([]);
      return;
    }
    tagVocabularyService.list(projectId).then(setEntries);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setEntries([]);
      return;
    }
    tagVocabularyService.list(projectId).then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /** 既知の分類軸（key）一覧 */
  const keys = useMemo(() => entries.map((e) => e.key).sort(), [entries]);

  /** 指定 key に紐づく既知の値一覧 */
  const valuesFor = useCallback(
    (key: string): string[] => {
      const trimmed = key.trim();
      if (!trimmed) return [];
      const entry = entries.find((e) => e.key === trimmed);
      return entry ? [...(entry.values ?? [])].sort() : [];
    },
    [entries]
  );

  /**
   * 付与済みタグを語彙へ記録し、ローカル状態も更新する。
   * 保存処理から呼ぶことで、次回の入力候補に即座に反映される。
   */
  const record = useCallback(
    async (tags: TagItem[]) => {
      if (!projectId || tags.length === 0) return;
      await tagVocabularyService.recordAll(projectId, tags);
      reload();
    },
    [projectId, reload]
  );

  return { entries, keys, valuesFor, record, reload };
}
