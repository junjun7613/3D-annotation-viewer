'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';
import type { MediaRoleType, ReferenceLevel } from '@/types/main';

const ROLE_OPTIONS: { value: MediaRoleType; label: string; description: string }[] = [
  { value: ':ObjectMedia', label: 'Object', description: '3Dモデルと同一物の別データ（別角度の写真・別スキャンデータなど）' },
  { value: ':ExplanatoryMedia', label: 'Explanatory', description: '対象を解説するコンテンツ（図像学的解説図版・解説動画など）' },
  { value: ':ContextualMedia', label: 'Contextual', description: 'コンテキストを示すコンテンツ（発掘現場・展示空間の画像・3Dモデルなど）' },
];

const REFERENCE_OPTIONS: { value: ReferenceLevel; label: string; description: string }[] = [
  { value: ':DirectReference', label: 'Direct（インスタンスレベル）', description: 'このアノテーション対象そのものに対応するデータ' },
  { value: ':IndirectReference', label: 'Indirect（カテゴリレベル）', description: '同じカテゴリ・概念に属するが同一物ではないデータ' },
];

interface MediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { source: string; type: string; caption: string; roleType: MediaRoleType; referenceLevel: ReferenceLevel }) => void;
  initialSource?: string;
  initialType?: string;
  initialCaption?: string;
  initialRoleType?: MediaRoleType;
  initialReferenceLevel?: ReferenceLevel;
}

const MediaDialog: React.FC<MediaDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSource = '',
  initialType = 'img',
  initialCaption = '',
  initialRoleType = ':ObjectMedia',
  initialReferenceLevel = ':DirectReference',
}) => {
  const [source, setSource] = useState(initialSource);
  const [type, setType] = useState(initialType);
  const [caption, setCaption] = useState(initialCaption);
  const [roleType, setRoleType] = useState<MediaRoleType>(initialRoleType);
  const [referenceLevel, setReferenceLevel] = useState<ReferenceLevel>(initialReferenceLevel);

  useEffect(() => {
    if (isOpen) {
      setSource(initialSource);
      setType(initialType);
      setCaption(initialCaption);
      setRoleType(initialRoleType);
      setReferenceLevel(initialReferenceLevel);
    }
  }, [isOpen, initialSource, initialType, initialCaption, initialRoleType, initialReferenceLevel]);

  const handleSave = () => {
    onSave({ source, type, caption, roleType, referenceLevel });
  };

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Source URI:
          <textarea
            name="source"
            value={source}
            required
            onChange={(e) => setSource(e.target.value)}
            className="input-field resize-y min-h-24"
            placeholder={type === 'sketchfab' ? 'Paste SketchFab HTML embed code here...' : 'Enter URL or embed code...'}
          />
        </label>
        <label className="font-bold text-lg">
          Type:
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input-field">
            <option value="img">Image</option>
            <option value="video">Youtube</option>
            <option value="iiif">IIIF Manifest</option>
            <option value="sketchfab">SketchFab</option>
          </select>
        </label>
        <label className="font-bold text-lg">
          Caption:
          <textarea
            name="caption"
            value={caption}
            required
            onChange={(e) => setCaption(e.target.value)}
            className="input-field resize-y min-h-24"
          />
        </label>
        <div>
          <p className="font-bold text-lg mb-2">Role:</p>
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

export default MediaDialog;
