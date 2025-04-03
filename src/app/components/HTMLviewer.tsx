import React, { useState, useEffect } from 'react';

interface HTMLViewerProps {
  htmlContent: string;
}

const HTMLViewer: React.FC<HTMLViewerProps> = ({ htmlContent }) => {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    // Blob URLを生成
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setIframeSrc(url);

    // クリーンアップ
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [htmlContent]);

  if (!iframeSrc) {
    return null; // iframeSrcがnullの場合は何もレンダリングしない
  }

  return (
    <iframe
      src={iframeSrc}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
      title="HTML Viewer"
    />
  );
};

export default HTMLViewer;