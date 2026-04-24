'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import { objectMetadataService } from '@/lib/services/objectMetadata';
import { generateSourceDocTei } from '@/utils/teiGenerator';
import type { AnnotationCoords } from '@/utils/teiGenerator';
import type { InfoPanelContent, TeiLineMappingMap } from '@/types/main';
import type { User } from 'firebase/auth';

interface UseTeiLinkingParams {
  infoPanelContent: InfoPanelContent | null;
  manifestUrl: string;
  user: User | null | undefined;
  savedTeiOriginal?: string;
  savedTeiLineMappings?: TeiLineMappingMap;
}

/**
 * Manages TEI line-to-annotation mappings, highlighted line computation,
 * and TEI sourceDoc XML generation/download.
 */
export function useTeiLinking({
  infoPanelContent,
  manifestUrl,
  user,
  savedTeiOriginal,
  savedTeiLineMappings,
}: UseTeiLinkingParams) {
  const [teiLineMappings, setTeiLineMappings] = useState<TeiLineMappingMap>({});
  const [selectedTeiLine, setSelectedTeiLine] = useState<string | null>(null);
  const [originalTeiXml, setOriginalTeiXml] = useState<string>('');
  const [isGeneratingTei, setIsGeneratingTei] = useState(false);

  // Track whether current state was restored from Firestore (skip auto-save in that case)
  const isRestoringRef = useRef(false);

  // Restore saved TEI data when it becomes available (e.g. after metadata fetch)
  useEffect(() => {
    if (savedTeiOriginal !== undefined) {
      isRestoringRef.current = true;
      if (savedTeiOriginal) {
        setOriginalTeiXml(savedTeiOriginal);
        setTeiLineMappings(savedTeiLineMappings || {});
        setSelectedTeiLine(null);
      } else {
        setOriginalTeiXml('');
        setTeiLineMappings({});
        setSelectedTeiLine(null);
      }
    }
  }, [savedTeiOriginal, savedTeiLineMappings]);

  // Auto-save on upload (originalTeiXml set) and on mapping changes
  useEffect(() => {
    if (!originalTeiXml || !manifestUrl || !user) return;
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    objectMetadataService.saveTei(manifestUrl, originalTeiXml, null, teiLineMappings, user.uid).catch(console.error);
  }, [originalTeiXml, teiLineMappings, manifestUrl, user]);

  // Highlighted line number for the currently selected annotation
  const highlightedLineNumber = infoPanelContent?.id
    ? (Object.values(teiLineMappings).find((m) => m.annotationId === infoPanelContent.id)?.lineNumber ?? null)
    : null;

  // Handle clicking a TEI line to link/unlink it with the current annotation
  const handleTeiLineClick = useCallback(
    (lineNumber: string, lineText: string) => {
      if (!infoPanelContent?.id) {
        setSelectedTeiLine((prev) => (prev === lineNumber ? null : lineNumber));
        return;
      }
      setTeiLineMappings((prev) => {
        // Same line + same annotation -> unlink
        if (prev[lineNumber]?.annotationId === infoPanelContent.id) {
          const next = { ...prev };
          delete next[lineNumber];
          return next;
        }
        // If this annotation is already linked to another line, remove that first (1 annotation = 1 line)
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, m]) => m.annotationId !== infoPanelContent.id)
        );
        next[lineNumber] = { lineNumber, lineText, annotationId: infoPanelContent.id };
        return next;
      });
      setSelectedTeiLine(lineNumber);
    },
    [infoPanelContent?.id]
  );

  // Clear all TEI data (state + Firestore)
  const clearTei = useCallback(async () => {
    isRestoringRef.current = true;
    setOriginalTeiXml('');
    setTeiLineMappings({});
    setSelectedTeiLine(null);
    if (manifestUrl && user) {
      await objectMetadataService.clearTei(manifestUrl, user.uid).catch(console.error);
    }
  }, [manifestUrl, user]);

  // Unlink a specific line
  const handleTeiUnlink = useCallback((lineNumber: string) => {
    setTeiLineMappings((prev) => {
      const next = { ...prev };
      delete next[lineNumber];
      return next;
    });
    setSelectedTeiLine((prev) => (prev === lineNumber ? null : prev));
  }, []);

  // Generate TEI sourceDoc XML and download + save to Firestore
  const downloadSourceDocTei = useCallback(async () => {
    if (!originalTeiXml) {
      alert('Please upload a TEI/XML file first.');
      return;
    }
    if (Object.keys(teiLineMappings).length === 0) {
      alert('Please link at least one line to an annotation.');
      return;
    }
    setIsGeneratingTei(true);
    try {
      const linkedIds = Array.from(
        new Set(
          Object.values(teiLineMappings)
            .map((m) => m.annotationId)
            .filter((id): id is string => id !== null)
        )
      );
      const annotationCoords: Record<string, AnnotationCoords> = {};
      await Promise.all(
        linkedIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'test', id));
          if (snap.exists()) {
            const d = snap.data();
            annotationCoords[id] = {
              id,
              label: d.data?.body?.label || id,
              position: d.data?.target?.selector?.value || [0, 0, 0],
              area: d.data?.target?.selector?.area || [0, 0, 0],
              camPos: d.data?.target?.selector?.camPos || [0, 0, 0],
            };
          }
        })
      );
      const xml = generateSourceDocTei({
        originalXml: originalTeiXml,
        lineMappings: teiLineMappings,
        annotationCoords,
        modelUrl: manifestUrl,
      });
      // Save to Firestore (with tei_sourcedoc)
      if (user) {
        isRestoringRef.current = true; // prevent double-save from auto-save effect
        await objectMetadataService.saveTei(manifestUrl, originalTeiXml, xml, teiLineMappings, user.uid);
      }
      // Download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
      a.download = 'sourceDoc_tei.xml';
      a.click();
    } catch (e) {
      console.error(e);
      alert('Failed to generate TEI XML.');
    } finally {
      setIsGeneratingTei(false);
    }
  }, [originalTeiXml, teiLineMappings, manifestUrl, user]);

  return {
    teiLineMappings,
    setTeiLineMappings,
    selectedTeiLine,
    setSelectedTeiLine,
    originalTeiXml,
    setOriginalTeiXml,
    isGeneratingTei,
    highlightedLineNumber,
    handleTeiLineClick,
    handleTeiUnlink,
    clearTei,
    downloadSourceDocTei,
  };
}
