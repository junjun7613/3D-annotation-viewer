'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';
import RelationTypeSelector from '@/app/components/RelationTypeSelector';
import { useRelationHierarchy } from '@/app/hooks/useRelationHierarchy';
import type { AuthorityRelationType, AuthorityEntityType } from '@/types/main';

// CHAO §7 エンティティ種別
const ENTITY_TYPE_OPTIONS: { value: AuthorityEntityType; label: string; description: string }[] = [
  { value: ':Person',   label: 'Person',   description: '人物・集団' },
  { value: ':Place',    label: 'Place',    description: '場所・地名' },
  { value: ':Event',    label: 'Event',    description: '出来事・事件' },
  { value: ':Object',   label: 'Object',   description: '物体・遺物・作品' },
  { value: ':Period',   label: 'Period',   description: '時代・年代' },
  { value: ':Region',   label: 'Region',   description: '地域・文化圏' },
  { value: ':Culture',  label: 'Culture',  description: '文化・文明' },
  { value: ':Language', label: 'Language', description: '言語' },
  { value: ':Script',   label: 'Script',   description: '文字体系' },
  { value: ':Concept',  label: 'Concept',  description: '概念・カテゴリ' },
];

// エンティティ種別 → 推奨 relation type（ハイライト用）
const ENTITY_SUGGESTED: Partial<Record<AuthorityEntityType, AuthorityRelationType[]>> = {
  ':Person':   [':depicts', ':mentions', ':identifies', ':associated_with', ':created_by', ':discovered_by'],
  ':Place':    [':depicts', ':mentions', ':identifies', ':associated_with', ':discovered_at'],
  ':Event':    [':depicts', ':mentions', ':identifies', ':associated_with'],
  ':Object':   [':depicts', ':identifies', ':classified_as', ':has_type'],
  ':Period':   [':associated_with'],
  ':Region':   [':associated_with'],
  ':Culture':  [':associated_with'],
  ':Language': [':written_in_language'],
  ':Script':   [':uses_script'],
  ':Concept':  [':classified_as', ':has_type'],
};

interface WikidataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { wikiType: string; uri: string; entityType: AuthorityEntityType | null; relationTypes: AuthorityRelationType[]; addedComment: string }) => void;
  initialWikiType?: string;
  initialUri?: string;
  initialEntityType?: AuthorityEntityType | null;
  initialRelationTypes?: AuthorityRelationType[];
  initialAddedComment?: string;
}

const WikidataDialog: React.FC<WikidataDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWikiType = 'wikidata',
  initialUri = '',
  initialEntityType = null,
  initialRelationTypes = [],
  initialAddedComment = '',
}) => {
  const [wikiType, setWikiType] = useState(initialWikiType);
  const [uri, setUri] = useState(initialUri);
  const [entityType, setEntityType] = useState<AuthorityEntityType | null>(initialEntityType);
  const [relationTypes, setRelationTypes] = useState<AuthorityRelationType[]>(initialRelationTypes);
  const [addedComment, setAddedComment] = useState(initialAddedComment);
  const { getNodesForResource } = useRelationHierarchy();
  const authorityNodes = getNodesForResource('authority');

  useEffect(() => {
    if (isOpen) {
      setWikiType(initialWikiType);
      setUri(initialUri);
      setEntityType(initialEntityType);
      setRelationTypes(initialRelationTypes);
      setAddedComment(initialAddedComment);
    }
  }, [isOpen, initialWikiType, initialUri, initialEntityType, initialRelationTypes, initialAddedComment]);

  const suggested = entityType
    ? new Set(ENTITY_SUGGESTED[entityType] ?? [])
    : new Set<AuthorityRelationType>();

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Type:
          <select value={wikiType} onChange={(e) => setWikiType(e.target.value)} className="input-field">
            <option value="wikidata">Wikidata</option>
            <option value="geonames">GeoNames</option>
          </select>
        </label>
        <label className="font-bold text-lg">
          URI:
          <input value={uri} required onChange={(e) => setUri(e.target.value)} className="input-field" />
        </label>

        {/* Entity Type */}
        <div>
          <p className="font-bold text-lg mb-2">
            Entity Type:
            <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">推奨 Relation Type がハイライトされます</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEntityType(entityType === opt.value ? null : opt.value)}
                title={opt.description}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  entityType === opt.value
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Relation Type */}
        <div>
          <p className="font-bold text-lg mb-2">Relation Type: <span className="text-sm font-normal text-[var(--text-secondary)]">（複数選択可）</span></p>
          <RelationTypeSelector
            nodes={authorityNodes}
            selected={relationTypes}
            onChange={(vals) => setRelationTypes(vals as AuthorityRelationType[])}
            suggested={suggested}
          />
        </div>

        {/* 付与者コメント */}
        <label className="font-bold text-lg">
          Comment:
          <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">（任意）この典拠を紐づける理由・補足</span>
          <input
            value={addedComment}
            onChange={(e) => setAddedComment(e.target.value)}
            placeholder="例: この碑文に言及する人物と同定される"
            className="input-field"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => onSave({ wikiType, uri, entityType, relationTypes, addedComment })} className="btn-info">Save</button>
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default WikidataDialog;
