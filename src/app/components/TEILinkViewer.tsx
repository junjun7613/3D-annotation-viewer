'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';
import { FaUpload } from 'react-icons/fa';
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

function markerSVG(isMapped: boolean, isSelected: boolean): string {
  if (isSelected) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="var(--primary)"/></svg>`;
  } else if (isMapped) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#22c55e"/></svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/></svg>`;
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

  useEffect(() => { onLineClickRef.current = onLineClick; }, [onLineClick]);
  useEffect(() => { onUnlinkRef.current = onUnlink; }, [onUnlink]);
  useEffect(() => { lineTextsRef.current = lineTexts; }, [lineTexts]);

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

        // Update unlink buttons
        marker.parentElement?.querySelectorAll<HTMLElement>(`[data-unlink-line="${n}"]`).forEach((el) => el.remove());
        if (isMapped && marker.parentElement) {
          const btn = document.createElement('span');
          btn.dataset.unlinkLine = n;
          btn.textContent = '\u00d7';
          btn.title = 'Unlink annotation';
          btn.style.cssText = 'cursor:pointer;margin-left:2px;font-size:0.75rem;color:#ef4444;opacity:0.8;vertical-align:middle;';
          btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
          btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.8'; });
          btn.addEventListener('click', (ev) => { ev.stopPropagation(); onUnlinkRef.current?.(n); });
          marker.after(btn);
        }
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

      // Click handler directly on DOM element - survives because we mount DOM directly
      lineMark.addEventListener('click', (ev) => {
        ev.stopPropagation();
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
          if (onTextLoad) onTextLoad(xmlText);
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
        <h3 className="text-lg m-0 text-[var(--text-primary)]">Text Viewer</h3>
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
          <label
            className={`btn-icon btn-icon-sm ${manifestUrl ? 'btn-secondary cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            title={manifestUrl ? 'Upload TEI/XML' : 'Load a 3D model first'}
          >
            <FaUpload />
            <input type="file" accept=".xml,.tei" onChange={handleFileUpload} className="hidden" disabled={!manifestUrl} />
          </label>
        </div>
      </div>

      <div className="flex gap-2 mb-3 border-b border-[var(--border)] min-h-[44px] flex-shrink-0">
        {(hasDiplomatic || hasTranscription) && (
          <>
            <button
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'diplomatic' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              onClick={() => setActiveTab('diplomatic')}
            >Diplomatic</button>
            <button
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'transcription' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              onClick={() => setActiveTab('transcription')}
            >Transcription</button>
          </>
        )}
      </div>

      {(hasDiplomatic || hasTranscription) && onLineClick && (
        <div className="flex gap-3 mb-2 text-xs text-[var(--text-muted)] flex-shrink-0">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="var(--primary)"/></svg>
            selected
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#22c55e"/></svg>
            linked
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/></svg>
            unlinked
          </span>
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
