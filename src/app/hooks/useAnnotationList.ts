'use client';

import { useState, useCallback } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';

/**
 * Manages the annotation list panel state: fetching annotations for a given manifest,
 * toggling the list open/closed, and tracking which annotation is focused.
 *
 * @param manifestUrl 対象マニフェスト URL
 * @param researchProjectId 現プロジェクト ID。null の場合は全件返す（読み取り専用ビュー用途）
 * @param showAllProjects true の場合は researchProjectId 一致条件を無視して全プロジェクトのアノテを返す
 */
export function useAnnotationList(
  manifestUrl: string,
  researchProjectId: string | null,
  showAllProjects: boolean = false,
) {
  const [annotationList, setAnnotationList] = useState<{ id: string; title: string; createdAt: number }[]>([]);
  const [isAnnotationListOpen, setIsAnnotationListOpen] = useState(false);
  const [focusAnnotationId, setFocusAnnotationId] = useState<string | null>(null);

  const handleAnnotationListOpen = useCallback(async () => {
    if (!manifestUrl) {
      alert('Please enter a manifest URL first.');
      return;
    }
    const querySnapshot = await getDocs(collection(db, 'test'));
    const list: { id: string; title: string; createdAt: number }[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.target_manifest !== manifestUrl) return;
      // showAllProjects が ON のときは projectId フィルタを掛けない
      if (!showAllProjects && researchProjectId && data.researchProjectId !== researchProjectId) return;
      // Object Annotation は除外（一覧は領域アノテーションのみ）
      if (data.isObjectLevel === true) return;
      list.push({
        id: doc.id,
        title: data.data?.body?.label || 'Untitled',
        createdAt: data.createdAt || 0,
      });
    });
    // Sort by creation time ascending (oldest first)
    list.sort((a, b) => a.createdAt - b.createdAt);
    setAnnotationList(list);
    setIsAnnotationListOpen(true);
  }, [manifestUrl, researchProjectId, showAllProjects]);

  return {
    annotationList,
    isAnnotationListOpen,
    setIsAnnotationListOpen,
    focusAnnotationId,
    setFocusAnnotationId,
    handleAnnotationListOpen,
  };
}
