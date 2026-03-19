'use client';

import React from 'react';
import DialogWrapper from './DialogWrapper';

interface AnnotationListItem {
  id: string;
  title: string;
  createdAt: number;
}

interface AnnotationListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: AnnotationListItem[];
  onSelect: (id: string | null) => void;
}

const AnnotationListDialog: React.FC<AnnotationListDialogProps> = ({
  isOpen,
  onClose,
  annotations,
  onSelect,
}) => {
  return (
    <DialogWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Annotation List"
      maxHeight="max-h-[80vh]"
    >
      <div className="overflow-y-auto max-h-[60vh]">
        {annotations.length > 0 ? (
          <ul className="space-y-2 m-0 p-0 list-none">
            {annotations.map((annotation) => (
              <li
                key={annotation.id}
                className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-md hover:bg-[var(--secondary-bg)] cursor-pointer transition-colors"
                onClick={() => {
                  onSelect(null);
                  setTimeout(() => onSelect(annotation.id), 0);
                  onClose();
                }}
              >
                <p className="m-0 text-sm font-medium text-[var(--text-primary)]">{annotation.title}</p>
                <p className="m-0 text-xs text-[var(--text-tertiary)] mt-1 truncate">{annotation.id}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)] text-center py-8">No annotations found for this manifest.</p>
        )}
      </div>
    </DialogWrapper>
  );
};

export default AnnotationListDialog;
