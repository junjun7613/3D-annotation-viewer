'use client';

import type { ManifestIndexEntry } from '../hooks/useManifestIndex';

interface Props {
  entry: ManifestIndexEntry;
  highlightWikidataUri?: string;
}

export default function ManifestCard({ entry, highlightWikidataUri }: Props) {

  const shortUrl = entry.manifestUrl.replace(/^https?:\/\//, '').slice(0, 60);

  const fallbackThumbnail = entry.wikidata.find((w) => w.thumbnail)?.thumbnail;
  const thumbnail = entry.thumbnailUrl ?? fallbackThumbnail;

  const highlighted = highlightWikidataUri
    ? entry.wikidata.filter((w) => w.uri === highlightWikidataUri)
    : [];
  const others = entry.wikidata.filter((w) => w.uri !== highlightWikidataUri).slice(0, 3);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-[var(--secondary-bg)] flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="manifest thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[var(--text-secondary)] text-xs">No thumbnail</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Manifest label */}
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
          {entry.manifestLabel ?? shortUrl}
        </p>
        {/* Manifest URL */}
        <p className="text-xs text-[var(--text-secondary)] font-mono break-all leading-relaxed -mt-2">
          {shortUrl}{entry.manifestUrl.length > 60 ? '…' : ''}
        </p>

        {/* Highlighted wikidata entity */}
        {highlighted.length > 0 && (
          <div className="flex flex-col gap-1">
            {highlighted.map((w) => (
              <div key={w.uri} className="flex items-center gap-2">
                {w.thumbnail && (
                  <img src={w.thumbnail} alt={w.label} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                )}
                <span className="text-sm font-semibold text-[var(--primary)]">{w.label}</span>
                <span className="text-xs text-[var(--text-secondary)]">{w.type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Other wikidata entities */}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {others.map((w) => (
              <span key={w.uri} className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--text-secondary)]">
                {w.label}
              </span>
            ))}
            {entry.wikidata.length > highlighted.length + 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary-bg)] text-[var(--text-secondary)]">
                +{entry.wikidata.length - highlighted.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Open button */}
        <a
          href={`/editor/3d?manifest=${encodeURIComponent(entry.manifestUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity text-center"
        >
          3D Editorで開く
        </a>
      </div>
    </div>
  );
}
