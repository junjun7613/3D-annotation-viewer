'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BibliographyItem, WikidataItem, MediaItem } from '@/types/main';
import { renderMarkdown } from '@/utils/markdown';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface DescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (markdown: string) => Promise<void> | void;
  bibliography?: BibliographyItem[];
  wikidata?: WikidataItem[];
  media?: MediaItem[];
  iiifThumbnails?: Record<string, string | null>;
}

type PickerKind = 'bib' | 'auth' | 'media' | null;

export default function DescriptionDialog({
  isOpen, onClose, initialValue, onSave, bibliography = [], wikidata = [], media = [], iiifThumbnails,
}: DescriptionDialogProps) {
  const [value, setValue] = useState<string>(initialValue || '');
  const [picker, setPicker] = useState<PickerKind>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
      setPicker(null);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const insertAtCursor = (snippet: string) => {
    // MDEditor 内部の textarea を探して selection に挿入する
    const root = containerRef.current;
    const ta = root?.querySelector<HTMLTextAreaElement>('textarea.w-md-editor-text-input');
    if (!ta) {
      setValue((v) => v + snippet);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);
    // 挿入直後にキャレットを末尾に移す
    requestAnimationFrame(() => {
      const pos = start + snippet.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const handlePickBib = (item: BibliographyItem) => {
    const label = [item.author, item.year ? `(${item.year})` : '']
      .filter(Boolean).join(' ').trim() || item.title || item.id;
    insertAtCursor(`[${label}](#bib/${item.id})`);
    setPicker(null);
  };
  const handlePickAuth = (item: WikidataItem) => {
    const id = (item as unknown as { id?: string }).id || item.uri;
    if (!id) return;
    insertAtCursor(`[${item.label || id}](#auth/${id})`);
    setPicker(null);
  };
  const handlePickMedia = (item: MediaItem, asImage: boolean) => {
    const cap = item.caption || '';
    insertAtCursor(asImage ? `![${cap}](#media/${item.id})` : `[${cap || item.id}](#media/${item.id})`);
    setPicker(null);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog"
        style={{
          width: 'min(1400px, 92vw)',
          height: 'min(900px, 90vh)',
        }}
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <div className="flex flex-col h-full gap-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[var(--text-secondary)] mr-1">Insert:</span>
            <button
              type="button"
              onClick={() => setPicker('bib')}
              disabled={bibliography.length === 0}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--card-bg)] disabled:opacity-40"
            >
              Bibliography ({bibliography.length})
            </button>
            <button
              type="button"
              onClick={() => setPicker('auth')}
              disabled={wikidata.length === 0}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--card-bg)] disabled:opacity-40"
            >
              Authority ({wikidata.length})
            </button>
            <button
              type="button"
              onClick={() => setPicker('media')}
              disabled={media.length === 0}
              className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--card-bg)] disabled:opacity-40"
            >
              Media ({media.length})
            </button>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">CommonMark + GFM</span>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0" data-color-mode="dark">
            <MDEditor
              value={value}
              onChange={(v) => setValue(v ?? '')}
              height="100%"
              preview="live"
              visibleDragbar={false}
              components={{
                preview: (source) => (
                  <div
                    className="description-content wmde-markdown wmde-markdown-color"
                    style={{ padding: '0.5em 1em' }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(source, { bibliography, wikidata, media, iiifThumbnails }),
                    }}
                  />
                ),
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              className="btn-info"
              onClick={async () => {
                await onSave(value);
                onClose();
              }}
            >
              Save
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Picker overlay */}
        {picker && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg"
            onClick={() => setPicker(null)}
          >
            <div
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg w-[520px] max-h-[70%] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                <span className="text-sm font-semibold">
                  {picker === 'bib' && 'Insert bibliography reference'}
                  {picker === 'auth' && 'Insert authority reference'}
                  {picker === 'media' && 'Insert media'}
                </span>
                <button onClick={() => setPicker(null)} className="text-xs">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {picker === 'bib' && bibliography.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handlePickBib(b)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--background)]"
                  >
                    <div className="font-medium">{b.author || '—'} {b.year ? `(${b.year})` : ''}</div>
                    <div className="text-[var(--text-secondary)] truncate">{b.title}</div>
                  </button>
                ))}
                {picker === 'auth' && wikidata.map((w, i) => {
                  const id = (w as unknown as { id?: string }).id || w.uri;
                  return (
                    <button
                      key={id || i}
                      type="button"
                      onClick={() => handlePickAuth(w)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--background)]"
                    >
                      <div className="font-medium">{w.label || id}</div>
                      <div className="text-[var(--text-secondary)] truncate">{w.uri}</div>
                    </button>
                  );
                })}
                {picker === 'media' && media.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--background)]">
                    <button
                      type="button"
                      onClick={() => handlePickMedia(m, true)}
                      className="text-xs flex-1 text-left"
                      title="Embed as image"
                    >
                      <div className="font-medium truncate">{m.caption || m.id}</div>
                      <div className="text-[var(--text-secondary)] truncate">{m.type}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePickMedia(m, true)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)]"
                    >
                      ![img]
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePickMedia(m, false)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)]"
                    >
                      [link]
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
