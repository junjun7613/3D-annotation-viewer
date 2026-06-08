'use client';

import React, { useState } from 'react';
import { FaPlus, FaLink } from 'react-icons/fa';
import type { InfoPanelContent, AnnotationRelationType, AnnotationRelation } from '@/types/main';
import ForeignProjectBadge from '@/app/components/ForeignProjectBadge';

const RELATION_OPTIONS: { value: AnnotationRelationType; label: string; color: string }[] = [
  { value: 'supports',    label: '支持',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'challenges',  label: '批判',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'supplements', label: '補足',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
];

interface Props {
  regionId: string;
  annotations: InfoPanelContent[];
  onSelect: (annotation: InfoPanelContent) => void;
  onAddNew: () => void;
  onAddRelation?: (fromId: string, relation: AnnotationRelation) => void;
  existingRelations?: Record<string, AnnotationRelation[]>; // annotationId → relations
  /** 現プロジェクト ID。これと異なる researchProjectId を持つアノテはバッジ + read-only として扱う */
  currentProjectId?: string | null;
}

export default function RegionAnnotationList({
  regionId, annotations, onSelect, onAddNew, onAddRelation, existingRelations = {}, currentProjectId = null,
}: Props) {
  const [relatingFrom, setRelatingFrom] = useState<string | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<AnnotationRelationType>('supports');
  const [relationComment, setRelationComment] = useState('');
  const [expandedRelation, setExpandedRelation] = useState<string | null>(null); // "annId-index"

  const handleAddRelation = (toAnnotation: InfoPanelContent) => {
    if (!relatingFrom || !onAddRelation) return;
    onAddRelation(relatingFrom, {
      annotationId: toAnnotation.id,
      relation: selectedRelation,
      comment: relationComment.trim() || undefined,
    });
    setRelatingFrom(null);
    setRelationComment('');
  };

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

      {/* 関係付け中の案内 */}
      {relatingFrom && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/10 flex flex-col gap-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            「{annotations.find(a => a.id === relatingFrom)?.title || '（タイトルなし）'}」から関係を付与する先を選択してください
            <span className="ml-1 font-normal opacity-70">（他プロジェクトのアノテも選択可・参照のみ記録されます）</span>
          </p>
          <div className="flex gap-2">
            {RELATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedRelation(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-full border-2 transition-colors ${
                  selectedRelation === opt.value
                    ? `${opt.color} border-current font-semibold`
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={relationComment}
            onChange={(e) => setRelationComment(e.target.value)}
            placeholder="補足コメント（任意）"
            className="input-field mb-0 text-xs"
          />
          <button
            type="button"
            onClick={() => { setRelatingFrom(null); setRelationComment(''); }}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] self-end"
          >
            キャンセル
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {annotations.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)] py-2">アノテーションがありません。</p>
        )}
        {annotations.map((ann) => {
          const isForeign =
            currentProjectId !== null &&
            ann.researchProjectId !== undefined &&
            ann.researchProjectId !== currentProjectId;
          const isSource = relatingFrom === ann.id;
          // 方針 A (片方向 cross-project): from が自プロジェクトの relation であれば、
          // to は他プロジェクトでも可（書き込みは from 側のみ、rules はそれを許容）。
          const isTarget = relatingFrom !== null && relatingFrom !== ann.id;
          const relations = existingRelations[ann.id] ?? [];

          return (
            <div key={ann.id} className="flex flex-col gap-1">
              <div className="flex items-stretch gap-1">
                {/* メインカード */}
                <button
                  onClick={() => isTarget ? handleAddRelation(ann) : onSelect(ann)}
                  className={`flex-1 text-left flex flex-col gap-1.5 p-3 rounded-lg border transition-colors group ${
                    isSource
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                      : isTarget
                      ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/10 cursor-pointer'
                      : isForeign
                      ? 'border-[var(--border)] bg-[var(--secondary-bg)]/40 hover:border-[var(--primary)]'
                      : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate flex-1 ${
                      isTarget ? 'text-[var(--primary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--primary)]'
                    }`}>
                      {isTarget && <span className="mr-1">→</span>}
                      {ann.title || '（タイトルなし）'}
                    </p>
                    {isForeign && ann.researchProjectId && (
                      <ForeignProjectBadge projectId={ann.researchProjectId} />
                    )}
                  </div>
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

                {/* 関係付けボタン（他アノテーションが存在する場合のみ・自プロジェクトのみ） */}
                {onAddRelation && annotations.length > 1 && !relatingFrom && !isForeign && (
                  <button
                    type="button"
                    onClick={() => { setRelatingFrom(ann.id); setSelectedRelation('supports'); }}
                    title="他のアノテーションと関係を付与"
                    className="flex-shrink-0 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                  >
                    <FaLink size={11} />
                  </button>
                )}
              </div>

              {/* 既存の関係表示 */}
              {relations.length > 0 && (
                <div className="ml-3 flex flex-col gap-0.5">
                  {relations.map((rel, i) => {
                    const target = annotations.find(a => a.id === rel.annotationId);
                    const opt = RELATION_OPTIONS.find(o => o.value === rel.relation);
                    const key = `${ann.id}-${i}`;
                    const isExpanded = expandedRelation === key;
                    const targetIsForeign =
                      !!target &&
                      currentProjectId !== null &&
                      target.researchProjectId !== undefined &&
                      target.researchProjectId !== currentProjectId;
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <button
                            type="button"
                            onClick={() => setExpandedRelation(isExpanded ? null : key)}
                            className={`px-1.5 py-0.5 rounded-full text-xs transition-opacity ${opt?.color} ${rel.comment ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            title={rel.comment ? (isExpanded ? 'コメントを閉じる' : 'コメントを表示') : undefined}
                          >
                            {opt?.label}
                          </button>
                          <span>→</span>
                          <span className="truncate">{target?.title || rel.annotationId}</span>
                          {targetIsForeign && target?.researchProjectId && (
                            <ForeignProjectBadge projectId={target.researchProjectId} />
                          )}
                          {rel.comment && (
                            <span className="opacity-40 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          )}
                        </div>
                        {isExpanded && rel.comment && (
                          <div className="ml-6 text-xs text-[var(--text-secondary)] bg-[var(--secondary-bg)] rounded px-2 py-1 italic">
                            {rel.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
