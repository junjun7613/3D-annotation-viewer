'use client';

import { useState, useEffect } from 'react';
import CETEI from 'CETEIcean';
import './CETEIcean.css';
import { FaUpload, FaLink } from 'react-icons/fa';

interface DisplayTEIProps {
  onTextLoad?: (text: string) => void;
  manifestUrl?: string;
}

const DisplayTEI: React.FC<DisplayTEIProps> = ({ onTextLoad, manifestUrl }) => {
  const [teiHTMLDiplomatic, setTeiHTMLDiplomatic] = useState<string>('');
  const [teiHTMLTranscription, setTeiHTMLTranscription] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diplomatic' | 'transcription'>('diplomatic');

  // Clear TEI viewer when manifestUrl changes
  useEffect(() => {
    setTeiHTMLDiplomatic('');
    setTeiHTMLTranscription('');
    setFileName('');
    setError('');
  }, [manifestUrl]);

  const processTEIFile = (xmlText: string) => {
    try {
      // Process Diplomatic version (abbr only)
      const ctDiplomatic = new CETEI() as any;
      const diplomaticBehaviors = {
        tei: {
          facsimile: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          head: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          bibl: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          teiHeader: function (e: HTMLElement) {
            e.style.display = 'none';
          },
          // Hide non-edition divs
          div: function (e: HTMLElement) {
            const type = e.getAttribute('type');
            if (type && type !== 'edition') {
              e.style.display = 'none';
            }
          },
          lb: function (e: HTMLElement) {
            const n = e.getAttribute('n');
            if (n) {
              const lineMark = document.createElement('span');
              lineMark.innerHTML = '🔗';
              lineMark.style.cursor = 'pointer';
              lineMark.style.marginRight = '0.5rem';
              lineMark.style.fontSize = '0.875rem';
              lineMark.style.opacity = '0.7';
              lineMark.style.transition = 'opacity 0.2s';
              lineMark.dataset.lineNumber = n;
              lineMark.title = `Line ${n} - Click to link annotation`;

              lineMark.addEventListener('mouseenter', () => {
                lineMark.style.opacity = '1';
              });
              lineMark.addEventListener('mouseleave', () => {
                lineMark.style.opacity = '0.7';
              });
              lineMark.addEventListener('click', () => {
                console.log('line clicked:', n);
              });

              e.insertBefore(lineMark, e.firstChild);
            }
            const br = document.createElement('br');
            e.insertBefore(br, e.firstChild);
          },
          // Diplomatic: show only abbr, hide ex
          ex: function (e: HTMLElement) {
            e.style.display = 'none';
          },
        },
      };
      ctDiplomatic.addBehaviors(diplomaticBehaviors);

      ctDiplomatic.makeHTML5(xmlText, (data: HTMLElement) => {
        const element = document.createElement('div');
        element.className = 'tei-diplomatic';
        element.appendChild(data);

        // Hide ex elements in diplomatic version
        const exElements = element.querySelectorAll('tei-ex');
        exElements.forEach((ex) => {
          (ex as HTMLElement).style.setProperty('display', 'none', 'important');
        });

        setTeiHTMLDiplomatic(element.outerHTML);
      });

      // Process Transcription version (full expansion)
      const ctTranscription = new CETEI() as any;
      const transcriptionBehaviors = {
        tei: {
          facsimile: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          head: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          bibl: function (e: HTMLElement) {
            e.innerHTML = '';
          },
          teiHeader: function (e: HTMLElement) {
            e.style.display = 'none';
          },
          // Hide non-edition divs
          div: function (e: HTMLElement) {
            const type = e.getAttribute('type');
            if (type && type !== 'edition') {
              e.style.display = 'none';
            }
          },
          lb: function (e: HTMLElement) {
            const n = e.getAttribute('n');
            if (n) {
              const lineMark = document.createElement('span');
              lineMark.innerHTML = '🔗';
              lineMark.style.cursor = 'pointer';
              lineMark.style.marginRight = '0.5rem';
              lineMark.style.fontSize = '0.875rem';
              lineMark.style.opacity = '0.7';
              lineMark.style.transition = 'opacity 0.2s';
              lineMark.dataset.lineNumber = n;
              lineMark.title = `Line ${n} - Click to link annotation`;

              lineMark.addEventListener('mouseenter', () => {
                lineMark.style.opacity = '1';
              });
              lineMark.addEventListener('mouseleave', () => {
                lineMark.style.opacity = '0.7';
              });
              lineMark.addEventListener('click', () => {
                console.log('line clicked:', n);
              });

              e.insertBefore(lineMark, e.firstChild);
            }
            const br = document.createElement('br');
            e.insertBefore(br, e.firstChild);
          },
          // Don't add ex behavior - let it render naturally
        },
      };
      ctTranscription.addBehaviors(transcriptionBehaviors);

      ctTranscription.makeHTML5(xmlText, (data: HTMLElement) => {
        const element = document.createElement('div');
        element.className = 'tei-transcription';
        element.appendChild(data);

        // Add parentheses to ex elements manually
        const exElements = element.querySelectorAll('tei-ex');
        console.log('Found tei-ex elements:', exElements.length);
        exElements.forEach((ex, index) => {
          const htmlEx = ex as HTMLElement;
          const content = htmlEx.textContent || '';
          console.log(`tei-ex ${index} original content:`, content);

          // Make sure it's visible and styled (use setProperty with !important)
          htmlEx.style.setProperty('display', 'inline', 'important');
          htmlEx.style.setProperty('font-style', 'italic', 'important');
          htmlEx.style.setProperty('color', '#999', 'important');

          // Clear the element and add parentheses as text nodes
          htmlEx.innerHTML = '';
          const openParen = document.createTextNode('(');
          const textNode = document.createTextNode(content);
          const closeParen = document.createTextNode(')');
          htmlEx.appendChild(openParen);
          htmlEx.appendChild(textNode);
          htmlEx.appendChild(closeParen);

          console.log(`tei-ex ${index} after, innerHTML:`, htmlEx.innerHTML);
        });

        setTeiHTMLTranscription(element.outerHTML);
        setIsLoading(false);

        if (onTextLoad) {
          onTextLoad(xmlText);
        }
      });
    } catch (err) {
      console.error('Error processing TEI:', err);
      setError('Error processing TEI/XML file');
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setError('');
    setTeiHTMLDiplomatic('');
    setTeiHTMLTranscription('');

    try {
      const text = await file.text();
      processTEIFile(text);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg m-0 text-[var(--text-primary)]">
          Text Viewer
        </h3>
        <label
          className={`btn-icon btn-icon-sm ${manifestUrl ? 'btn-secondary cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          title={manifestUrl ? "Upload TEI/XML" : "Load a 3D model first"}
        >
          <FaUpload />
          <input
            type="file"
            accept=".xml,.tei"
            onChange={handleFileUpload}
            className="hidden"
            disabled={!manifestUrl}
          />
        </label>
      </div>

      {fileName && (
        <div className="text-xs text-[var(--text-secondary)] mb-2">
          File: {fileName}
        </div>
      )}

      {/* Tabs */}
      {(teiHTMLDiplomatic || teiHTMLTranscription) && (
        <div className="flex gap-2 mb-3 border-b border-[var(--border)]">
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'diplomatic'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('diplomatic')}
          >
            Diplomatic
          </button>
          <button
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'transcription'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('transcription')}
          >
            Transcription
          </button>
        </div>
      )}

      <div className="overflow-y-auto max-h-56 text-sm leading-relaxed text-[var(--text-secondary)]">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : activeTab === 'diplomatic' && teiHTMLDiplomatic ? (
          <div dangerouslySetInnerHTML={{ __html: teiHTMLDiplomatic }} />
        ) : activeTab === 'transcription' && teiHTMLTranscription ? (
          <div dangerouslySetInnerHTML={{ __html: teiHTMLTranscription }} />
        ) : !fileName ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            Upload a TEI/XML file to view the text
          </div>
        ) : null}
      </div>
    </>
  );
};

export default DisplayTEI;
