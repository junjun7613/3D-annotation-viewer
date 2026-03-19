'use client';

import React, { useState, useEffect } from 'react';
import DialogWrapper from './DialogWrapper';

interface BibliographyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    author: string;
    title: string;
    year: string;
    page: string;
    pdf: string;
  }) => void;
  initialAuthor?: string;
  initialTitle?: string;
  initialYear?: string;
  initialPage?: string;
  initialPdf?: string;
}

const BibliographyDialog: React.FC<BibliographyDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAuthor = '',
  initialTitle = '',
  initialYear = '',
  initialPage = '',
  initialPdf = '',
}) => {
  const [author, setAuthor] = useState(initialAuthor);
  const [title, setTitle] = useState(initialTitle);
  const [year, setYear] = useState(initialYear);
  const [page, setPage] = useState(initialPage);
  const [pdf, setPdf] = useState(initialPdf);

  useEffect(() => {
    if (isOpen) { setAuthor(initialAuthor); setTitle(initialTitle); setYear(initialYear); setPage(initialPage); setPdf(initialPdf); }
  }, [isOpen, initialAuthor, initialTitle, initialYear, initialPage, initialPdf]);

  const handleSave = () => {
    onSave({ author, title, year, page, pdf });
  };

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col gap-4">
        <label className="font-bold text-lg">
          Author:
          <input
            name="bibAuthor"
            value={author}
            required
            onChange={(e) => setAuthor(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="font-bold text-lg">
          Title:
          <textarea
            name="bibTitle"
            value={title}
            required
            onChange={(e) => setTitle(e.target.value)}
            className="input-field resize-y min-h-20"
          />
        </label>
        <label className="font-bold text-lg">
          Year:
          <input
            name="bibYear"
            value={year}
            required
            onChange={(e) => setYear(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="font-bold text-lg">
          Page URL:
          <input
            name="bibPage"
            value={page}
            required
            onChange={(e) => setPage(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="font-bold text-lg">
          PDF:
          <input
            name="bibPDF"
            value={pdf}
            required
            onChange={(e) => setPdf(e.target.value)}
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

export default BibliographyDialog;
