'use client';

import React from 'react';

interface DialogWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
  maxHeight?: string;
  height?: string;
}

const DialogWrapper: React.FC<DialogWrapperProps> = ({
  isOpen,
  onClose,
  children,
  title,
  width = 'w-[500px]',
  maxHeight,
  height,
}) => {
  if (!isOpen) return null;

  const dialogClassNames = ['dialog', width, maxHeight, height].filter(Boolean).join(' ');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={dialogClassNames} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] m-0">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default DialogWrapper;
