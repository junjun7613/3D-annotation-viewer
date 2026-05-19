'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import DialogWrapper from './DialogWrapper';
import type { BibliographyRoleType, BibliographicRelationType, DirectBibliographicRelation, ConceptualBibliographicRelation } from '@/types/main';

const ROLE_OPTIONS: { value: BibliographyRoleType; label: string; description: string }[] = [
  { value: ':PrimarySource', label: 'Primary Source', description: '碑文・遺物を直接記録した一次文献（銘文録・図録・発掘報告書など）' },
  { value: ':ResearchLiterature', label: 'Research Literature', description: '対象に言及・分析した研究文献（論文・著書など）' },
  { value: ':SurveyReport', label: 'Survey Report', description: '調査・踏査・保存に関する報告書・レポート' },
];

type RelationOption = { value: DirectBibliographicRelation; label: string; description: string };

const DIRECT_RELATION_OPTIONS: RelationOption[] = [
  { value: ':mentions', label: 'Mentions', description: '文献中での単なる言及・注参照（最も弱い関係）' },
  { value: ':describes', label: 'Describes', description: '対象についてある程度詳細な説明を含む' },
  { value: ':illustrates', label: 'Illustrates', description: '画像・図面・拓本を掲載' },
];

const DESCRIBES_SUB_OPTIONS: RelationOption[] = [
  { value: ':reports', label: 'Reports', description: '調査・発見・出土などの一次報告' },
  { value: ':analyzes', label: 'Analyzes', description: '編年論・様式論・年代測定・社会史的分析などの研究' },
  { value: ':catalogues', label: 'Catalogues', description: '一覧化・目録化' },
];

const TEXTUAL_SUB_OPTIONS: RelationOption[] = [
  { value: ':transcribes', label: 'Transcribes', description: '文字資料の翻刻を掲載' },
  { value: ':translates', label: 'Translates', description: '文字資料の翻訳を掲載' },
];

const CONCEPTUAL_RELATION_OPTIONS: { value: ConceptualBibliographicRelation; label: string; description: string }[] = [
  { value: ':contextualizes', label: 'Contextualizes', description: '対象の文化的・歴史的背景を扱う（比較的ゆるい関係）' },
  { value: ':discusses_related_concept', label: 'Discusses Related Concept', description: '関連概念を扱う' },
  { value: ':compares_with', label: 'Compares With', description: '対象と比較される概念や事物を扱う' },
  { value: ':provides_typology', label: 'Provides Typology', description: '関連する類型学的基盤を提供' },
  { value: ':relevant_to_period', label: 'Relevant to Period', description: '関連年代や時代区分を扱う' },
  { value: ':relevant_to_region', label: 'Relevant to Region', description: '関連する場所や地域を扱う' },
  { value: ':associated_with_person', label: 'Associated with Person', description: '関連する人物や集団を扱う' },
];

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
  roleType: BibliographyRoleType;
  relationTypes: BibliographicRelationType[];
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
  initialRoleType?: BibliographyRoleType;
  initialRelationTypes?: BibliographicRelationType[];
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
  initialRoleType = ':PrimarySource',
  initialRelationTypes = [],
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
  const [roleType, setRoleType] = useState<BibliographyRoleType>(initialRoleType);
  const [relationTypes, setRelationTypes] = useState<BibliographicRelationType[]>(initialRelationTypes);
  const [containerTitle, setContainerTitle] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [publisher, setPublisher] = useState('');
  const [doi, setDoi] = useState('');
  const [directExpanded, setDirectExpanded] = useState(true);
  const [describesExpanded, setDescribesExpanded] = useState(false);
  const [textualExpanded, setTextualExpanded] = useState(false);
  const [conceptualExpanded, setConceptualExpanded] = useState(false);

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
      setRoleType(initialRoleType);
      setRelationTypes(initialRelationTypes);
      setContainerTitle('');
      setVolume('');
      setIssue('');
      setPages('');
      setPublisher('');
      setDoi('');
      setDirectExpanded(true);
      setDescribesExpanded(
        initialRelationTypes.some((t) => DESCRIBES_SUB_OPTIONS.some((o) => o.value === t))
      );
      setTextualExpanded(
        initialRelationTypes.some((t) => TEXTUAL_SUB_OPTIONS.some((o) => o.value === t))
      );
      setConceptualExpanded(
        initialRelationTypes.some((t) => CONCEPTUAL_RELATION_OPTIONS.some((o) => o.value === t))
      );
    }
  }, [isOpen, initialAuthor, initialTitle, initialYear, initialPage, initialPdf, initialRoleType, initialRelationTypes]);

  const toggleRelationType = (val: BibliographicRelationType) => {
    setRelationTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

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
      author, title, year, page, pdf, roleType, relationTypes,
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

  const hasDirect = relationTypes.some((t) =>
    DIRECT_RELATION_OPTIONS.some((o) => o.value === t) ||
    DESCRIBES_SUB_OPTIONS.some((o) => o.value === t) ||
    TEXTUAL_SUB_OPTIONS.some((o) => o.value === t)
  );
  const hasDescribesSub = relationTypes.some((t) =>
    DESCRIBES_SUB_OPTIONS.some((o) => o.value === t)
  );
  const hasTextualSub = relationTypes.some((t) =>
    TEXTUAL_SUB_OPTIONS.some((o) => o.value === t)
  );
  const hasConceptual = relationTypes.some((t) =>
    CONCEPTUAL_RELATION_OPTIONS.some((o) => o.value === t)
  );

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
          <input name="bibAuthor" value={author} onChange={(e) => setAuthor(e.target.value)} className="input-field" />
        </label>
        <label className="font-bold text-lg">
          Title:
          <textarea name="bibTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field resize-y min-h-20" />
        </label>
        <label className="font-bold text-lg">
          Year:
          <input name="bibYear" value={year} onChange={(e) => setYear(e.target.value)} className="input-field" />
        </label>

        {/* Article / chapter fields */}
        <div className="flex flex-col gap-4 p-3 rounded-lg border border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-secondary)] -mb-1">論文・章情報（任意）</p>
          <label className="font-bold text-lg">
            雑誌名 / 会議録名:
            <input value={containerTitle} onChange={(e) => setContainerTitle(e.target.value)} className="input-field" />
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

        <label className="font-bold text-lg">
          Page URL:
          <input name="bibPage" value={page} onChange={(e) => setPage(e.target.value)} className="input-field" />
        </label>
        <label className="font-bold text-lg">
          PDF:
          <input name="bibPDF" value={pdf} onChange={(e) => setPdf(e.target.value)} className="input-field" />
        </label>

        {/* 文書タイプ */}
        <div>
          <p className="font-bold text-lg mb-2">Document Type:</p>
          <div className="flex flex-col gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  roleType === opt.value
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-[var(--border)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                <input
                  type="radio"
                  name="bibRoleType"
                  value={opt.value}
                  checked={roleType === opt.value}
                  onChange={() => setRoleType(opt.value)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 関係性プロパティ */}
        <div>
          <p className="font-bold text-lg mb-2">Relation Type: <span className="text-sm font-normal text-[var(--text-secondary)]">（複数選択可）</span></p>
          <div className="flex flex-col gap-2">

            {/* Direct Bibliographic Relations（アコーディオン） */}
            <div className={`rounded-lg border transition-colors ${hasDirect ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
              <button
                type="button"
                onClick={() => setDirectExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-t-lg transition-colors ${
                  hasDirect ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-[var(--secondary-bg)]'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${hasDirect ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  Direct — 直接関連
                  {hasDirect && <span className="ml-2 normal-case font-normal">（選択中）</span>}
                </p>
                {directExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
              </button>
              {directExpanded && (
                <div className="flex flex-col gap-1 p-2 border-t border-[var(--border)]">
                  {DIRECT_RELATION_OPTIONS.map((opt) => {
                    const checked = relationTypes.includes(opt.value);
                    const isDescribes = opt.value === ':describes';
                    return (
                      <React.Fragment key={opt.value}>
                        <label
                          className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            checked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--secondary-bg)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRelationType(opt.value)}
                            className="mt-0.5 accent-[var(--primary)]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${checked ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                {opt.label}
                              </p>
                              {isDescribes && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setDescribesExpanded((v) => !v); }}
                                  className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                                    hasDescribesSub
                                      ? 'text-[var(--primary)] bg-blue-100 dark:bg-blue-900/30'
                                      : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'
                                  }`}
                                >
                                  {describesExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                                  <span>サブタイプ{hasDescribesSub ? '（選択中）' : ''}</span>
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
                          </div>
                        </label>
                        {isDescribes && describesExpanded && (
                          <div className="flex flex-col gap-1 ml-6 pl-3 border-l-2 border-[var(--border)]">
                            {DESCRIBES_SUB_OPTIONS.map((sub) => {
                              const subChecked = relationTypes.includes(sub.value);
                              return (
                                <label
                                  key={sub.value}
                                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    subChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--secondary-bg)]'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={subChecked}
                                    onChange={() => toggleRelationType(sub.value)}
                                    className="mt-0.5 accent-[var(--primary)]"
                                  />
                                  <div>
                                    <p className={`text-sm font-medium ${subChecked ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                      {sub.label}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub.description}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Textual Relations グループ見出し */}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setTextualExpanded((v) => !v)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                        hasTextualSub ? 'text-[var(--primary)] bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Textual Relations — 文字関連
                        {hasTextualSub && <span className="ml-2 normal-case font-normal">（選択中）</span>}
                      </span>
                      {textualExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                    </button>
                    {textualExpanded && (
                      <div className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l-2 border-[var(--border)]">
                        {TEXTUAL_SUB_OPTIONS.map((sub) => {
                          const subChecked = relationTypes.includes(sub.value);
                          return (
                            <label
                              key={sub.value}
                              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                subChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--secondary-bg)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={subChecked}
                                onChange={() => toggleRelationType(sub.value)}
                                className="mt-0.5 accent-[var(--primary)]"
                              />
                              <div>
                                <p className={`text-sm font-medium ${subChecked ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                  {sub.label}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Conceptual Bibliographic Relations（アコーディオン） */}
            <div className={`rounded-lg border transition-colors ${hasConceptual ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
              <button
                type="button"
                onClick={() => setConceptualExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-t-lg transition-colors ${
                  hasConceptual ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-[var(--secondary-bg)]'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${hasConceptual ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  Conceptual — 概念的関連
                  {hasConceptual && <span className="ml-2 normal-case font-normal">（選択中）</span>}
                </p>
                {conceptualExpanded ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
              </button>
              {conceptualExpanded && (
                <div className="flex flex-col gap-1 p-2 border-t border-[var(--border)]">
                  {CONCEPTUAL_RELATION_OPTIONS.map((opt) => {
                    const checked = relationTypes.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          checked
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-[var(--secondary-bg)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRelationType(opt.value)}
                          className="mt-0.5 accent-[var(--primary)]"
                        />
                        <div>
                          <p className={`text-sm font-medium ${checked ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={handleSave} className="btn-info">Save</button>
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default BibliographyDialog;
