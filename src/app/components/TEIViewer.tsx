'use client';

import { useState } from 'react';
import { FaUpload } from 'react-icons/fa';

interface TEIViewerProps {
  onTextLoad?: (text: string) => void;
}

const TEIViewer: React.FC<TEIViewerProps> = ({ onTextLoad }) => {
  const [teiText, setTeiText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const parseTEIXML = (xmlString: string): string => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parsing error');
      }

      // Extract text from div[@type="edition"]
      const editionDiv = xmlDoc.querySelector('div[type="edition"]');
      if (!editionDiv) {
        return 'No edition text found in TEI/XML';
      }

      // Process the edition text
      let textContent = '';
      const lines = editionDiv.querySelectorAll('ab > *');

      lines.forEach((node) => {
        if (node.nodeName === 'lb') {
          const lineNum = node.getAttribute('n');
          if (lineNum) {
            textContent += `\n${lineNum}. `;
          }
        } else {
          // Process text nodes and expand abbreviations
          const processNode = (n: Node): string => {
            let result = '';
            n.childNodes.forEach((child) => {
              if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent || '';
              } else if (child.nodeName === 'expan') {
                // Expand abbreviations: get abbr + ex
                const abbr = child.querySelector('abbr')?.textContent || '';
                const ex = child.querySelector('ex')?.textContent || '';
                result += abbr + (ex ? `(${ex})` : '');
              } else if (child.nodeName === 'ex') {
                // Skip - handled in expan
              } else {
                result += processNode(child);
              }
            });
            return result;
          };
          textContent += processNode(node);
        }
      });

      return textContent.trim() || 'No text content found';
    } catch (error) {
      console.error('Error parsing TEI/XML:', error);
      return 'Error parsing TEI/XML file';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsedText = parseTEIXML(text);
      setTeiText(parsedText);

      if (onTextLoad) {
        onTextLoad(parsedText);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      setTeiText('Error reading file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold m-0 text-[var(--text-primary)]">
          Text Viewer
        </h3>
        <label className="btn-icon btn-icon-sm btn-secondary cursor-pointer" title="Upload TEI/XML">
          <FaUpload />
          <input
            type="file"
            accept=".xml,.tei"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {fileName && (
        <div className="text-xs text-[var(--text-secondary)] mb-2">
          File: {fileName}
        </div>
      )}

      <div className="flex-1 overflow-y-auto text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : teiText ? (
          <div className="font-mono">{teiText}</div>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)]">
            Upload a TEI/XML file to view the text
          </div>
        )}
      </div>
    </div>
  );
};

export default TEIViewer;
