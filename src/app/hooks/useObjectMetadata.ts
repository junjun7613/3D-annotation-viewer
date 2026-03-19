'use client';

import { useEffect, useState } from 'react';
import { objectMetadataService } from '@/lib/services/objectMetadata';
import type { ObjectMetadata } from '@/types/main';

/**
 * Fetches and manages object metadata from Firestore when the manifest URL changes.
 * Also exposes the saved TEI original XML and line mappings from the metadata.
 */
export function useObjectMetadata(manifestUrl: string) {
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);
  const [objectLocationLat, setObjectLocationLat] = useState('');
  const [objectLocationLng, setObjectLocationLng] = useState('');

  // Derived values from metadata for TEI restoration
  const savedTeiOriginal = objectMetadata?.tei_original ?? undefined;
  const savedTeiLineMappings = objectMetadata?.tei_line_mappings ?? undefined;

  useEffect(() => {
    const fetchObjectMetadata = async () => {
      if (manifestUrl) {
        const metadata = await objectMetadataService.getObjectMetadata(manifestUrl);
        setObjectMetadata(metadata);
        if (metadata?.location) {
          setObjectLocationLat(metadata.location.lat || '');
          setObjectLocationLng(metadata.location.lng || '');
        } else {
          setObjectLocationLat('');
          setObjectLocationLng('');
        }
      }
    };
    fetchObjectMetadata();
  }, [manifestUrl]);

  return {
    objectMetadata,
    setObjectMetadata,
    objectLocationLat,
    setObjectLocationLat,
    objectLocationLng,
    setObjectLocationLng,
    savedTeiOriginal,
    savedTeiLineMappings,
  };
}
