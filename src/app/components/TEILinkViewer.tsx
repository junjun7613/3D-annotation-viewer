'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';
import { FaUpload, FaTrashAlt } from 'react-icons/fa';
import { IoDocumentTextOutline } from 'react-icons/io5';
import type { TeiLineMappingMap } from '@/types/main';

interface TEILinkViewerProps {
  onTextLoad?: (text: string) => void;
  onLineClick?: (lineNumber: string, lineText: string) => void;
  onUnlink?: (lineNumber: string) => void;
  lineMappings?: TeiLineMappingMap;
  selectedLineNumber?: string | null;
  highlightedLineNumber?: string | null;
  manifestUrl?: string;
  initialXml?: string;
  canExport?: boolean;
  isExporting?: boolean;
  onExport?: () => void;
  onClearTei?: () => void;
}

interface CETEIInstance {
  addBehaviors: (behaviors: Record<string, unknown>) => void;
  makeHTML5: (xmlText: string, callback: (data: HTMLElement) => void) => void;
}

function extractLineTexts(xmlText: string): Record<string, string> {
  const lineTexts: Record<string, string> = {};
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const editionDiv = doc.querySelector('div[type="edition"]');
    if (!editionDiv) return lineTexts;
    const lbs = editionDiv.querySelectorAll('lb');
    lbs.forEach((lb) => {
      const n = lb.getAttribute('n');
      if (!n) return;
      const parts: string[] = [];
      let node: Node | null = lb.nextSibling;
      while (node && node.nodeName !== 'lb') {
        parts.push((node.textContent || '').trim());
        node = node.nextSibling;
      }
      lineTexts[n] = parts.filter(Boolean).join(' ');
    });
  } catch { /* ignore */ }
  return lineTexts;
}

const FA_LINK_PATH = "M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.567 12.262-3.783 16.612l-13.087 13.087c-28.026 28.026-28.905 73.66-1.155 101.96 28.024 28.579 74.086 28.749 102.325.51l67.2-67.19c28.191-28.191 28.073-73.757 0-101.83-3.701-3.694-7.429-6.564-10.341-8.569a16.037 16.037 0 0 1-6.947-12.606c-.396-10.567 3.348-21.456 11.698-29.806l21.054-21.055c5.521-5.521 14.182-6.199 20.584-1.731a152.482 152.482 0 0 1 20.522 17.197zM467.547 44.449c-59.261-59.262-155.69-59.27-214.96 0l-67.2 67.2c-.12.12-.25.25-.36.37-58.566 58.892-59.387 154.781.36 214.59a152.454 152.454 0 0 0 20.521 17.196c6.402 4.468 15.064 3.789 20.584-1.731l21.054-21.055c8.35-8.35 12.094-19.239 11.698-29.806a16.037 16.037 0 0 0-6.947-12.606c-2.912-2.005-6.64-4.875-10.341-8.569-28.073-28.073-28.191-73.639 0-101.83l67.2-67.19c28.239-28.239 74.3-28.069 102.325.51 27.75 28.3 26.872 73.934-1.155 101.96l-13.087 13.087c-4.35 4.35-5.769 10.79-3.783 16.612 5.864 17.194 9.042 34.999 9.69 52.721.509 13.906 17.454 20.446 27.294 10.606l37.106-37.106c59.271-59.259 59.271-155.699.001-214.959z";
const FA_UNLINK_PATH = "M304.083 405.907c4.686 4.686 4.686 12.284 0 16.971l-44.674 44.674c-59.263 59.262-155.693 59.266-214.961 0-59.264-59.265-59.264-155.696 0-214.96l44.675-44.675c4.686-4.686 12.284-4.686 16.971 0l39.598 39.598c4.686 4.686 4.686 12.284 0 16.971l-44.675 44.674c-28.072 28.073-28.072 73.75 0 101.823 28.072 28.072 73.75 28.073 101.824 0l44.674-44.674c4.686-4.686 12.284-4.686 16.971 0l39.597 39.598zm-56.568-260.216c4.686 4.686 12.284 4.686 16.971 0l44.674-44.674c28.072-28.075 73.75-28.073 101.824 0 28.072 28.073 28.072 73.75 0 101.823l-44.675 44.674c-4.686 4.686-4.686 12.284 0 16.971l39.598 39.598c4.686 4.686 12.284 4.686 16.971 0l44.675-44.675c59.265-59.265 59.265-155.695 0-214.96-59.266-59.264-155.695-59.264-214.961 0l-44.674 44.674c-4.686 4.686-4.686 12.284 0 16.971l39.597 39.598zm234.828 359.28l22.627-22.627c9.373-9.373 9.373-24.569 0-33.941L63.598 7.029c-9.373-9.373-24.569-9.373-33.941 0L7.029 29.657c-9.373 9.373-9.373 24.569 0 33.941l441.373 441.373c9.373 9.372 24.569 9.372 33.941 0z";

let activePopover: HTMLElement | null = null;

function closeActivePopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

function showUnlinkPopover(
  anchor: HTMLElement,
  lineNumber: string,
  onUnlinkRef: React.RefObject<((n: string) => void) | undefined>
) {
  closeActivePopover();

  const pop = document.createElement('div');
  pop.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'background:var(--card-bg,#1e1e2e)',
    'border:1px solid var(--border,#444)',
    'border-radius:6px',
    'padding:8px 10px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
    'display:flex',
    'flex-direction:column',
    'gap:6px',
    'min-width:130px',
  ].join(';');

  const label = document.createElement('span');
  label.textContent = `Unlink line ${lineNumber}?`;
  label.style.cssText = 'font-size:0.75rem;color:var(--text-secondary,#aaa);white-space:nowrap;';

  const btn = document.createElement('button');
  btn.textContent = 'Unlink';
  btn.style.cssText = [
    'cursor:pointer',
    'font-size:0.75rem',
    'padding:3px 10px',
    'border-radius:4px',
    'border:none',
    'background:#ef4444',
    'color:#fff',
    'font-weight:600',
  ].join(';');
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeActivePopover();
    onUnlinkRef.current?.(lineNumber);
  });

  pop.appendChild(label);
  pop.appendChild(btn);
  document.body.appendChild(pop);
  activePopover = pop;

  // Position below the anchor
  const rect = anchor.getBoundingClientRect();
  const popW = 140;
  const left = Math.min(rect.left, window.innerWidth - popW - 8);
  pop.style.left = `${left}px`;
  pop.style.top = `${rect.bottom + 4}px`;

  // Close on outside click
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

const TEILinkViewer: React.FC<TEILinkViewerProps> = ({
  onTextLoad,
  onLineClick,
  onUnlink,
  lineMappings,
  selectedLineNumber,
  highlightedLineNumber,
  manifestUrl,
  initialXml,
  canExport,
  isExporting,
  onExport,
  onClearTei,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diplomatic' | 'transcription'>('diplomatic');
  const [lineTexts, setLineTexts] = useState<Record<string, string>>({});
  const [hasDiplomatic, setHasDiplomatic] = useState(false);
  const [hasTranscription, setHasTranscription] = useState(false);

  // DOM containers - CETEIcean DOM is mounted directly here (not via dangerouslySetInnerHTML)
  const diplomaticRef = useRef<HTMLDivElement>(null);
  const transcriptionRef = useRef<HTMLDivElement>(null);

  // Latest callback refs
  const onLineClickRef = useRef(onLineClick);
  const onUnlinkRef = useRef(onUnlink);
  const lineTextsRef = useRef(lineTexts);
  const lineMappingsRef = useRef(lineMappings);
  const isRestoringRef = useRef(false);

  useEffect(() => { onLineClickRef.current = onLineClick; }, [onLineClick]);
  useEffect(() => { onUnlinkRef.current = onUnlink; }, [onUnlink]);
  useEffect(() => { lineTextsRef.current = lineTexts; }, [lineTexts]);
  useEffect(() => { lineMappingsRef.current = lineMappings; }, [lineMappings]);

  useEffect(() => {
    setFileName('');
    setError('');
    setLineTexts({});
    setHasDiplomatic(false);
    setHasTranscription(false);
    if (diplomaticRef.current) diplomaticRef.current.innerHTML = '';
    if (transcriptionRef.current) transcriptionRef.current.innerHTML = '';
  }, [manifestUrl]);

  // Marker update function - updates SVGs and unlink buttons on existing DOM
  const refreshMarkers = useCallback(() => {
    const containers = [diplomaticRef.current, transcriptionRef.current].filter(Boolean) as HTMLElement[];
    containers.forEach((container) => {
      container.querySelectorAll<HTMLElement>('[data-line-number]').forEach((marker) => {
        const n = marker.dataset.lineNumber;
        if (!n) return;
        const isMapped = lineMappings?.[n]?.annotationId != null;
        const isSelected = selectedLineNumber === n;
        const isHighlighted = highlightedLineNumber === n;

        marker.innerHTML = markerSVG(isMapped, isSelected);

        // Highlight the parent lb element
        const lbEl = marker.parentElement;
        if (lbEl) {
          if (isHighlighted) {
            lbEl.style.backgroundColor = 'color-mix(in srgb, var(--primary) 15%, transparent)';
            lbEl.style.borderRadius = '3px';
            lbEl.style.marginLeft = '-4px';
            lbEl.style.paddingLeft = '4px';
          } else {
            lbEl.style.backgroundColor = '';
            lbEl.style.borderRadius = '';
            lbEl.style.marginLeft = '';
            lbEl.style.paddingLeft = '';
          }
        }

        // Double-click on linked marker opens unlink popover
        marker.ondblclick = isMapped
          ? (ev) => { ev.stopPropagation(); showUnlinkPopover(marker, n, onUnlinkRef); }
          : null;
      });
    });
  }, [lineMappings, selectedLineNumber, highlightedLineNumber]);

  // Update markers when props change
  useEffect(() => {
    refreshMarkers();
  }, [refreshMarkers]);

  // CETEIcean lb behavior - creates marker spans with click handlers
  const buildLbBehavior = useCallback(() => (e: HTMLElement) => {
    const n = e.getAttribute('n');
    if (n) {
      const lineMark = document.createElement('span');
      lineMark.innerHTML = markerSVG(false, false);
      lineMark.style.cursor = 'pointer';
      lineMark.style.marginRight = '0.4rem';
      lineMark.style.display = 'inline-flex';
      lineMark.style.alignItems = 'center';
      lineMark.style.verticalAlign = 'middle';
      lineMark.style.transition = 'opacity 0.15s';
      lineMark.dataset.lineNumber = n;
      lineMark.title = `Line ${n} - Click to link annotation`;

      // Click handler: only link if not already mapped (mapped lines use dblclick to unlink)
      lineMark.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (lineMappingsRef.current?.[n]?.annotationId != null) return;
        onLineClickRef.current?.(n, lineTextsRef.current[n] || '');
      });

      e.insertBefore(lineMark, e.firstChild);
    }
    if (n && n !== '1') {
      const br = document.createElement('br');
      e.insertBefore(br, e.firstChild);
    }
  }, []);

  // Process TEI XML and mount DOM directly to refs
  const processTEIFile = useCallback(
    (xmlText: string) => {
      const extracted = extractLineTexts(xmlText);
      setLineTexts(extracted);

      const makeBehaviors = (hideEx: boolean) => ({
        tei: {
          facsimile: (e: HTMLElement) => { e.innerHTML = ''; },
          head: (e: HTMLElement) => { e.innerHTML = ''; },
          bibl: (e: HTMLElement) => { e.innerHTML = ''; },
          teiHeader: (e: HTMLElement) => { e.style.display = 'none'; },
          div: (e: HTMLElement) => {
            if (e.getAttribute('type') !== 'edition') e.style.display = 'none';
          },
          lb: buildLbBehavior(),
          ...(hideEx ? { ex: (e: HTMLElement) => { e.style.display = 'none'; } } : {}),
        },
      });

      try {
        // Diplomatic view
        const ctDiplomatic = new CETEI() as unknown as CETEIInstance;
        ctDiplomatic.addBehaviors(makeBehaviors(true));
        ctDiplomatic.makeHTML5(xmlText, (data) => {
          if (diplomaticRef.current) {
            diplomaticRef.current.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'tei-diplomatic';
            wrapper.appendChild(data);
            wrapper.querySelectorAll('tei-ex').forEach((ex) => {
              (ex as HTMLElement).style.setProperty('display', 'none', 'important');
            });
            // Mount DOM directly - event handlers are preserved!
            diplomaticRef.current.appendChild(wrapper);
            setHasDiplomatic(true);
          }
        });

        // Transcription view
        const ctTranscription = new CETEI() as unknown as CETEIInstance;
        ctTranscription.addBehaviors(makeBehaviors(false));
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
            transcriptionRef.current.appendChild(wrapper);
            setHasTranscription(true);
          }
          setIsLoading(false);
          if (onTextLoad && !isRestoringRef.current) onTextLoad(xmlText);
          isRestoringRef.current = false;
        });

        // Update markers after DOM is mounted
        requestAnimationFrame(() => refreshMarkers());
      } catch {
        setError('Error processing TEI/XML file');
        setIsLoading(false);
      }
    },
    [buildLbBehavior, onTextLoad, refreshMarkers]
  );

  // Process initial XML from Firestore
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
              <span className="text-xs ml-1">{isExporting ? 'Generating\u2026' : 'Export TEI'}</span>
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
            title={manifestUrl ? 'Upload TEI/XML' : 'Load a 3D model first'}
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
        {/* Both containers always exist in DOM, visibility controlled by CSS */}
        <div ref={diplomaticRef} style={{ display: activeTab === 'diplomatic' ? 'block' : 'none' }} />
        <div ref={transcriptionRef} style={{ display: activeTab === 'transcription' ? 'block' : 'none' }} />
      </div>
    </div>
  );
};

export default TEILinkViewer;
