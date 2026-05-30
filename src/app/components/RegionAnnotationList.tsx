'use client';

import React from 'react';
import { FaPlus } from 'react-icons/fa';
import type { InfoPanelContent } from '@/types/main';

interface Props {
  regionId: string;
  annotations: InfoPanelContent[];
  onSelect: (annotation: InfoPanelContent) => void;
  onAddNew: () => void;
}

export default function RegionAnnotationList({ regionId, annotations, onSelect, onAddNew }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">領域ノード</p>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5 opacity-60">{regionId}</p>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
        >
          <FaPlus size={10} />
          新規アノテーション
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {annotations.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] py-2">アノテーションがありません。</p>
        )}
        {annotations.map((ann) => (
          <button
            key={ann.id}
            onClick={() => onSelect(ann)}
            className="w-full text-left flex flex-col gap-1.5 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
          >
            <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] truncate">
              {ann.title || '（タイトルなし）'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>{ann.creator}</span>
              {ann.createdAt && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>
            <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
              {ann.wikidata.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Linked Data: {ann.wikidata.length}
                </span>
              )}
              {ann.bibliography.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  Bibliography: {ann.bibliography.length}
                </span>
              )}
              {ann.media.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  Media: {ann.media.length}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
