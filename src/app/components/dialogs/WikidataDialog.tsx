'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';
import type { WikidataProperty } from '@/types/main';

const WIKIDATA_PROPERTIES: { value: WikidataProperty; label: string; description: string }[] = [
  {
    value: 'crm:P138_represents',
    label: 'P138 Represents',
    description: 'この箇所が直接的に表現・描写しているもの（図像・テキスト・場所の描写）',
  },
  {
    value: 'crm:P67_refers_to',
    label: 'P67 Refers to',
    description: '直接的な描写ではなく、概念的・主題的に関連するもの',
  },
  {
    value: 'crm:P2_has_type',
    label: 'P2 Has type',
    description: 'この箇所・オブジェクトの種別・分類',
  },
];

interface WikidataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { wikiType: string; uri: string; property: WikidataProperty }) => void;
  initialWikiType?: string;
  initialUri?: string;
  initialProperty?: WikidataProperty;
}

const WikidataDialog: React.FC<WikidataDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWikiType = 'wikidata',
  initialUri = '',
  initialProperty = 'crm:P138_represents',
}) => {
  const [wikiType, setWikiType] = useState(initialWikiType);
  const [uri, setUri] = useState(initialUri);
  const [property, setProperty] = useState<WikidataProperty>(initialProperty);

  useEffect(() => {
    if (isOpen) {
      setWikiType(initialWikiType);
      setUri(initialUri);
      setProperty(initialProperty);
    }
  }, [isOpen, initialWikiType, initialUri, initialProperty]);

  const handleSave = () => {
    onSave({ wikiType, uri, property });
  };

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
          <p className="font-bold text-lg mb-2">CRM Property:</p>
          <div className="flex flex-col gap-2">
            {WIKIDATA_PROPERTIES.map((opt) => (
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
                  name="property"
                  value={opt.value}
                  checked={property === opt.value}
                  onChange={() => setProperty(opt.value)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className={`text-sm font-medium ${property === opt.value ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
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
