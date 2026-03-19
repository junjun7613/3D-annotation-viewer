'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';

interface TitleEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  initialTitle?: string;
}

const TitleEditDialog: React.FC<TitleEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
}) => {
  const [title, setTitle] = useState(initialTitle);

  // Sync internal state when initialTitle changes (e.g., when dialog opens with new value)
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const handleSave = () => {
    onSave(title);
  };

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose} width="w-[400px]">
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Title:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            required
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

export default TitleEditDialog;
