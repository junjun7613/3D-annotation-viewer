'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import DialogWrapper from './DialogWrapper';
import type { AuthorityRelationType, DirectAuthorityRelation, ConceptualAuthorityRelation } from '@/types/main';

type RelationOption<T> = { value: T; label: string; description: string };

const IDENTITY_OPTIONS: RelationOption<DirectAuthorityRelation>[] = [
  { value: ':identifies', label: 'Identifies', description: 'オブジェクト/アノテーション対象と概念的に同一のアイテム（碑文DB URI・Wikidataエンティティ等）' },
];

const DEPICTION_OPTIONS: RelationOption<DirectAuthorityRelation>[] = [
  { value: ':depicts_object', label: 'Depicts Object', description: '描写されているオブジェクト・事物' },
  { value: ':depicts_person', label: 'Depicts Person', description: '描写されている人物' },
  { value: ':depicts_place', label: 'Depicts Place', description: '描写されている場所・地名' },
  { value: ':depicts_event', label: 'Depicts Event', description: '描写されている出来事・事件' },
];

const TEXTUAL_REF_OPTIONS: RelationOption<DirectAuthorityRelation>[] = [
  { value: ':mentions_person', label: 'Mentions Person', description: '文字資料中に言及される人物' },
  { value: ':mentions_place', label: 'Mentions Place', description: '文字資料中に言及される場所' },
  { value: ':mentions_event', label: 'Mentions Event', description: '文字資料中に言及される出来事' },
];

const ALL_DIRECT_OPTIONS = [...IDENTITY_OPTIONS, ...DEPICTION_OPTIONS, ...TEXTUAL_REF_OPTIONS];

const CONTEXTUAL_OPTIONS: RelationOption<ConceptualAuthorityRelation>[] = [
  { value: ':associated_with_period', label: 'Associated with Period', description: '関連する時代・年代' },
  { value: ':associated_with_region', label: 'Associated with Region', description: '関連する地域・文化圏' },
  { value: ':associated_with_person', label: 'Associated with Person', description: '関連する人物・集団' },
  { value: ':associated_with_culture', label: 'Associated with Culture', description: '関連する文化・文明' },
];

const CONCEPTUAL_OPTIONS: RelationOption<ConceptualAuthorityRelation>[] = [
  { value: ':compared_with', label: 'Compared With', description: '比較対象となる概念・事物' },
  { value: ':related_to_concept', label: 'Related to Concept', description: '関連する概念・カテゴリ' },
];

const CLASSIFICATION_OPTIONS: RelationOption<ConceptualAuthorityRelation>[] = [
  { value: ':classified_as', label: 'Classified As', description: 'このオブジェクトが分類されるカテゴリ' },
  { value: ':has_type', label: 'Has Type', description: 'オブジェクトの型・種別' },
];

const LINGUISTIC_OPTIONS: RelationOption<ConceptualAuthorityRelation>[] = [
  { value: ':written_in_language', label: 'Written in Language', description: '使用言語' },
  { value: ':uses_script', label: 'Uses Script', description: '使用文字・書体' },
];

const EVENT_OPTIONS: RelationOption<ConceptualAuthorityRelation>[] = [
  { value: ':created_by', label: 'Created By', description: '制作者・作家・工房' },
  { value: ':discovered_by', label: 'Discovered By', description: '発見者・調査者' },
  { value: ':discovered_at', label: 'Discovered At', description: '発見地・出土地のイベント' },
];

const ALL_CONCEPTUAL_OPTIONS = [
  ...CONTEXTUAL_OPTIONS, ...CONCEPTUAL_OPTIONS, ...CLASSIFICATION_OPTIONS,
  ...LINGUISTIC_OPTIONS, ...EVENT_OPTIONS,
];

interface WikidataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { wikiType: string; uri: string; relationTypes: AuthorityRelationType[] }) => void;
  initialWikiType?: string;
  initialUri?: string;
  initialRelationTypes?: AuthorityRelationType[];
}

const WikidataDialog: React.FC<WikidataDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWikiType = 'wikidata',
  initialUri = '',
  initialRelationTypes = [],
}) => {
  const [wikiType, setWikiType] = useState(initialWikiType);
  const [uri, setUri] = useState(initialUri);
  const [relationTypes, setRelationTypes] = useState<AuthorityRelationType[]>(initialRelationTypes);

  // accordion states
  const [directExpanded, setDirectExpanded] = useState(true);
  const [depictionExpanded, setDepictionExpanded] = useState(false);
  const [textualRefExpanded, setTextualRefExpanded] = useState(false);
  const [conceptualExpanded, setConceptualExpanded] = useState(false);
  const [contextualExpanded, setContextualExpanded] = useState(false);
  const [conceptualSubExpanded, setConceptualSubExpanded] = useState(false);
  const [classificationExpanded, setClassificationExpanded] = useState(false);
  const [linguisticExpanded, setLinguisticExpanded] = useState(false);
  const [eventExpanded, setEventExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWikiType(initialWikiType);
      setUri(initialUri);
      setRelationTypes(initialRelationTypes);
      setDirectExpanded(true);
      setDepictionExpanded(initialRelationTypes.some((t) => DEPICTION_OPTIONS.some((o) => o.value === t)));
      setTextualRefExpanded(initialRelationTypes.some((t) => TEXTUAL_REF_OPTIONS.some((o) => o.value === t)));
      setConceptualExpanded(initialRelationTypes.some((t) => ALL_CONCEPTUAL_OPTIONS.some((o) => o.value === t)));
      setContextualExpanded(initialRelationTypes.some((t) => CONTEXTUAL_OPTIONS.some((o) => o.value === t)));
      setConceptualSubExpanded(initialRelationTypes.some((t) => CONCEPTUAL_OPTIONS.some((o) => o.value === t)));
      setClassificationExpanded(initialRelationTypes.some((t) => CLASSIFICATION_OPTIONS.some((o) => o.value === t)));
      setLinguisticExpanded(initialRelationTypes.some((t) => LINGUISTIC_OPTIONS.some((o) => o.value === t)));
      setEventExpanded(initialRelationTypes.some((t) => EVENT_OPTIONS.some((o) => o.value === t)));
    }
  }, [isOpen, initialWikiType, initialUri, initialRelationTypes]);

  const toggle = (val: AuthorityRelationType) => {
    setRelationTypes((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);
  };

  const hasDirect = relationTypes.some((t) => ALL_DIRECT_OPTIONS.some((o) => o.value === t));
  const hasDepiction = relationTypes.some((t) => DEPICTION_OPTIONS.some((o) => o.value === t));
  const hasTextualRef = relationTypes.some((t) => TEXTUAL_REF_OPTIONS.some((o) => o.value === t));
  const hasConceptual = relationTypes.some((t) => ALL_CONCEPTUAL_OPTIONS.some((o) => o.value === t));
  const hasContextual = relationTypes.some((t) => CONTEXTUAL_OPTIONS.some((o) => o.value === t));
  const hasConceptualSub = relationTypes.some((t) => CONCEPTUAL_OPTIONS.some((o) => o.value === t));
  const hasClassification = relationTypes.some((t) => CLASSIFICATION_OPTIONS.some((o) => o.value === t));
  const hasLinguistic = relationTypes.some((t) => LINGUISTIC_OPTIONS.some((o) => o.value === t));
  const hasEvent = relationTypes.some((t) => EVENT_OPTIONS.some((o) => o.value === t));

  const renderCheckbox = (opt: RelationOption<AuthorityRelationType>) => {
    const checked = relationTypes.includes(opt.value);
    return (
      <label
        key={opt.value}
        className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
          checked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--secondary-bg)]'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(opt.value)}
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
  };

  const renderSubGroup = (
    label: string,
    options: RelationOption<AuthorityRelationType>[],
    expanded: boolean,
    setExpanded: (v: (p: boolean) => boolean) => void,
    hasActive: boolean,
  ) => (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
          hasActive ? 'text-[var(--primary)] bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)]'
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}{hasActive && <span className="ml-2 normal-case font-normal">（選択中）</span>}
        </span>
        {expanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l-2 border-[var(--border)]">
          {options.map((opt) => renderCheckbox(opt as RelationOption<AuthorityRelationType>))}
        </div>
      )}
    </div>
  );

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

        {/* Relation Type */}
        <div>
          <p className="font-bold text-lg mb-2">Relation Type: <span className="text-sm font-normal text-[var(--text-secondary)]">（複数選択可）</span></p>
          <div className="flex flex-col gap-2">

            {/* Direct */}
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
                  {/* identity_relation */}
                  {IDENTITY_OPTIONS.map((opt) => renderCheckbox(opt as RelationOption<AuthorityRelationType>))}

                  {/* depiction_relation */}
                  {renderSubGroup(
                    'Depiction Relation — 描写関連',
                    DEPICTION_OPTIONS as RelationOption<AuthorityRelationType>[],
                    depictionExpanded, setDepictionExpanded, hasDepiction,
                  )}

                  {/* textual_reference_relation */}
                  {renderSubGroup(
                    'Textual Reference — 文字言及',
                    TEXTUAL_REF_OPTIONS as RelationOption<AuthorityRelationType>[],
                    textualRefExpanded, setTextualRefExpanded, hasTextualRef,
                  )}
                </div>
              )}
            </div>

            {/* Conceptual */}
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
                  {renderSubGroup(
                    'Contextual — 文脈関連',
                    CONTEXTUAL_OPTIONS as RelationOption<AuthorityRelationType>[],
                    contextualExpanded, setContextualExpanded, hasContextual,
                  )}
                  {renderSubGroup(
                    'Conceptual — 概念比較',
                    CONCEPTUAL_OPTIONS as RelationOption<AuthorityRelationType>[],
                    conceptualSubExpanded, setConceptualSubExpanded, hasConceptualSub,
                  )}
                  {renderSubGroup(
                    'Classification — 分類',
                    CLASSIFICATION_OPTIONS as RelationOption<AuthorityRelationType>[],
                    classificationExpanded, setClassificationExpanded, hasClassification,
                  )}
                  {renderSubGroup(
                    'Linguistic — 言語・文字',
                    LINGUISTIC_OPTIONS as RelationOption<AuthorityRelationType>[],
                    linguisticExpanded, setLinguisticExpanded, hasLinguistic,
                  )}
                  {renderSubGroup(
                    'Event — 制作・発見',
                    EVENT_OPTIONS as RelationOption<AuthorityRelationType>[],
                    eventExpanded, setEventExpanded, hasEvent,
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => onSave({ wikiType, uri, relationTypes })} className="btn-info">Save</button>
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default WikidataDialog;
