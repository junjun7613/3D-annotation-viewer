'use client';

import { useState, useCallback } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';

/**
 * Manages the annotation list panel state: fetching annotations for a given manifest,
 * toggling the list open/closed, and tracking which annotation is focused.
 */
export function useAnnotationList(manifestUrl: string) {
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
      if (data.target_manifest === manifestUrl) {
        list.push({
          id: doc.id,
          title: data.data?.body?.label || 'Untitled',
          createdAt: data.createdAt || 0,
        });
      }
    });
    // Sort by creation time ascending (oldest first)
    list.sort((a, b) => a.createdAt - b.createdAt);
    setAnnotationList(list);
    setIsAnnotationListOpen(true);
  }, [manifestUrl]);

  return {
    annotationList,
    isAnnotationListOpen,
    setIsAnnotationListOpen,
    focusAnnotationId,
    setFocusAnnotationId,
    handleAnnotationListOpen,
  };
}
