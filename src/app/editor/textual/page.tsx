'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAtom } from 'jotai';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import type { NextPage } from 'next';

import db, { auth } from '@/lib/firebase/firebase';
import SignIn from '@/app/components/SignIn';
import ThreeCanvas from '@/app/components/ThreeCanvasManifest';
import type { Annotation2D } from '@/app/components/TwoDCanvas';
import TEILinkViewer from '@/app/components/TEILinkViewer';
import { regionPanelAtom, infoPanelAtom } from '@/app/atoms/infoPanelAtom';
import { objectMetadataService } from '@/lib/services/objectMetadata';
import { generateSourceDocTei, type RegionCoords } from '@/utils/teiGenerator';
import { detectManifestType, type ManifestType } from '@/utils/manifestType';
import type { TeiElementMappingMap } from '@/types/main';

const TwoDCanvas = dynamic(() => import('@/app/components/TwoDCanvas'), { ssr: false });

const TextualEditor: NextPage = () => {
  const [user] = useAuthState(auth);
  const [manifestUrl, setManifestUrl] = useState<string>('');
  const [manifestType, setManifestType] = useState<ManifestType>('unknown');
  const [annotations2D, setAnnotations2D] = useState<Annotation2D[]>([]);

  const [regionPanelContent, setRegionPanelContent] = useAtom(regionPanelAtom);
  const [infoPanelContent, setInfoPanelContent] = useAtom(infoPanelAtom);

  // TEI 要素マッピング状態
  const [elementMappings, setElementMappings] = useState<TeiElementMappingMap>({});
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [originalTeiXml, setOriginalTeiXml] = useState<string>('');
  const [isGeneratingTei, setIsGeneratingTei] = useState(false);

  // 利用可能な要素タイプと、ユーザーが選択中のタイプ
  const [availableTypes, setAvailableTypes] = useState<{ type: string; count: number }[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>(['lb']);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestParam = params.get('manifest');
    if (manifestParam) setManifestUrl(manifestParam);
  }, []);

  useEffect(() => {
    setInfoPanelContent(null);
    setRegionPanelContent(null);
    return () => {
      setInfoPanelContent(null);
      setRegionPanelContent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!manifestUrl) return;
    detectManifestType(manifestUrl).then(setManifestType);
  }, [manifestUrl]);

  useEffect(() => {
    if (manifestType !== '2d' || !manifestUrl) return;
    const unsubscribe = onSnapshot(collection(db, 'regions'), (snapshot) => {
      const list: Annotation2D[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.target_manifest !== manifestUrl) return;
        const sel = d.selector;
        if (sel?.type === '2DRectSelector') {
          list.push({ kind: 'rect', id: docSnap.id, label: '', x: sel.x, y: sel.y, width: sel.width, height: sel.height });
        } else if (sel?.type === '2DPolygonSelector') {
          list.push({ kind: 'polygon', id: docSnap.id, label: '', points: sel.points });
        }
      });
      setAnnotations2D(list);
    });
    return () => unsubscribe();
  }, [manifestType, manifestUrl]);

  // Firestore から TEI を復元
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!manifestUrl) return;
      const metadata = await objectMetadataService.getObjectMetadata(manifestUrl);
      if (metadata?.tei_original) {
        setOriginalTeiXml(metadata.tei_original);
        setElementMappings(metadata.tei_element_mappings || {});
      } else {
        setOriginalTeiXml('');
        setElementMappings({});
      }
      setSelectedElementId(null);
    };
    fetchMetadata();
  }, [manifestUrl]);

  // 選択中の領域 ID
  const selectedRegionId = regionPanelContent?.regionId ?? null;

  // テキスト行クリック → 紐付け済み regionId をマーカーハイライトへ
  const focusRegionId = useMemo(() => {
    if (!selectedElementId) return null;
    return elementMappings[selectedElementId]?.regionId ?? null;
  }, [selectedElementId, elementMappings]);

  // マーカークリック → 紐付け済み elementId を要素ハイライトへ
  const highlightedElementId = useMemo(() => {
    if (!selectedRegionId) return null;
    return Object.values(elementMappings).find((m) => m.regionId === selectedRegionId)?.elementId ?? null;
  }, [selectedRegionId, elementMappings]);

  const handleElementClick = useCallback(
    (elementId: string, elementType: string, label: string) => {
      const existingRegionId = elementMappings[elementId]?.regionId ?? null;

      // リンク済み要素をクリック → その region を選択中にして両側ハイライト連動
      if (existingRegionId) {
        setSelectedElementId(elementId);
        if (selectedRegionId !== existingRegionId) {
          setRegionPanelContent({ regionId: existingRegionId, annotations: [] });
        }
        return;
      }

      // 未リンク要素：region 未選択ならハイライトのみ、選択中ならリンク作成
      if (!selectedRegionId) {
        setSelectedElementId((prev) => (prev === elementId ? null : elementId));
        return;
      }
      setElementMappings((prev) => {
        // この region が他の要素にリンク済みなら外す（1 region = 1 element）
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, m]) => m.regionId !== selectedRegionId)
        );
        next[elementId] = { elementId, elementType, label, regionId: selectedRegionId };
        return next;
      });
      setSelectedElementId(elementId);
    },
    [selectedRegionId, elementMappings, setRegionPanelContent]
  );

  const handleElementUnlink = useCallback((elementId: string) => {
    setElementMappings((prev) => {
      const next = { ...prev };
      delete next[elementId];
      return next;
    });
    setSelectedElementId((prev) => (prev === elementId ? null : prev));
  }, []);

  const persistTei = useCallback(
    async (xml: string, mappings: TeiElementMappingMap) => {
      if (!manifestUrl || !user) return;
      await objectMetadataService.saveTei(manifestUrl, xml, null, mappings, user.uid).catch(console.error);
    },
    [manifestUrl, user]
  );

  useEffect(() => {
    if (!originalTeiXml) return;
    persistTei(originalTeiXml, elementMappings);
  }, [elementMappings, originalTeiXml, persistTei]);

  const handleClearTei = useCallback(async () => {
    setOriginalTeiXml('');
    setElementMappings({});
    setSelectedElementId(null);
    setAvailableTypes([]);
    if (manifestUrl && user) {
      await objectMetadataService.clearTei(manifestUrl, user.uid).catch(console.error);
    }
  }, [manifestUrl, user]);

  const downloadSourceDocTei = useCallback(async () => {
    if (!originalTeiXml) { alert('Please upload a TEI/XML file first.'); return; }
    if (Object.keys(elementMappings).length === 0) { alert('Please link at least one element to a region.'); return; }
    setIsGeneratingTei(true);
    try {
      const linkedRegionIds = Array.from(new Set(
        Object.values(elementMappings).map((m) => m.regionId).filter((id): id is string => id !== null)
      ));
      const regionCoords: Record<string, RegionCoords> = {};
      await Promise.all(linkedRegionIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'regions', id));
        if (snap.exists()) {
          const d = snap.data();
          regionCoords[id] = {
            id,
            position: (d.selector?.value as [number, number, number]) || [0, 0, 0],
            area: (Array.isArray(d.selector?.area) ? d.selector.area.slice(0, 3) : [0, 0, 0]) as [number, number, number],
            camPos: (d.selector?.camPos as [number, number, number]) || [0, 0, 0],
          };
        }
      }));
      const xml = generateSourceDocTei({ originalXml: originalTeiXml, elementMappings, regionCoords, modelUrl: manifestUrl });
      if (user) {
        await objectMetadataService.saveTei(manifestUrl, originalTeiXml, xml, elementMappings, user.uid);
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
  }, [originalTeiXml, elementMappings, manifestUrl, user]);

  useEffect(() => {
    if (infoPanelContent) setInfoPanelContent(null);
  }, [infoPanelContent, setInfoPanelContent]);

  // 領域に紐づくアノテーション数（表示用）
  const [annotationCountByRegion, setAnnotationCountByRegion] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!manifestUrl) return;
    getDocs(query(collection(db, 'test'), where('target_manifest', '==', manifestUrl))).then((snap) => {
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const rid = d.data().regionId as string | undefined;
        if (rid) counts[rid] = (counts[rid] || 0) + 1;
      });
      setAnnotationCountByRegion(counts);
    });
  }, [manifestUrl]);

  // available types が変わったら active types を整合させる（無くなったタイプを外す）
  useEffect(() => {
    setActiveTypes((prev) => {
      const availableSet = new Set(availableTypes.map((t) => t.type));
      const filtered = prev.filter((t) => availableSet.has(t));
      // 初回ロード時、available に lb があれば lb をデフォルト ON、無ければ先頭を ON
      if (filtered.length === 0 && availableTypes.length > 0) {
        return [availableTypes.find((t) => t.type === 'lb')?.type ?? availableTypes[0].type];
      }
      return filtered;
    });
  }, [availableTypes]);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Textual Editor</h1>
          <span className="text-xs text-[var(--text-muted)] truncate max-w-md">{manifestUrl || '(no manifest)'}</span>
          {manifestType !== 'unknown' && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border)] uppercase">
              {manifestType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/editor/${manifestType === '2d' ? '2d' : '3d'}${manifestUrl ? `?manifest=${encodeURIComponent(manifestUrl)}` : ''}`}
            className="text-xs px-2.5 py-1 rounded border border-[var(--border)] hover:bg-[var(--card-bg)]"
          >
            ← Back to {manifestType === '2d' ? '2D' : '3D'} Editor
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Viewer */}
        <div className="flex-1 min-w-0 relative">
          {!manifestUrl ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
              No manifest URL provided. Add ?manifest=URL to the address bar.
            </div>
          ) : manifestType === '2d' ? (
            <TwoDCanvas
              manifestUrl={manifestUrl}
              annotations={annotations2D}
              annotationMode="none"
              annotationsVisible={true}
              focusAnnotationId={focusRegionId}
              onAnnotationClick={(id) => {
                setRegionPanelContent({ regionId: id, annotations: [] });
              }}
              onObjectClick={() => setRegionPanelContent(null)}
            />
          ) : (
            <ThreeCanvas
              annotationsVisible={true}
              annotationMode={false}
              manifestUrl={manifestUrl}
              editable={false}
              compactMarkers={true}
              focusRegionId={focusRegionId}
              onObjectClick={() => setRegionPanelContent(null)}
            />
          )}
        </div>

        {/* Right: TEI viewer */}
        <div className="flex-1 min-w-0 border-l border-[var(--border)] flex flex-col overflow-hidden">
          {/* Selected region indicator */}
          <div className={`px-4 py-2 border-b border-[var(--border)] flex-shrink-0 text-sm ${selectedRegionId ? 'bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]' : ''}`}>
            {selectedRegionId ? (
              <div className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 12 12" className="flex-shrink-0">
                  <circle cx="6" cy="6" r="5" fill="var(--primary)" />
                </svg>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs">Region selected</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{selectedRegionId}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {annotationCountByRegion[selectedRegionId] ?? 0} annotation(s)
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[var(--text-muted)]">Click a marker on the viewer to select a region</span>
            )}
          </div>

          {/* Element type filter */}
          {availableTypes.length > 0 && (
            <div className="px-4 py-2 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Element types</span>
                <span className="text-[10px] text-[var(--text-muted)]">{activeTypes.length} / {availableTypes.length} active</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map(({ type, count }) => {
                  const active = activeTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        active
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                          : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {type} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-4">
            <TEILinkViewer
              manifestUrl={manifestUrl}
              initialXml={originalTeiXml || undefined}
              onTextLoad={(xml) => {
                setOriginalTeiXml(xml);
                setElementMappings({});
                setSelectedElementId(null);
                persistTei(xml, {});
              }}
              onElementClick={handleElementClick}
              onUnlink={handleElementUnlink}
              elementMappings={elementMappings}
              selectedElementId={selectedElementId}
              highlightedElementId={highlightedElementId}
              activeElementTypes={activeTypes}
              onAvailableTypesChange={setAvailableTypes}
              canExport={!!originalTeiXml && Object.keys(elementMappings).length > 0}
              isExporting={isGeneratingTei}
              onExport={originalTeiXml ? downloadSourceDocTei : undefined}
              onClearTei={originalTeiXml ? handleClearTei : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextualEditor;
