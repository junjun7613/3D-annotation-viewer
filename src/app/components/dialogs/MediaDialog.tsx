'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';

interface MediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { source: string; type: string; caption: string }) => void;
  initialSource?: string;
  initialType?: string;
  initialCaption?: string;
}

const MediaDialog: React.FC<MediaDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSource = '',
  initialType = 'img',
  initialCaption = '',
}) => {
  const [source, setSource] = useState(initialSource);
  const [type, setType] = useState(initialType);
  const [caption, setCaption] = useState(initialCaption);

  useEffect(() => {
    if (isOpen) { setSource(initialSource); setType(initialType); setCaption(initialCaption); }
  }, [isOpen, initialSource, initialType, initialCaption]);

  const handleSave = () => {
    onSave({ source, type, caption });
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
