'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';
import RelationTypeSelector from '@/app/components/RelationTypeSelector';
import { useRelationHierarchy } from '@/app/hooks/useRelationHierarchy';
import type { MediaRelationType } from '@/types/main';

interface MediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { source: string; type: string; caption: string; relationTypes: MediaRelationType[]; addedComment: string }) => void;
  initialSource?: string;
  initialType?: string;
  initialCaption?: string;
  initialRelationTypes?: MediaRelationType[];
  initialAddedComment?: string;
}

const MediaDialog: React.FC<MediaDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSource = '',
  initialType = 'img',
  initialCaption = '',
  initialRelationTypes = [],
  initialAddedComment = '',
}) => {
  const [source, setSource] = useState(initialSource);
  const [type, setType] = useState(initialType);
  const [caption, setCaption] = useState(initialCaption);
  const [relationTypes, setRelationTypes] = useState<MediaRelationType[]>(initialRelationTypes);
  const [addedComment, setAddedComment] = useState(initialAddedComment);
  const { getNodesForResource } = useRelationHierarchy();
  const mediaNodes = getNodesForResource('media');

  useEffect(() => {
    if (isOpen) {
      setSource(initialSource);
      setType(initialType);
      setCaption(initialCaption);
      setRelationTypes(initialRelationTypes);
      setAddedComment(initialAddedComment);
    }
  }, [isOpen, initialSource, initialType, initialCaption, initialRelationTypes, initialAddedComment]);

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Source URI:
          <textarea
            value={source}
            required
            onChange={(e) => setSource(e.target.value)}
            className="input-field resize-y min-h-24"
            placeholder={type === 'sketchfab' ? 'Paste SketchFab HTML embed code here...' : 'Enter URL or embed code...'}
          />
        </label>
        <label className="font-bold text-lg">
          Type:
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
            <option value="img">Image</option>
            <option value="video">Youtube</option>
            <option value="iiif">IIIF Manifest</option>
            <option value="sketchfab">SketchFab</option>
          </select>
        </label>
        <label className="font-bold text-lg">
          Caption:
          <textarea value={caption} required onChange={(e) => setCaption(e.target.value)} className="input-field resize-y min-h-24" />
        </label>

        {/* Relation Type */}
        <div>
          <p className="font-bold text-lg mb-2">Relation Type: <span className="text-sm font-normal text-[var(--text-secondary)]">（複数選択可）</span></p>
          <RelationTypeSelector
            nodes={mediaNodes}
            selected={relationTypes}
            onChange={(vals) => setRelationTypes(vals as MediaRelationType[])}
          />
        </div>

        {/* 付与者コメント */}
        <label className="font-bold text-lg">
          Comment:
          <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">（任意）このメディアを紐づける理由・補足</span>
          <input
            value={addedComment}
            onChange={(e) => setAddedComment(e.target.value)}
            placeholder="例: 正面からの計測画像"
            className="input-field"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => onSave({ source, type, caption, relationTypes, addedComment })} className="btn-info">Save</button>
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default MediaDialog;
