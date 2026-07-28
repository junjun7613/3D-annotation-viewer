'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SparqlTextViewerProps {
  endpoint: string;
}

interface TextEntry {
  uri: string;
  xmlId: string;
  localId: string;
  edcsId: string;
}

interface CharEntry {
  uri: string;
  offset: number;
}

interface AnnotationEntry {
  kind: string;
  n: string | null;
  start: number;
  end: number;
  annotText: string | null;
}

interface RangeEndpoint {
  offset: number;
  uri: string;
}

const PREFIX = `
  PREFIX ex: <http://example.org/atag#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

const ANNOTATION_LABEL: Record<string, string> = {
  expan: '略語展開',
  abbr: '省略形',
  ex: '展開形',
  supplied: '補完',
  gap: '欠損',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeSparqlLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function executeSparql(endpoint: string, query: string): Promise<Array<Record<string, { value: string }>>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/sparql-query',
    },
    body: query,
  });
  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.results.bindings;
}

const SparqlTextViewer: React.FC<SparqlTextViewerProps> = ({ endpoint }) => {
  const [inputValue, setInputValue] = useState<string>('');

  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string>('');
  const [currentText, setCurrentText] = useState<TextEntry | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [charURIs, setCharURIs] = useState<CharEntry[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationEntry[]>([]);

  const [rangeStart, setRangeStart] = useState<RangeEndpoint | null>(null);
  const [rangeEnd, setRangeEnd] = useState<RangeEndpoint | null>(null);
  const [charInfo, setCharInfo] = useState<{ offset: number; char: string; uri: string } | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);

  const loadByEdcsId = useCallback(
    async (rawId: string) => {
      const id = rawId.trim();
      if (!id) return;

      setTextLoading(true);
      setTextError('');
      setCurrentText(null);
      setTextContent('');
      setCharURIs([]);
      setAnnotations([]);
      setRangeStart(null);
      setRangeEnd(null);
      setCharInfo(null);

      try {
        const escaped = escapeSparqlLiteral(id);
        // Resolve the target text by edcsId / localId / teiXmlId in one query, fetch content + metadata.
        const lookupQuery =
          PREFIX +
          `
          SELECT ?text ?xmlId ?localId ?edcsId ?content
          WHERE {
            ?text a ex:Text ;
                  ex:textContent ?content .
            OPTIONAL { ?text ex:teiXmlId ?xmlId }
            OPTIONAL { ?text ex:localId ?localId }
            OPTIONAL { ?text ex:edcsId ?edcsId }
            FILTER (
              ?edcsId = "${escaped}" ||
              ?localId = "${escaped}" ||
              ?xmlId = "${escaped}"
            )
          }
          LIMIT 1
        `;
        const lookupBindings = await executeSparql(endpoint, lookupQuery);
        if (lookupBindings.length === 0) {
          setTextError(`"${id}" に一致する碑文が見つかりませんでした`);
          return;
        }
        const row = lookupBindings[0];
        const text: TextEntry = {
          uri: row.text.value,
          xmlId: row.xmlId?.value ?? '',
          localId: row.localId?.value ?? '',
          edcsId: row.edcsId?.value ?? '',
        };
        const content = row.content.value;

        const charQuery =
          PREFIX +
          `
          SELECT ?char ?offset
          WHERE {
            <${text.uri}> ex:firstChar ?firstChar .
            ?firstChar ex:next* ?char .
            ?char ex:offset ?offset .
          }
          ORDER BY xsd:integer(?offset)
        `;
        const annotQuery =
          PREFIX +
          `
          SELECT ?annot ?kind ?n ?start ?end ?annotText
          WHERE {
            <${text.uri}> ex:hasAnnotation ?annot .
            ?annot a ex:Annotation ;
                   ex:kind ?kind ;
                   ex:start ?start ;
                   ex:end ?end .
            OPTIONAL { ?annot ex:n ?n }
            OPTIONAL { ?annot ex:annotatedText ?annotText }
          }
          ORDER BY xsd:integer(?start)
        `;

        const [charResults, annotResults] = await Promise.all([
          executeSparql(endpoint, charQuery),
          executeSparql(endpoint, annotQuery),
        ]);

        const chars: CharEntry[] = charResults.map((r) => ({
          uri: r.char.value,
          offset: parseInt(r.offset.value, 10),
        }));
        const annots: AnnotationEntry[] = annotResults.map((r) => ({
          kind: r.kind.value,
          n: r.n?.value ?? null,
          start: parseInt(r.start.value, 10),
          end: parseInt(r.end.value, 10),
          annotText: r.annotText?.value ?? null,
        }));

        setCurrentText(text);
        setTextContent(content);
        setCharURIs(chars);
        setAnnotations(annots);
      } catch (e) {
        setTextError(e instanceof Error ? e.message : String(e));
      } finally {
        setTextLoading(false);
      }
    },
    [endpoint]
  );

  const handleLoadClick = useCallback(() => {
    if (!inputValue.trim()) return;
    void loadByEdcsId(inputValue);
  }, [inputValue, loadByEdcsId]);

  // Build HTML for the text viewer
  const textHtml = useMemo(() => {
    if (!textContent) return '';

    const annotMap = new Map<number, AnnotationEntry[]>();
    const lineAnnotations: AnnotationEntry[] = [];
    annotations.forEach((a) => {
      if (a.kind === 'line') {
        lineAnnotations.push(a);
      } else {
        for (let i = a.start; i < a.end; i++) {
          if (!annotMap.has(i)) annotMap.set(i, []);
          annotMap.get(i)!.push(a);
        }
      }
    });
    lineAnnotations.sort((a, b) => a.start - b.start);

    let html = '<div class="atag-text-content">';
    const currentAnnotations = new Set<AnnotationEntry>();
    let inLine = false;

    for (let i = 0; i < textContent.length; i++) {
      const char = textContent[i];
      const annots = annotMap.get(i) || [];

      const linesAtPos = lineAnnotations.filter((a) => a.start === i);
      if (linesAtPos.length > 0) {
        if (inLine) html += '</div>';
        linesAtPos.forEach((la) => {
          html += `<div class="atag-text-line">`;
          html += `<span class="atag-line-number">${la.n ?? ''}</span>`;
          inLine = true;
        });
      }

      const starting = annots.filter((a) => a.start === i);
      const ending = Array.from(currentAnnotations).filter((a) => a.end === i);

      ending.forEach((a) => {
        if (a.kind === 'supplied') html += ']';
        html += '</span>';
        currentAnnotations.delete(a);
      });

      starting.forEach((a) => {
        currentAnnotations.add(a);
        const baseLabel = ANNOTATION_LABEL[a.kind] ?? a.kind;
        const label = a.annotText ? `${baseLabel}: ${a.annotText}` : baseLabel;
        html += `<span class="atag-annotation atag-annotation-${a.kind}" title="${escapeHtml(label)}">`;
        if (a.kind === 'supplied') html += '[';
      });

      const charEntry = charURIs[i];
      const rdfOffset = charEntry ? charEntry.offset : i;
      const rdfUri = charEntry ? charEntry.uri : '';

      if (char === '\n') {
        if (inLine) {
          html += `<span class="atag-char" data-offset="${rdfOffset}" data-uri="${escapeHtml(rdfUri)}" data-char="\\n"> </span>`;
        }
      } else {
        html += `<span class="atag-char" data-offset="${rdfOffset}" data-uri="${escapeHtml(rdfUri)}" data-char="${escapeHtml(char)}">${escapeHtml(char)}</span>`;
      }
    }

    currentAnnotations.forEach(() => {
      html += '</span>';
    });
    if (inLine) html += '</div>';
    html += '</div>';
    return html;
  }, [textContent, annotations, charURIs]);

  // Update range-highlight classes when range changes
  useEffect(() => {
    const root = viewerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLSpanElement>('.atag-char').forEach((el) => {
      el.classList.remove('atag-range-start', 'atag-range-end', 'atag-range-selected');
    });
    if (rangeStart === null && rangeEnd === null) return;

    if (rangeStart !== null) {
      const startEl = root.querySelector<HTMLSpanElement>(`.atag-char[data-offset="${rangeStart.offset}"]`);
      startEl?.classList.add('atag-range-start');
    }
    if (rangeEnd !== null) {
      const endEl = root.querySelector<HTMLSpanElement>(`.atag-char[data-offset="${rangeEnd.offset}"]`);
      endEl?.classList.add('atag-range-end');
    }
    if (rangeStart !== null && rangeEnd !== null) {
      const lo = Math.min(rangeStart.offset, rangeEnd.offset);
      const hi = Math.max(rangeStart.offset, rangeEnd.offset);
      root.querySelectorAll<HTMLSpanElement>('.atag-char').forEach((el) => {
        const off = parseInt(el.dataset.offset ?? '', 10);
        if (off > lo && off < hi) el.classList.add('atag-range-selected');
      });
    }
  }, [rangeStart, rangeEnd, textHtml]);

  const onViewerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('atag-char')) return;
    const offset = parseInt(target.dataset.offset ?? '', 10);
    if (Number.isNaN(offset)) return;
    const uri = target.dataset.uri ?? '';
    const char = target.dataset.char ?? '';
    setCharInfo({ offset, char, uri });
  }, []);

  const clearRange = useCallback(() => {
    setRangeStart(null);
    setRangeEnd(null);
    setCharInfo(null);
  }, []);

  const setStartFromCharInfo = useCallback(() => {
    if (!charInfo) return;
    setRangeStart({ offset: charInfo.offset, uri: charInfo.uri });
  }, [charInfo]);

  const setEndFromCharInfo = useCallback(() => {
    if (!charInfo) return;
    setRangeEnd({ offset: charInfo.offset, uri: charInfo.uri });
  }, [charInfo]);

  const stats = useMemo(() => {
    const lineCount = annotations.filter((a) => a.kind === 'line').length;
    return {
      charCount: textContent.length,
      annotCount: annotations.length,
      lineCount,
    };
  }, [textContent, annotations]);

  const noEndpoint = !endpoint;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <style jsx global>{`
        .atag-text-content {
          font-family: 'Times New Roman', serif;
          font-size: 1rem;
          line-height: 2.2;
          letter-spacing: 0.5px;
          color: var(--text-primary);
        }
        .atag-text-line {
          display: block;
          margin-bottom: 0.5em;
        }
        .atag-line-number {
          color: #e74c3c;
          font-weight: bold;
          font-size: 0.85em;
          margin-right: 10px;
          display: inline-block;
          min-width: 25px;
        }
        .atag-annotation {
          position: relative;
          cursor: help;
          transition: background-color 0.2s;
        }
        .atag-annotation:hover {
          background-color: color-mix(in srgb, var(--primary) 15%, transparent);
        }
        .atag-annotation-expan {
          border-bottom: 2px solid #3498db;
          background-color: rgba(52, 152, 219, 0.08);
        }
        .atag-annotation-abbr {
          font-weight: bold;
          color: var(--text-primary);
        }
        .atag-annotation-ex {
          color: #999;
          font-style: italic;
        }
        .atag-annotation-supplied {
          border-bottom: 2px dotted #e67e22;
          background-color: rgba(230, 126, 34, 0.08);
        }
        .atag-annotation-gap {
          color: #95a5a6;
          font-style: italic;
          background-color: rgba(149, 165, 166, 0.15);
        }
        .atag-char {
          cursor: pointer;
          position: relative;
        }
        .atag-char:hover {
          background-color: color-mix(in srgb, var(--primary) 20%, transparent);
        }
        .atag-char.atag-range-start {
          background-color: rgba(46, 204, 113, 0.35);
          border-left: 2px solid #2ecc71;
        }
        .atag-char.atag-range-end {
          background-color: rgba(46, 204, 113, 0.35);
          border-right: 2px solid #2ecc71;
        }
        .atag-char.atag-range-selected {
          background-color: rgba(46, 204, 113, 0.15);
        }
      `}</style>

      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-base font-semibold m-0 text-[var(--text-primary)]">ATAG SPARQL Text Viewer</h3>
      </div>

      {noEndpoint ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">
          NEXT_PUBLIC_ATAG_SPARQL_ENDPOINT が設定されていません。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
            <label className="text-xs text-[var(--text-secondary)] font-medium" htmlFor="atag-text-input">
              EDCS ID:
            </label>
            <input
              id="atag-text-input"
              type="text"
              placeholder="例: EDCS-12345678"
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLoadClick();
                }
              }}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] min-w-[220px]"
            />
            <button
              onClick={handleLoadClick}
              disabled={textLoading || !inputValue.trim()}
              className="text-xs px-3 py-1 rounded bg-[var(--primary)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {textLoading ? '読み込み中...' : '読み込み'}
            </button>
          </div>

          {currentText && !textLoading && !textError && (
            <div className="flex gap-4 mb-2 flex-shrink-0 text-[10px] text-[var(--text-secondary)]">
              <span>
                <span className="font-semibold">文字数:</span> {stats.charCount}
              </span>
              <span>
                <span className="font-semibold">アノテーション:</span> {stats.annotCount}
              </span>
              <span>
                <span className="font-semibold">行数:</span> {stats.lineCount}
              </span>
              {currentText.edcsId && (
                <a
                  href={`https://db.edcs.eu/epigr/epi_einzel_en.php?p_edcs_id=${currentText.edcsId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)] hover:underline"
                >
                  EDCSで表示 ↗
                </a>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto text-sm text-[var(--text-primary)]">
            {textLoading ? (
              <div className="text-center py-8 text-[var(--text-muted)]">テキストを読み込み中...</div>
            ) : textError ? (
              <div className="text-center py-8 text-red-500">{textError}</div>
            ) : !currentText ? (
              <div className="text-center py-4 text-[var(--text-muted)]">EDCS ID を入力して読み込んでください</div>
            ) : (
              <div
                ref={viewerRef}
                className="px-2 py-2"
                onClick={onViewerClick}
                dangerouslySetInnerHTML={{ __html: textHtml }}
              />
            )}
          </div>

          {/* 凡例 */}
          {currentText && !textLoading && !textError && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex-shrink-0">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">凡例</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--text-secondary)]">
                <span><span style={{ color: '#e74c3c', fontWeight: 'bold' }}>1</span> 行番号</span>
                <span><span className="atag-annotation atag-annotation-expan">略語展開</span></span>
                <span><span className="atag-annotation atag-annotation-abbr">省略形</span></span>
                <span><span className="atag-annotation atag-annotation-ex">展開形</span></span>
                <span><span className="atag-annotation atag-annotation-supplied">補完</span></span>
                <span><span className="atag-annotation atag-annotation-gap">[---]</span> 欠損</span>
              </div>
            </div>
          )}

          {/* 文字情報パネル */}
          {charInfo && (
            <div className="fixed bottom-5 right-5 z-40 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl p-4 max-w-md text-xs text-[var(--text-primary)]">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm m-0">文字情報</h4>
                <button
                  onClick={() => setCharInfo(null)}
                  className="text-[var(--text-secondary)] hover:text-red-500 leading-none text-lg"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1 font-mono">
                <div>
                  <span className="text-[var(--primary)] font-semibold">文字:</span>{' '}
                  &quot;{charInfo.char === '\\n' ? '(改行)' : charInfo.char}&quot;
                </div>
                <div>
                  <span className="text-[var(--primary)] font-semibold">オフセット:</span> {charInfo.offset}
                </div>
                <div className="break-all">
                  <span className="text-[var(--primary)] font-semibold">文字URI:</span>
                  <br />
                  <span className="text-[10px]">{charInfo.uri || '(見つかりません)'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={setStartFromCharInfo}
                  className="text-[11px] px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  始点に設定
                </button>
                <button
                  onClick={setEndFromCharInfo}
                  className="text-[11px] px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  終点に設定
                </button>
              </div>
              {(rangeStart !== null || rangeEnd !== null) && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px]">
                  <div className="font-semibold text-[var(--primary)] mb-1">選択範囲:</div>
                  {rangeStart !== null && (
                    <div className="mb-1">
                      <strong>始点:</strong> offset={rangeStart.offset}
                      <br />
                      <span className="text-[10px] break-all">{rangeStart.uri}</span>
                    </div>
                  )}
                  {rangeEnd !== null && (
                    <div className="mb-1">
                      <strong>終点:</strong> offset={rangeEnd.offset}
                      <br />
                      <span className="text-[10px] break-all">{rangeEnd.uri}</span>
                    </div>
                  )}
                  {rangeStart !== null && rangeEnd !== null && (
                    <button
                      onClick={clearRange}
                      className="text-[11px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 mt-1"
                    >
                      範囲をクリア
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SparqlTextViewer;
