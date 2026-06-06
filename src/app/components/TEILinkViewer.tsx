'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';
import { FaUpload, FaTrashAlt } from 'react-icons/fa';
import { IoDocumentTextOutline } from 'react-icons/io5';
import type { TeiElementMappingMap } from '@/types/main';

interface TEILinkViewerProps {
  onTextLoad?: (text: string) => void;
  onElementClick?: (elementId: string, elementType: string, label: string) => void;
  onUnlink?: (elementId: string) => void;
  elementMappings?: TeiElementMappingMap;
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  /** 表示・接続対象とする要素タイプ。空配列 / 未指定 → lb のみ。 */
  activeElementTypes?: string[];
  manifestUrl?: string;
  initialXml?: string;
  canExport?: boolean;
  isExporting?: boolean;
  onExport?: () => void;
  onClearTei?: () => void;
  /** XML から検出された要素タイプ一覧（{type, count}）を親に通知 */
  onAvailableTypesChange?: (types: { type: string; count: number }[]) => void;
}

interface CETEIInstance {
  addBehaviors: (behaviors: Record<string, unknown>) => void;
  makeHTML5: (xmlText: string, callback: (data: HTMLElement) => void) => void;
}

const FA_LINK_PATH = "M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.567 12.262-3.783 16.612l-13.087 13.087c-28.026 28.026-28.905 73.66-1.155 101.96 28.024 28.579 74.086 28.749 102.325.51l67.2-67.19c28.191-28.191 28.073-73.757 0-101.83-3.701-3.694-7.429-6.564-10.341-8.569a16.037 16.037 0 0 1-6.947-12.606c-.396-10.567 3.348-21.456 11.698-29.806l21.054-21.055c5.521-5.521 14.182-6.199 20.584-1.731a152.482 152.482 0 0 1 20.522 17.197zM467.547 44.449c-59.261-59.262-155.69-59.27-214.96 0l-67.2 67.2c-.12.12-.25.25-.36.37-58.566 58.892-59.387 154.781.36 214.59a152.454 152.454 0 0 0 20.521 17.196c6.402 4.468 15.064 3.789 20.584-1.731l21.054-21.055c8.35-8.35 12.094-19.239 11.698-29.806a16.037 16.037 0 0 0-6.947-12.606c-2.912-2.005-6.64-4.875-10.341-8.569-28.073-28.073-28.191-73.639 0-101.83l67.2-67.19c28.239-28.239 74.3-28.069 102.325.51 27.75 28.3 26.872 73.934-1.155 101.96l-13.087 13.087c-4.35 4.35-5.769 10.79-3.783 16.612 5.864 17.194 9.042 34.999 9.69 52.721.509 13.906 17.454 20.446 27.294 10.606l37.106-37.106c59.271-59.259 59.271-155.699.001-214.959z";
const FA_UNLINK_PATH = "M304.083 405.907c4.686 4.686 4.686 12.284 0 16.971l-44.674 44.674c-59.263 59.262-155.693 59.266-214.961 0-59.264-59.265-59.264-155.696 0-214.96l44.675-44.675c4.686-4.686 12.284-4.686 16.971 0l39.598 39.598c4.686 4.686 4.686 12.284 0 16.971l-44.675 44.674c-28.072 28.073-28.072 73.75 0 101.823 28.072 28.072 73.75 28.073 101.824 0l44.674-44.674c4.686-4.686 12.284-4.686 16.971 0l39.597 39.598zm-56.568-260.216c4.686 4.686 12.284 4.686 16.971 0l44.674-44.674c28.072-28.075 73.75-28.073 101.824 0 28.072 28.073 28.072 73.75 0 101.823l-44.675 44.674c-4.686 4.686-4.686 12.284 0 16.971l39.598 39.598c4.686 4.686 12.284 4.686 16.971 0l44.675-44.675c59.265-59.265 59.265-155.695 0-214.96-59.266-59.264-155.695-59.264-214.961 0l-44.674 44.674c-4.686 4.686-4.686 12.284 0 16.971l39.597 39.598zm234.828 359.28l22.627-22.627c9.373-9.373 9.373-24.569 0-33.941L63.598 7.029c-9.373-9.373-24.569-9.373-33.941 0L7.029 29.657c-9.373 9.373-9.373 24.569 0 33.941l441.373 441.373c9.373 9.372 24.569 9.372 33.941 0z";

let activePopover: HTMLElement | null = null;
function closeActivePopover() {
  if (activePopover) { activePopover.remove(); activePopover = null; }
}

function showUnlinkPopover(
  anchor: HTMLElement,
  elementId: string,
  onUnlinkRef: React.RefObject<((id: string) => void) | undefined>
) {
  closeActivePopover();
  const pop = document.createElement('div');
  pop.style.cssText = [
    'position:fixed', 'z-index:9999',
    'background:var(--card-bg,#1e1e2e)',
    'border:1px solid var(--border,#444)',
    'border-radius:6px', 'padding:8px 10px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
    'display:flex', 'flex-direction:column', 'gap:6px', 'min-width:130px',
  ].join(';');
  const label = document.createElement('span');
  label.textContent = 'Unlink?';
  label.style.cssText = 'font-size:0.75rem;color:var(--text-secondary,#aaa);white-space:nowrap;';
  const btn = document.createElement('button');
  btn.textContent = 'Unlink';
  btn.style.cssText = 'cursor:pointer;font-size:0.75rem;padding:3px 10px;border-radius:4px;border:none;background:#ef4444;color:#fff;font-weight:600;';
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeActivePopover();
    onUnlinkRef.current?.(elementId);
  });
  pop.appendChild(label);
  pop.appendChild(btn);
  document.body.appendChild(pop);
  activePopover = pop;
  const rect = anchor.getBoundingClientRect();
  const popW = 140;
  const left = Math.min(rect.left, window.innerWidth - popW - 8);
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + 4}px`;
  const onOutside = (ev: MouseEvent) => {
    if (!pop.contains(ev.target as Node)) {
      closeActivePopover();
      document.removeEventListener('mousedown', onOutside, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', onOutside, true), 0);
}

function markerSVG(isMapped: boolean, isSelected: boolean): string {
  if (isSelected) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 512 512" pointer-events="none"><path fill="var(--primary)" d="${FA_LINK_PATH}"/></svg>`;
  } else if (isMapped) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 512 512" pointer-events="none"><path fill="#22c55e" d="${FA_LINK_PATH}"/></svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 512 512" pointer-events="none"><path fill="currentColor" opacity="0.35" d="${FA_UNLINK_PATH}"/></svg>`;
  }
}

/** XML から (要素タイプ, 件数) を集計。lb は @n を持つもののみカウント。その他は xml:id を持つもののみカウント。 */
function extractAvailableTypes(xmlText: string): { type: string; count: number }[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const counter: Record<string, number> = {};
    // lb (@n) 専用集計
    doc.querySelectorAll('lb').forEach((el) => {
      if (el.getAttribute('n')) counter.lb = (counter.lb || 0) + 1;
    });
    // xml:id を持つ全要素
    doc.querySelectorAll('*').forEach((el) => {
      const id = el.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'id') || el.getAttribute('xml:id');
      if (!id) return;
      const name = el.localName;
      if (name === 'lb') return; // lb は上で扱う
      counter[name] = (counter[name] || 0) + 1;
    });
    return Object.entries(counter)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  } catch {
    return [];
  }
}

const TEILinkViewer: React.FC<TEILinkViewerProps> = ({
  onTextLoad,
  onElementClick,
  onUnlink,
  elementMappings,
  selectedElementId,
  highlightedElementId,
  activeElementTypes,
  manifestUrl,
  initialXml,
  canExport,
  isExporting,
  onExport,
  onClearTei,
  onAvailableTypesChange,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diplomatic' | 'transcription'>('diplomatic');
  const [hasDiplomatic, setHasDiplomatic] = useState(false);
  const [hasTranscription, setHasTranscription] = useState(false);

  const diplomaticRef = useRef<HTMLDivElement>(null);
  const transcriptionRef = useRef<HTMLDivElement>(null);

  // active 設定（指定なければ lb のみ）
  const activeTypesSet = useMemo(() => {
    const arr = activeElementTypes && activeElementTypes.length > 0 ? activeElementTypes : ['lb'];
    return new Set(arr);
  }, [activeElementTypes]);

  const onElementClickRef = useRef(onElementClick);
  const onUnlinkRef = useRef(onUnlink);
  const elementMappingsRef = useRef(elementMappings);
  const activeTypesSetRef = useRef(activeTypesSet);
  const isRestoringRef = useRef(false);

  useEffect(() => { onElementClickRef.current = onElementClick; }, [onElementClick]);
  useEffect(() => { onUnlinkRef.current = onUnlink; }, [onUnlink]);
  useEffect(() => { elementMappingsRef.current = elementMappings; }, [elementMappings]);
  useEffect(() => { activeTypesSetRef.current = activeTypesSet; }, [activeTypesSet]);

  useEffect(() => {
    setFileName('');
    setError('');
    setHasDiplomatic(false);
    setHasTranscription(false);
    if (diplomaticRef.current) diplomaticRef.current.innerHTML = '';
    if (transcriptionRef.current) transcriptionRef.current.innerHTML = '';
  }, [manifestUrl]);

  /** マーカー更新（要素タイプフィルタ + リンク/選択状態） */
  const refreshMarkers = useCallback(() => {
    const containers = [diplomaticRef.current, transcriptionRef.current].filter(Boolean) as HTMLElement[];
    containers.forEach((container) => {
      container.querySelectorAll<HTMLElement>('[data-element-id]').forEach((marker) => {
        const eid = marker.dataset.elementId;
        const etype = marker.dataset.elementType || '';
        if (!eid) return;
        const visible = activeTypesSet.has(etype);
        marker.style.display = visible ? 'inline-flex' : 'none';
        if (!visible) return;

        const isMapped = elementMappings?.[eid]?.regionId != null;
        const isSelected = selectedElementId === eid;
        const isHighlighted = highlightedElementId === eid;

        marker.innerHTML = markerSVG(isMapped, isSelected);

        const parent = marker.parentElement;
        if (parent) {
          if (isHighlighted) {
            parent.style.backgroundColor = 'color-mix(in srgb, var(--primary) 18%, transparent)';
            parent.style.borderRadius = '3px';
          } else if (isMapped) {
            parent.style.backgroundColor = 'color-mix(in srgb, #22c55e 12%, transparent)';
            parent.style.borderRadius = '3px';
          } else {
            parent.style.backgroundColor = '';
            parent.style.borderRadius = '';
          }
        }

        marker.ondblclick = isMapped
          ? (ev) => { ev.stopPropagation(); showUnlinkPopover(marker, eid, onUnlinkRef); }
          : null;
      });
    });
  }, [elementMappings, selectedElementId, highlightedElementId, activeTypesSet]);

  useEffect(() => {
    refreshMarkers();
  }, [refreshMarkers]);

  /** CETEIcean ビヘイビア: lb と xml:id を持つ要素にマーカーを挿入。display は refreshMarkers が制御 */
  const insertMarkerInto = useCallback((e: HTMLElement, elementId: string, elementType: string, label: string) => {
    const marker = document.createElement('span');
    marker.innerHTML = markerSVG(false, false);
    marker.style.cursor = 'pointer';
    marker.style.marginRight = '0.3rem';
    marker.style.display = 'inline-flex';
    marker.style.alignItems = 'center';
    marker.style.verticalAlign = 'middle';
    marker.style.transition = 'opacity 0.15s';
    marker.dataset.elementId = elementId;
    marker.dataset.elementType = elementType;
    marker.title = `${elementType} — ${label || elementId}`;

    marker.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!activeTypesSetRef.current.has(elementType)) return;
      // リンク済みでも click は親に通知する（親側で region ハイライト連動）。
      // unlink は dblclick で行う。
      onElementClickRef.current?.(elementId, elementType, label);
    });

    e.insertBefore(marker, e.firstChild);
  }, []);

  const buildBehaviors = useCallback(
    (hideEx: boolean) => ({
      tei: {
        facsimile: (e: HTMLElement) => { e.innerHTML = ''; },
        head: (e: HTMLElement) => { e.innerHTML = ''; },
        bibl: (e: HTMLElement) => { e.innerHTML = ''; },
        teiHeader: (e: HTMLElement) => { e.style.display = 'none'; },
        div: (e: HTMLElement) => {
          if (e.getAttribute('type') !== 'edition') e.style.display = 'none';
        },
        lb: (e: HTMLElement) => {
          const n = e.getAttribute('n');
          if (n) {
            insertMarkerInto(e, `lb#${n}`, 'lb', `line ${n}`);
            if (n !== '1') {
              const br = document.createElement('br');
              e.insertBefore(br, e.firstChild);
            }
          }
        },
        ...(hideEx ? { ex: (e: HTMLElement) => { e.style.display = 'none'; } } : {}),
      },
    }),
    [insertMarkerInto]
  );

  /** CETEIcean レンダリング後に xml:id（HTML の id 属性に変換済み）を持つ要素へマーカーを挿入 */
  const decorateXmlIdElements = useCallback((wrapper: HTMLElement) => {
    // CETEIcean は <tei-foo> 形式にリネーム、`xml:id` を HTML の `id` 属性に変換する。
    // tei- プレフィクスを持つ要素のうち id が付いているものを対象とする。
    wrapper.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
      if (!el.tagName.toLowerCase().startsWith('tei-')) return;
      const xmlId = el.getAttribute('id');
      if (!xmlId) return;
      const rawType = el.tagName.toLowerCase().replace(/^tei-/, '');
      if (rawType === 'lb') return;
      // 既にマーカーが入っていればスキップ（再描画時の二重挿入防止）
      const first = el.firstElementChild as HTMLElement | null;
      if (first?.dataset?.elementId === xmlId) return;
      insertMarkerInto(el, xmlId, rawType, elementLabelFromHtml(el));
    });
  }, [insertMarkerInto]);

  const processTEIFile = useCallback(
    (xmlText: string) => {
      // 利用可能タイプを親に通知
      onAvailableTypesChange?.(extractAvailableTypes(xmlText));

      try {
        const ctDiplomatic = new CETEI() as unknown as CETEIInstance;
        ctDiplomatic.addBehaviors(buildBehaviors(true));
        ctDiplomatic.makeHTML5(xmlText, (data) => {
          if (diplomaticRef.current) {
            diplomaticRef.current.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'tei-diplomatic';
            wrapper.appendChild(data);
            wrapper.querySelectorAll('tei-ex').forEach((ex) => {
              (ex as HTMLElement).style.setProperty('display', 'none', 'important');
            });
            decorateXmlIdElements(wrapper);
            diplomaticRef.current.appendChild(wrapper);
            setHasDiplomatic(true);
          }
        });

        const ctTranscription = new CETEI() as unknown as CETEIInstance;
        ctTranscription.addBehaviors(buildBehaviors(false));
        ctTranscription.makeHTML5(xmlText, (data) => {
          if (transcriptionRef.current) {
            transcriptionRef.current.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'tei-transcription';
            wrapper.appendChild(data);
            wrapper.querySelectorAll('tei-ex').forEach((ex) => {
              const htmlEx = ex as HTMLElement;
              const content = htmlEx.textContent || '';
              htmlEx.style.setProperty('display', 'inline', 'important');
              htmlEx.style.setProperty('font-style', 'italic', 'important');
              htmlEx.style.setProperty('color', '#999', 'important');
              htmlEx.innerHTML = `(${content})`;
            });
            decorateXmlIdElements(wrapper);
            transcriptionRef.current.appendChild(wrapper);
            setHasTranscription(true);
          }
          setIsLoading(false);
          if (onTextLoad && !isRestoringRef.current) onTextLoad(xmlText);
          isRestoringRef.current = false;
        });

        requestAnimationFrame(() => refreshMarkers());
      } catch {
        setError('Error processing TEI/XML file');
        setIsLoading(false);
      }
    },
    [buildBehaviors, onTextLoad, refreshMarkers, onAvailableTypesChange, decorateXmlIdElements]
  );

  const processTEIFileRef = useRef(processTEIFile);
  useEffect(() => { processTEIFileRef.current = processTEIFile; }, [processTEIFile]);

  useEffect(() => {
    if (initialXml) {
      isRestoringRef.current = true;
      setIsLoading(true);
      setFileName('(restored)');
      setError('');
      setHasDiplomatic(false);
      setHasTranscription(false);
      if (diplomaticRef.current) diplomaticRef.current.innerHTML = '';
      if (transcriptionRef.current) transcriptionRef.current.innerHTML = '';
      processTEIFileRef.current(initialXml);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialXml]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    setError('');
    setHasDiplomatic(false);
    setHasTranscription(false);
    if (diplomaticRef.current) diplomaticRef.current.innerHTML = '';
    if (transcriptionRef.current) transcriptionRef.current.innerHTML = '';
    try {
      const text = await file.text();
      processTEIFile(text);
    } catch {
      setError('Error reading file');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-base font-semibold m-0 text-[var(--text-primary)]">TEI TEXT VIEWER</h3>
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              disabled={!canExport || isExporting}
              className="btn-icon btn-icon-sm btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export TEI with <sourceDoc>"
            >
              <IoDocumentTextOutline />
              <span className="text-xs ml-1">{isExporting ? 'Generating…' : 'Export TEI'}</span>
            </button>
          )}
          {onClearTei && fileName && (
            <button
              onClick={() => {
                setFileName('');
                setHasDiplomatic(false);
                setHasTranscription(false);
                if (diplomaticRef.current) diplomaticRef.current.innerHTML = '';
                if (transcriptionRef.current) transcriptionRef.current.innerHTML = '';
                onClearTei();
              }}
              className="btn-icon btn-icon-sm btn-secondary text-red-400 hover:text-red-500"
              title="Clear TEI"
            >
              <FaTrashAlt />
            </button>
          )}
          <label
            className={`btn-icon btn-icon-sm ${manifestUrl ? 'btn-secondary cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            title={manifestUrl ? 'Upload TEI/XML' : 'Load a manifest first'}
          >
            <FaUpload />
            <input type="file" accept=".xml,.tei" onChange={handleFileUpload} className="hidden" disabled={!manifestUrl} />
          </label>
        </div>
      </div>

      {(hasDiplomatic || hasTranscription) && (
        <div className="flex gap-2 mb-3 border-b border-[var(--border)] flex-shrink-0">
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'diplomatic' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setActiveTab('diplomatic')}
          >Diplomatic</button>
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'transcription' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            onClick={() => setActiveTab('transcription')}
          >Transcription</button>
        </div>
      )}

      <div className="overflow-y-auto flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : !fileName ? (
          <div className="text-center py-4 text-[var(--text-muted)]">
            Upload a TEI/XML file to view the text
          </div>
        ) : null}
        <div ref={diplomaticRef} style={{ display: activeTab === 'diplomatic' ? 'block' : 'none' }} />
        <div ref={transcriptionRef} style={{ display: activeTab === 'transcription' ? 'block' : 'none' }} />
      </div>
    </div>
  );
};

/** HTML 化された要素から短いラベルを取得（中の marker は除外） */
function elementLabelFromHtml(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('[data-element-id]').forEach((m) => m.remove());
  const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

export default TEILinkViewer;
