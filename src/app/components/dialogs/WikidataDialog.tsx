'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import DialogWrapper from './DialogWrapper';
import type { AuthorityRoleType, ReferenceLevel } from '@/types/main';

const GEO_SUB_OPTIONS: { value: AuthorityRoleType; label: string; description: string }[] = [
  { value: ':DepictedPlace', label: 'Depicted Place', description: '3Dモデルの中に直接描写されている地名' },
  { value: ':FoundAt', label: 'Found At', description: '発見地・出土地' },
  { value: ':ProducedAt', label: 'Produced At', description: '制作地・産地' },
  { value: ':OriginatedAt', label: 'Originated At', description: '出自地・起源地' },
  { value: ':DepictedAt', label: 'Depicted At', description: '描写された場所（描写地名以外）' },
];

const GEO_SUB_VALUES = new Set<AuthorityRoleType>(GEO_SUB_OPTIONS.map((o) => o.value));

const REFERENCE_OPTIONS: { value: ReferenceLevel; label: string; description: string }[] = [
  { value: ':DirectReference', label: 'Direct（インスタンスレベル）', description: 'このアノテーション対象そのものに対応する典拠' },
  { value: ':IndirectReference', label: 'Indirect（カテゴリレベル）', description: '同じカテゴリ・概念に属するが同一物ではない典拠' },
];

interface WikidataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { wikiType: string; uri: string; roleType: AuthorityRoleType; referenceLevel: ReferenceLevel }) => void;
  initialWikiType?: string;
  initialUri?: string;
  initialRoleType?: AuthorityRoleType;
  initialReferenceLevel?: ReferenceLevel;
}

const WikidataDialog: React.FC<WikidataDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWikiType = 'wikidata',
  initialUri = '',
  initialRoleType = ':ObjectAuthority',
  initialReferenceLevel = ':DirectReference',
}) => {
  const [wikiType, setWikiType] = useState(initialWikiType);
  const [uri, setUri] = useState(initialUri);
  const [roleType, setRoleType] = useState<AuthorityRoleType>(initialRoleType);
  const [referenceLevel, setReferenceLevel] = useState<ReferenceLevel>(initialReferenceLevel);
  const [geoExpanded, setGeoExpanded] = useState(() => GEO_SUB_VALUES.has(initialRoleType));

  useEffect(() => {
    if (isOpen) {
      setWikiType(initialWikiType);
      setUri(initialUri);
      setRoleType(initialRoleType);
      setReferenceLevel(initialReferenceLevel);
      setGeoExpanded(GEO_SUB_VALUES.has(initialRoleType));
    }
  }, [isOpen, initialWikiType, initialUri, initialRoleType, initialReferenceLevel]);

  const handleSave = () => {
    onSave({ wikiType, uri, roleType, referenceLevel });
  };

  const isGeoActive = roleType === ':GeographicAuthority' || GEO_SUB_VALUES.has(roleType);

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Type:
          <select
            name="type"
            value={wikiType}
            onChange={(e) => setWikiType(e.target.value)}
            className="input-field"
          >
            <option value="wikidata">Wikidata</option>
            <option value="geonames">GeoNames</option>
          </select>
        </label>
        <label className="font-bold text-lg">
          URI:
          <input
            name="wikidata"
            value={uri}
            required
            onChange={(e) => setUri(e.target.value)}
            className="input-field"
          />
        </label>
        <div>
          <p className="font-bold text-lg mb-2">Role:</p>
          <div className="flex flex-col gap-2">
            {/* Object Authority */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                roleType === ':ObjectAuthority'
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--border)] hover:bg-[var(--secondary-bg)]'
              }`}
            >
              <input
                type="radio"
                name="roleType"
                value=":ObjectAuthority"
                checked={roleType === ':ObjectAuthority'}
                onChange={() => setRoleType(':ObjectAuthority')}
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <p className={`text-sm font-medium ${roleType === ':ObjectAuthority' ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                  Object
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">このアノテーション対象そのものを表すエンティティ</p>
              </div>
            </label>

            {/* Geographic Authority (collapsible parent) */}
            <div className={`rounded-lg border transition-colors ${
              isGeoActive ? 'border-[var(--primary)]' : 'border-[var(--border)]'
            }`}>
              {/* Header row: radio for GeographicAuthority + expand toggle */}
              <div className={`flex items-center gap-3 p-3 rounded-t-lg ${
                isGeoActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--secondary-bg)]'
              }`}>
                <label className="flex items-start gap-3 flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="roleType"
                    value=":GeographicAuthority"
                    checked={roleType === ':GeographicAuthority'}
                    onChange={() => setRoleType(':GeographicAuthority')}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className={`text-sm font-medium ${isGeoActive ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                      Geographic
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">地理的関連エンティティ（サブタイプを選択可）</p>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setGeoExpanded((v) => !v)}
                  className="flex-shrink-0 p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                  aria-label={geoExpanded ? 'サブタイプを閉じる' : 'サブタイプを開く'}
                >
                  {geoExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </button>
              </div>

              {/* Sub-options */}
              {geoExpanded && (
                <div className="flex flex-col gap-1 px-3 pb-3 pt-1 border-t border-[var(--border)]">
                  {GEO_SUB_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-2 pl-6 rounded-lg cursor-pointer transition-colors ${
                        roleType === opt.value
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'hover:bg-[var(--secondary-bg)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="roleType"
                        value={opt.value}
                        checked={roleType === opt.value}
                        onChange={() => setRoleType(opt.value)}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className={`text-sm font-medium ${roleType === opt.value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <p className="font-bold text-lg mb-2">Reference Level:</p>
          <div className="flex flex-col gap-2">
            {REFERENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  referenceLevel === opt.value
                    ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-[var(--border)] hover:bg-[var(--secondary-bg)]'
                }`}
              >
                <input
                  type="radio"
                  name="referenceLevel"
                  value={opt.value}
                  checked={referenceLevel === opt.value}
                  onChange={() => setReferenceLevel(opt.value)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className={`text-sm font-medium ${referenceLevel === opt.value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
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

export default WikidataDialog;
