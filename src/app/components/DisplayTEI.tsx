'use client';

import { useState, useEffect, useCallback } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';
import { FaUpload } from 'react-icons/fa';
import type { TeiLineMappingMap } from '@/types/main';

interface DisplayTEIProps {
  onTextLoad?: (text: string) => void;
  onLineClick?: (lineNumber: string, lineText: string) => void;
  lineMappings?: TeiLineMappingMap;
  selectedLineNumber?: string | null;
  manifestUrl?: string;
}

interface CETEIInstance {
  addBehaviors: (behaviors: Record<string, unknown>) => void;
  makeHTML5: (xmlText: string, callback: (data: HTMLElement) => void) => void;
}

/**
 * XMLのeditionブロックから行番号→テキストのマップを抽出する
 */
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

      // lb以降、次のlbまでのテキストノードを収集
      const parts: string[] = [];
      let node: Node | null = lb.nextSibling;
      while (node && !(node.nodeName === 'lb')) {
        if (node.nodeType === Node.TEXT_NODE) {
          parts.push((node.textContent || '').trim());
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          parts.push((node.textContent || '').trim());
        }
        node = node.nextSibling;
      }
      lineTexts[n] = parts.filter(Boolean).join(' ');
    });
  } catch {
    // パース失敗時は空で返す
  }
  return lineTexts;
}

const DisplayTEI: React.FC<DisplayTEIProps> = ({
  onTextLoad,
  onLineClick,
  lineMappings,
  selectedLineNumber,
  manifestUrl,
}) => {
  const [teiHTMLDiplomatic, setTeiHTMLDiplomatic] = useState<string>('');
  const [teiHTMLTranscription, setTeiHTMLTranscription] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diplomatic' | 'transcription'>('diplomatic');
  const [lineTexts, setLineTexts] = useState<Record<string, string>>({});

  // Clear TEI viewer when manifestUrl changes
  useEffect(() => {
    setTeiHTMLDiplomatic('');
    setTeiHTMLTranscription('');
    setFileName('');
    setError('');
    setLineTexts({});
  }, [manifestUrl]);

  // lb要素のスタイルを外部state変化に合わせて更新
  useEffect(() => {
    const containers = document.querySelectorAll('.tei-diplomatic, .tei-transcription');
    containers.forEach((container) => {
      const markers = container.querySelectorAll<HTMLElement>('[data-line-number]');
      markers.forEach((marker) => {
        const n = marker.dataset.lineNumber;
        if (!n) return;
        const isMapped = lineMappings?.[n]?.annotationId != null;
        const isSelected = selectedLineNumber === n;
        updateMarkerStyle(marker, isMapped, isSelected);
      });
    });
  }, [lineMappings, selectedLineNumber]);

  const updateMarkerStyle = (marker: HTMLElement, isMapped: boolean, isSelected: boolean) => {
    if (isSelected) {
      marker.style.opacity = '1';
      marker.style.color = 'var(--primary)';
      marker.style.textShadow = '0 0 6px var(--primary)';
    } else if (isMapped) {
      marker.style.opacity = '1';
      marker.style.color = '#22c55e'; // green-500
      marker.style.textShadow = 'none';
    } else {
      marker.style.opacity = '0.5';
      marker.style.color = 'inherit';
      marker.style.textShadow = 'none';
    }
  };

  const buildLbBehavior = useCallback(
    (lineTextsSnapshot: Record<string, string>) =>
      (e: HTMLElement) => {
        const n = e.getAttribute('n');
        if (n) {
          const isMapped = lineMappings?.[n]?.annotationId != null;
          const isSelected = selectedLineNumber === n;

          const lineMark = document.createElement('span');
          lineMark.innerHTML = '🔗';
          lineMark.style.cursor = onLineClick ? 'pointer' : 'default';
          lineMark.style.marginRight = '0.5rem';
          lineMark.style.fontSize = '0.875rem';
          lineMark.style.transition = 'opacity 0.2s, color 0.2s';
          lineMark.dataset.lineNumber = n;
          lineMark.title = onLineClick
            ? `Line ${n} - Click to link annotation`
            : `Line ${n}`;

          updateMarkerStyle(lineMark, isMapped, isSelected);

          lineMark.addEventListener('mouseenter', () => {
            lineMark.style.opacity = '1';
          });
          lineMark.addEventListener('mouseleave', () => {
            updateMarkerStyle(
              lineMark,
              lineMappings?.[n]?.annotationId != null,
              selectedLineNumber === n
            );
          });

          if (onLineClick) {
            lineMark.addEventListener('click', (ev) => {
              ev.stopPropagation();
              onLineClick(n, lineTextsSnapshot[n] || '');
            });
          }

          e.insertBefore(lineMark, e.firstChild);
        }

        if (n && n !== '1') {
          const br = document.createElement('br');
          e.insertBefore(br, e.firstChild);
        }
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onLineClick, lineMappings, selectedLineNumber]
  );

  const processTEIFile = useCallback(
    (xmlText: string) => {
      const extracted = extractLineTexts(xmlText);
      setLineTexts(extracted);

      try {
        // --- Diplomatic ---
        const ctDiplomatic = new CETEI() as unknown as CETEIInstance;
        ctDiplomatic.addBehaviors({
          tei: {
            facsimile: (e: HTMLElement) => { e.innerHTML = ''; },
            head: (e: HTMLElement) => { e.innerHTML = ''; },
            bibl: (e: HTMLElement) => { e.innerHTML = ''; },
            teiHeader: (e: HTMLElement) => { e.style.display = 'none'; },
            div: (e: HTMLElement) => {
              const type = e.getAttribute('type');
              if (type && type !== 'edition') e.style.display = 'none';
            },
            lb: buildLbBehavior(extracted),
            ex: (e: HTMLElement) => { e.style.display = 'none'; },
          },
        });

        ctDiplomatic.makeHTML5(xmlText, (data: HTMLElement) => {
          const el = document.createElement('div');
          el.className = 'tei-diplomatic';
          el.appendChild(data);
          el.querySelectorAll('tei-ex').forEach((ex) => {
            (ex as HTMLElement).style.setProperty('display', 'none', 'important');
          });
          setTeiHTMLDiplomatic(el.outerHTML);
        });

        // --- Transcription ---
        const ctTranscription = new CETEI() as unknown as CETEIInstance;
        ctTranscription.addBehaviors({
          tei: {
            facsimile: (e: HTMLElement) => { e.innerHTML = ''; },
            head: (e: HTMLElement) => { e.innerHTML = ''; },
            bibl: (e: HTMLElement) => { e.innerHTML = ''; },
            teiHeader: (e: HTMLElement) => { e.style.display = 'none'; },
            div: (e: HTMLElement) => {
              const type = e.getAttribute('type');
              if (type && type !== 'edition') e.style.display = 'none';
            },
            lb: buildLbBehavior(extracted),
          },
        });

        ctTranscription.makeHTML5(xmlText, (data: HTMLElement) => {
          const el = document.createElement('div');
          el.className = 'tei-transcription';
          el.appendChild(data);

          el.querySelectorAll('tei-ex').forEach((ex) => {
            const htmlEx = ex as HTMLElement;
            const content = htmlEx.textContent || '';
            htmlEx.style.setProperty('display', 'inline', 'important');
            htmlEx.style.setProperty('font-style', 'italic', 'important');
            htmlEx.style.setProperty('color', '#999', 'important');
            htmlEx.innerHTML = '';
            htmlEx.appendChild(document.createTextNode('('));
            htmlEx.appendChild(document.createTextNode(content));
            htmlEx.appendChild(document.createTextNode(')'));
          });

          setTeiHTMLTranscription(el.outerHTML);
          setIsLoading(false);

          if (onTextLoad) onTextLoad(xmlText);
        });
      } catch {
        setError('Error processing TEI/XML file');
        setIsLoading(false);
      }
    },
    [buildLbBehavior, onTextLoad]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setError('');
    setTeiHTMLDiplomatic('');
    setTeiHTMLTranscription('');

    try {
      const text = await file.text();
      processTEIFile(text);
    } catch {
      setError('Error reading file');
      setIsLoading(false);
    }
  };

  // lineMappings / selectedLineNumber が変わったときに再レンダリングせずDOMを直接更新
  // （CETEIceanのHTML出力はdangerouslySetInnerHTMLなのでReactで再レンダリングしない）
  useEffect(() => {
    if (!teiHTMLDiplomatic && !teiHTMLTranscription) return;
    const containers = document.querySelectorAll<HTMLElement>('.tei-diplomatic, .tei-transcription');
    containers.forEach((container) => {
      container.querySelectorAll<HTMLElement>('[data-line-number]').forEach((marker) => {
        const n = marker.dataset.lineNumber;
        if (!n) return;
        const isMapped = lineMappings?.[n]?.annotationId != null;
        const isSelected = selectedLineNumber === n;
        updateMarkerStyle(marker, isMapped, isSelected);

        // クリックハンドラを再アタッチ（dangerouslySetInnerHTML後にイベントが消えるため）
        const newMarker = marker.cloneNode(true) as HTMLElement;
        newMarker.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (onLineClick && n) onLineClick(n, lineTexts[n] || '');
        });
        marker.replaceWith(newMarker);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineMappings, selectedLineNumber, teiHTMLDiplomatic, teiHTMLTranscription]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg m-0 text-[var(--text-primary)]">
          Text Viewer
        </h3>
        <label
          className={`btn-icon btn-icon-sm ${manifestUrl ? 'btn-secondary cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          title={manifestUrl ? 'Upload TEI/XML' : 'Load a 3D model first'}
        >
          <FaUpload />
          <input
            type="file"
            accept=".xml,.tei"
            onChange={handleFileUpload}
            className="hidden"
            disabled={!manifestUrl}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-[var(--border)] min-h-[44px] flex-shrink-0">
        {(teiHTMLDiplomatic || teiHTMLTranscription) && (
          <>
            <button
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'diplomatic'
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('diplomatic')}
            >
              Diplomatic
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'transcription'
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('transcription')}
            >
              Transcription
            </button>
          </>
        )}
      </div>

      {/* 紐づけ状態の凡例（XMLロード後のみ表示） */}
      {(teiHTMLDiplomatic || teiHTMLTranscription) && onLineClick && (
        <div className="flex gap-3 mb-2 text-xs text-[var(--text-muted)] flex-shrink-0">
          <span className="flex items-center gap-1">
            <span style={{ color: 'var(--primary)' }}>🔗</span> selected
          </span>
          <span className="flex items-center gap-1">
            <span style={{ color: '#22c55e' }}>🔗</span> linked
          </span>
          <span className="flex items-center gap-1">
            <span style={{ opacity: 0.5 }}>🔗</span> unlinked
          </span>
        </div>
      )}

      <div className="overflow-y-auto flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : activeTab === 'diplomatic' && teiHTMLDiplomatic ? (
          <div dangerouslySetInnerHTML={{ __html: teiHTMLDiplomatic }} />
        ) : activeTab === 'transcription' && teiHTMLTranscription ? (
          <div dangerouslySetInnerHTML={{ __html: teiHTMLTranscription }} />
        ) : !fileName ? (
          <div className="text-center py-4 text-[var(--text-muted)]">
            Upload a TEI/XML file to view the text
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DisplayTEI;
