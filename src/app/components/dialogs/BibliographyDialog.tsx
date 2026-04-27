'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DialogWrapper from './DialogWrapper';
import type { BibliographyProperty } from '@/types/main';

const PROPERTY_OPTIONS: { value: BibliographyProperty; label: string; description: string }[] = [
  {
    value: 'crm:P67_refers_to',
    label: 'Refers to',
    description: '論文・書籍がこの対象に言及している',
  },
  {
    value: 'crm:P70_documents',
    label: 'Documents',
    description: '報告書・記録がこの対象を記録している',
  },
  {
    value: 'crm:P65_shows_visual_item',
    label: 'Shows visual item',
    description: '図録・報告書に図版・写真が掲載されている',
  },
];

// CrossRef の type フィールドから資料種別ラベルを返す
function resourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'journal-article': '雑誌論文',
    'proceedings-article': '会議論文',
    'book-chapter': '図書章',
    'book': '図書',
    'monograph': '図書',
    'report': '報告書',
    'dataset': 'データセット',
    'dissertation': '学位論文',
  };
  return map[type] ?? type;
}

type FetchedBib = {
  author: string;
  title: string;
  year: string;
  page: string;
  containerTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  resourceType?: string;
};

function detectInputType(value: string): 'doi' | 'isbn' | 'unknown' {
  const trimmed = value.trim();
  if (trimmed.startsWith('10.')) return 'doi';
  const digits = trimmed.replace(/[-\s]/g, '');
  if (/^\d{10}$/.test(digits) || /^\d{13}$/.test(digits)) return 'isbn';
  if (trimmed.toLowerCase().startsWith('isbn')) {
    const stripped = digits.replace(/^isbn/i, '');
    if (/^\d{10}$/.test(stripped) || /^\d{13}$/.test(stripped)) return 'isbn';
  }
  return 'unknown';
}

async function fetchByDoi(doi: string): Promise<FetchedBib | null> {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`);
  if (!res.ok) return null;
  const json = await res.json();
  const msg = json.message;

  const authors: string = (msg.author ?? [])
    .map((a: { family?: string; given?: string; name?: string }) =>
      a.family ? (a.given ? `${a.family}, ${a.given}` : a.family) : (a.name ?? '')
    )
    .filter(Boolean)
    .join('; ');

  const titleArr = msg.title ?? [];
  const title: string = Array.isArray(titleArr) ? titleArr[0] ?? '' : titleArr;

  const dateParts =
    msg.published?.['date-parts']?.[0] ??
    msg['published-print']?.['date-parts']?.[0] ??
    msg['published-online']?.['date-parts']?.[0] ?? [];
  const year: string = dateParts[0] ? String(dateParts[0]) : '';

  const page: string = msg.URL ?? msg.resource?.primary?.URL ?? '';

  const containerTitleArr = msg['container-title'] ?? [];
  const containerTitle: string = Array.isArray(containerTitleArr)
    ? containerTitleArr[0] ?? ''
    : containerTitleArr;

  return {
    author: authors,
    title,
    year,
    page,
    containerTitle: containerTitle || undefined,
    volume: msg.volume ? String(msg.volume) : undefined,
    issue: msg.issue ? String(msg.issue) : undefined,
    pages: msg.page || undefined,
    publisher: msg.publisher || undefined,
    doi: doi.trim(),
    resourceType: msg.type ? resourceTypeLabel(msg.type) : undefined,
  };
}

async function fetchByIsbn(isbn: string): Promise<FetchedBib | null> {
  const digits = isbn.replace(/[-\s]/g, '').replace(/^isbn/i, '');
  const res = await fetch(`https://ndlsearch.ndl.go.jp/api/opensearch?isbn=${digits}&cnt=1`);
  if (!res.ok) return null;
  const text = await res.text();
  const xmlDoc = new DOMParser().parseFromString(text, 'application/xml');

  const item = xmlDoc.querySelector('item');
  if (!item) return null;

  const getText = (tag: string, ns?: string): string => {
    const el = ns
      ? item.getElementsByTagNameNS(ns, tag.split(':')[1] ?? tag)[0]
      : item.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() ?? '';
  };

  const DC = 'http://purl.org/dc/elements/1.1/';
  const DCTERMS = 'http://purl.org/dc/terms/';

  const title = getText('dc:title', DC) || getText('title');
  const author = getText('dc:creator', DC);
  const year = (getText('dc:date', DC) || getText('issued', DCTERMS)).slice(0, 4);
  const page = getText('link');
  const publisher = getText('dc:publisher', DC);

  if (!title) return null;
  return { author, title, year, page, publisher: publisher || undefined, resourceType: '図書' };
}

export interface BibliographyFormData {
  author: string;
  title: string;
  year: string;
  page: string;
  pdf: string;
  property: BibliographyProperty;
  containerTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
}

interface BibliographyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BibliographyFormData) => void;
  initialAuthor?: string;
  initialTitle?: string;
  initialYear?: string;
  initialPage?: string;
  initialPdf?: string;
  initialProperty?: BibliographyProperty;
}

const BibliographyDialog: React.FC<BibliographyDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAuthor = '',
  initialTitle = '',
  initialYear = '',
  initialPage = '',
  initialPdf = '',
  initialProperty = 'crm:P67_refers_to',
}) => {
  const [identifier, setIdentifier] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'unknown'>('idle');
  const [fetchMessage, setFetchMessage] = useState('');
  const [resourceType, setResourceType] = useState('');

  const [author, setAuthor] = useState(initialAuthor);
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(initialYear);
  const [page, setPage] = useState(initialPage);
  const [pdf, setPdf] = useState(initialPdf);
  const [property, setProperty] = useState<BibliographyProperty>(initialProperty);
  const [containerTitle, setContainerTitle] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [publisher, setPublisher] = useState('');
  const [doi, setDoi] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIdentifier('');
      setFetchStatus('idle');
      setFetchMessage('');
      setResourceType('');
      setAuthor(initialAuthor);
      setTitle(initialTitle);
      setYear(initialYear);
      setPage(initialPage);
      setPdf(initialPdf);
      setProperty(initialProperty);
      setContainerTitle('');
      setVolume('');
      setIssue('');
      setPages('');
      setPublisher('');
      setDoi('');
    }
  }, [isOpen, initialAuthor, initialTitle, initialYear, initialPage, initialPdf, initialProperty]);

  const handleFetch = useCallback(async () => {
    const type = detectInputType(identifier);
    if (type === 'unknown') {
      setFetchStatus('unknown');
      setFetchMessage('DOI（10.で始まる）またはISBN（10桁・13桁）を入力してください。');
      return;
    }
    setFetchStatus('loading');
    setFetchMessage('');
    try {
      const result = type === 'doi' ? await fetchByDoi(identifier) : await fetchByIsbn(identifier);
      if (!result) {
        setFetchStatus('error');
        setFetchMessage(type === 'doi'
          ? 'CrossRef に該当する書誌情報が見つかりませんでした。'
          : 'NDL に該当する書誌情報が見つかりませんでした。');
        return;
      }
      setAuthor(result.author);
      setTitle(result.title);
      setYear(result.year);
      setPage(result.page);
      setContainerTitle(result.containerTitle ?? '');
      setVolume(result.volume ?? '');
      setIssue(result.issue ?? '');
      setPages(result.pages ?? '');
      setPublisher(result.publisher ?? '');
      setDoi(result.doi ?? '');
      setResourceType(result.resourceType ?? '');
      setFetchStatus('success');
      setFetchMessage('書誌情報を取得しました。内容を確認・編集してください。');
    } catch {
      setFetchStatus('error');
      setFetchMessage('取得中にエラーが発生しました。手動で入力してください。');
    }
  }, [identifier]);

  const handleSave = () => {
    onSave({
      author, title, year, page, pdf, property,
      containerTitle: containerTitle || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      publisher: publisher || undefined,
      doi: doi || undefined,
    });
  };

  const statusColor =
    fetchStatus === 'success' ? 'text-green-600 dark:text-green-400' :
    fetchStatus === 'error' || fetchStatus === 'unknown' ? 'text-red-500' :
    'text-[var(--text-secondary)]';

  // 論文系フィールドを表示するか（手動入力中も常に表示）
  const showArticleFields = true;

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">

        {/* Auto-fetch section */}
        <div className="p-3 rounded-lg bg-[var(--secondary-bg)] border border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">自動取得（DOI / ISBN）</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setFetchStatus('idle'); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } }}
              placeholder="例: 10.1234/example または 978-4-XXXXXXXX-X"
              className="input-field mb-0 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={!identifier.trim() || fetchStatus === 'loading'}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
            >
              {fetchStatus === 'loading' ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  取得中
                </span>
              ) : '取得'}
            </button>
          </div>
          {fetchMessage && (
            <p className={`text-xs mt-1.5 ${statusColor}`}>{fetchMessage}</p>
          )}
          {resourceType && (
            <p className="text-xs mt-1 text-[var(--text-secondary)]">
              資料種別: <span className="font-medium text-[var(--text-primary)]">{resourceType}</span>
            </p>
          )}
        </div>

        {/* Core fields */}
        <label className="font-bold text-lg">
          Author:
          <input
            name="bibAuthor"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="font-bold text-lg">
          Title:
          <textarea
            name="bibTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field resize-y min-h-20"
          />
        </label>
        <label className="font-bold text-lg">
          Year:
          <input
            name="bibYear"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="input-field"
          />
        </label>

        {/* Article / chapter fields */}
        {showArticleFields && (
          <div className="flex flex-col gap-4 p-3 rounded-lg border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--text-secondary)] -mb-1">論文・章情報（任意）</p>
            <label className="font-bold text-lg">
              雑誌名 / 会議録名:
              <input
                value={containerTitle}
                onChange={(e) => setContainerTitle(e.target.value)}
                className="input-field"
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="font-bold text-lg">
                Volume:
                <input value={volume} onChange={(e) => setVolume(e.target.value)} className="input-field" />
              </label>
              <label className="font-bold text-lg">
                Issue:
                <input value={issue} onChange={(e) => setIssue(e.target.value)} className="input-field" />
              </label>
              <label className="font-bold text-lg">
                Pages:
                <input value={pages} onChange={(e) => setPages(e.target.value)} className="input-field" placeholder="例: 90-97" />
              </label>
            </div>
            <label className="font-bold text-lg">
              Publisher:
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="input-field" />
            </label>
            <label className="font-bold text-lg">
              DOI:
              <input value={doi} onChange={(e) => setDoi(e.target.value)} className="input-field" placeholder="例: 10.1234/example" />
            </label>
          </div>
        )}

        <label className="font-bold text-lg">
          Page URL:
          <input
            name="bibPage"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="font-bold text-lg">
          PDF:
          <input
            name="bibPDF"
            value={pdf}
            onChange={(e) => setPdf(e.target.value)}
            className="input-field"
          />
        </label>

        {/* CIDOC CRM property */}
        <div>
          <p className="font-bold text-lg mb-2">Relationship (CIDOC CRM):</p>
          <div className="flex flex-col gap-2">
            {PROPERTY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  property === opt.value
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-[var(--border)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                <input
                  type="radio"
                  name="bibProperty"
                  value={opt.value}
                  checked={property === opt.value}
                  onChange={() => setProperty(opt.value)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-mono opacity-60 mt-0.5">{opt.value}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={handleSave} className="btn-info">
            Save
          </button>
          <button type="button" onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default BibliographyDialog;
