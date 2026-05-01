'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { ManifestIndexEntry } from '../hooks/useManifestIndex';

interface Props {
  entries: ManifestIndexEntry[];
  selectedUrl: string | null;
  onSelect: (manifestUrl: string) => void;
}

// geoPoints を持つエントリのみ抽出
function collectMarkers(entries: ManifestIndexEntry[]) {
  const markers: {
    lat: number;
    lng: number;
    label: string;
    source: 'location' | 'wikidata';
    manifestUrl: string;
  }[] = [];

  entries.forEach((entry) => {
    entry.geoPoints.forEach((pt) => {
      markers.push({ ...pt, manifestUrl: entry.manifestUrl });
    });
  });
  return markers;
}

export default function MapView({ entries, selectedUrl, onSelect }: Props) {
  const markers = collectMarkers(entries);

  if (markers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">
        地理情報を持つマニフェストがありません
      </div>
    );
  }

  const center: [number, number] = [markers[0].lat, markers[0].lng];

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ width: '100%', height: '100%' }}
      className="rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m, i) => {
        const isSelected = selectedUrl === m.manifestUrl;
        const color = m.source === 'location' ? '#2563EB' : '#059669';
        return (
          <CircleMarker
            key={i}
            center={[m.lat, m.lng]}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              color: isSelected ? '#DC2626' : color,
              fillColor: isSelected ? '#DC2626' : color,
              fillOpacity: 0.8,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect(m.manifestUrl) }}
          >
            <Tooltip>{m.label || m.manifestUrl}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
