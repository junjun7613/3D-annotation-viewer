'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';

interface WikidataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { wikiType: string; uri: string }) => void;
  initialWikiType?: string;
  initialUri?: string;
}

const WikidataDialog: React.FC<WikidataDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWikiType = 'wikidata',
  initialUri = '',
}) => {
  const [wikiType, setWikiType] = useState(initialWikiType);
  const [uri, setUri] = useState(initialUri);

  useEffect(() => {
    if (isOpen) { setWikiType(initialWikiType); setUri(initialUri); }
  }, [isOpen, initialWikiType, initialUri]);

  const handleSave = () => {
    onSave({ wikiType, uri });
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
