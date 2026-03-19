'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { NextPage } from 'next';
import SignIn from '../components/SignIn';
import ThreeCanvas from '../components/ThreeCanvasManifest';
import TEILinkViewer from '../components/TEILinkViewer';
import { useAtom } from 'jotai';
import { infoPanelAtom } from '@/app/atoms/infoPanelAtom';
import { generateSourceDocTei } from '@/utils/teiGenerator';
import type { AnnotationCoords } from '@/utils/teiGenerator';
import type { TeiLineMappingMap } from '@/types/main';
import { objectMetadataService } from '@/lib/services/objectMetadata';
import db from '@/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

const LinkPage: NextPage = () => {
  const [user] = useAuthState(auth);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  const [infoPanelContent] = useAtom(infoPanelAtom);

  // TEI linking state
  const [teiLineMappings, setTeiLineMappings] = useState<TeiLineMappingMap>({});
  const [selectedTeiLine, setSelectedTeiLine] = useState<string | null>(null);
  const [originalTeiXml, setOriginalTeiXml] = useState<string>('');
  const [isGeneratingTei, setIsGeneratingTei] = useState(false);

  // Compute effective selected line
  const effectiveSelectedTeiLine = (() => {
    if (!selectedTeiLine) return null;
    const mapping = teiLineMappings[selectedTeiLine];
    if (mapping && infoPanelContent?.id && mapping.annotationId !== infoPanelContent.id) {
      return null;
    }
    return selectedTeiLine;
  })();

  const highlightedLineNumber = infoPanelContent?.id
    ? (Object.values(teiLineMappings).find((m) => m.annotationId === infoPanelContent.id)?.lineNumber ?? null)
    : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) setManifestUrl(manifestParam);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!manifestUrl) return;
      const metadata = await objectMetadataService.getObjectMetadata(manifestUrl);
      if (metadata?.tei_original) {
        setOriginalTeiXml(metadata.tei_original);
        setTeiLineMappings(metadata.tei_line_mappings || {});
      } else {
        setOriginalTeiXml('');
        setTeiLineMappings({});
      }
      setSelectedTeiLine(null);
    };
    fetchMetadata();
  }, [manifestUrl]);

  const handleTeiLineClick = useCallback((lineNumber: string, lineText: string) => {
    if (!infoPanelContent?.id) {
      setSelectedTeiLine((prev) => (prev === lineNumber ? null : lineNumber));
      return;
    }
    setTeiLineMappings((prev) => {
      if (prev[lineNumber]?.annotationId === infoPanelContent.id) {
        const next = { ...prev };
        delete next[lineNumber];
        return next;
      }
      const next = Object.fromEntries(
        Object.entries(prev).filter(([, m]) => m.annotationId !== infoPanelContent.id)
      );
      next[lineNumber] = { lineNumber, lineText, annotationId: infoPanelContent.id };
      return next;
    });
    setSelectedTeiLine(lineNumber);
  }, [infoPanelContent?.id]);

  const handleTeiUnlink = useCallback((lineNumber: string) => {
    setTeiLineMappings((prev) => {
      const next = { ...prev };
      delete next[lineNumber];
      return next;
    });
    setSelectedTeiLine((prev) => (prev === lineNumber ? null : prev));
  }, []);

  const downloadSourceDocTei = async () => {
    if (!originalTeiXml) { alert('Please upload a TEI/XML file first.'); return; }
    if (Object.keys(teiLineMappings).length === 0) { alert('Please link at least one line to an annotation.'); return; }
    setIsGeneratingTei(true);
    try {
      const linkedIds = Array.from(new Set(
        Object.values(teiLineMappings).map((m) => m.annotationId).filter((id): id is string => id !== null)
      ));
      const annotationCoords: Record<string, AnnotationCoords> = {};
      await Promise.all(linkedIds.map(async (id) => {
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
      }));
      const xml = generateSourceDocTei({ originalXml: originalTeiXml, lineMappings: teiLineMappings, annotationCoords, modelUrl: manifestUrl });
      if (user) {
        await objectMetadataService.saveTei(manifestUrl, originalTeiXml, xml, teiLineMappings, user.uid);
      }
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
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      {/* Left: 3D Viewer */}
      <div className="flex-1 min-w-0 relative">
        {manifestUrl ? (
          <ThreeCanvas
            annotationsVisible={true}
            annotationMode={false}
            manifestUrl={manifestUrl}
            editable={false}
            compactMarkers={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
            No manifest URL provided. Add ?manifest=URL to the address bar.
          </div>
        )}
      </div>

      {/* Right: TEI Text + Annotation Info */}
      <div className="w-96 border-l border-[var(--border)] flex flex-col overflow-hidden">
        {/* Selected annotation indicator */}
        <div className={`px-4 py-2 border-b border-[var(--border)] flex-shrink-0 text-sm ${infoPanelContent?.id ? 'bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]' : ''}`}>
          {infoPanelContent?.id ? (
            <div className="flex items-center gap-2">
              <svg width="10" height="10" viewBox="0 0 12 12" className="flex-shrink-0">
                <circle cx="6" cy="6" r="5" fill="var(--primary)"/>
              </svg>
              <span className="font-medium truncate">
                {infoPanelContent.title || infoPanelContent.id}
              </span>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">Click an annotation on the 3D model</span>
          )}
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <TEILinkViewer
            manifestUrl={manifestUrl}
            initialXml={originalTeiXml || undefined}
            onTextLoad={(xml) => { setOriginalTeiXml(xml); setTeiLineMappings({}); setSelectedTeiLine(null); }}
            onLineClick={handleTeiLineClick}
            onUnlink={handleTeiUnlink}
            lineMappings={teiLineMappings}
            selectedLineNumber={effectiveSelectedTeiLine}
            highlightedLineNumber={highlightedLineNumber}
            canExport={!!originalTeiXml && Object.keys(teiLineMappings).length > 0}
            isExporting={isGeneratingTei}
            onExport={originalTeiXml ? downloadSourceDocTei : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default LinkPage;
