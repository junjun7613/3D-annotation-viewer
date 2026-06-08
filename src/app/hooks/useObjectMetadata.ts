'use client';

import { useEffect, useState } from 'react';
import { objectMetadataService, objectAnnotationService } from '@/lib/services/objectMetadata';
import type { ObjectMetadata } from '@/types/main';

interface ManifestMeta { thumbnail: string | null; label: string | null; }

async function fetchManifestMeta(manifestUrl: string): Promise<ManifestMeta> {
  try {
    const res = await fetch(manifestUrl);
    const manifest = await res.json();

    // thumbnail
    let thumbnail: string | null = null;
    if (manifest.thumbnail?.[0]?.id) thumbnail = manifest.thumbnail[0].id;
    else if (manifest.items?.[0]?.thumbnail?.[0]?.id) thumbnail = manifest.items[0].thumbnail[0].id;
    else if (manifest.thumbnail?.['@id']) thumbnail = manifest.thumbnail['@id'];
    else if (manifest.sequences?.[0]?.thumbnail?.['@id']) thumbnail = manifest.sequences[0].thumbnail['@id'];

    // label (IIIF v3: { lang: [str] }, v2: string)
    let label: string | null = null;
    const raw = manifest.label;
    if (typeof raw === 'string') {
      label = raw;
    } else if (raw && typeof raw === 'object') {
      const vals = Object.values(raw as Record<string, string[]>);
      label = vals[0]?.[0] ?? null;
    }

    return { thumbnail, label };
  } catch {
    return { thumbnail: null, label: null };
  }
}

/**
 * Fetches and manages object metadata from Firestore when the manifest URL changes.
 *
 * @param researchProjectId 現プロジェクト ID。null の場合は Object Annotation のマージをスキップする。
 */
export function useObjectMetadata(manifestUrl: string, researchProjectId: string | null) {
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);
  const [objectLocationLat, setObjectLocationLat] = useState('');
  const [objectLocationLng, setObjectLocationLng] = useState('');

  useEffect(() => {
    const fetchObjectMetadata = async () => {
      if (!manifestUrl) return;

      // manifest_metadata から location / thumbnail / label / TEI を取得
      const metadata = await objectMetadataService.getObjectMetadata(manifestUrl);

      // objectAnnotationService から media / wikidata / bibliography を取得
      // 現プロジェクトのアノテーションのみを対象にする
      const objAnns = researchProjectId
        ? await objectAnnotationService.getAll(manifestUrl, researchProjectId)
        : [];
      const firstAnn = objAnns[0] as Record<string, unknown> | undefined;

      const mergedMetadata: typeof metadata = metadata
        ? {
            ...metadata,
            media:        (firstAnn?.media        as typeof metadata.media)        ?? [],
            wikidata:     (firstAnn?.wikidata      as typeof metadata.wikidata)     ?? [],
            bibliography: (firstAnn?.bibliography  as typeof metadata.bibliography) ?? [],
          }
        : null;

      setObjectMetadata(mergedMetadata);
      if (mergedMetadata?.location) {
        setObjectLocationLat(mergedMetadata.location.lat || '');
        setObjectLocationLng(mergedMetadata.location.lng || '');
      } else {
        setObjectLocationLat('');
        setObjectLocationLng('');
      }

      // thumbnail_url または manifest_label が未保存なら取得して保存
      if (metadata && (!metadata.thumbnail_url || !metadata.manifest_label)) {
        const { thumbnail, label } = await fetchManifestMeta(manifestUrl);
        if (thumbnail && !metadata.thumbnail_url) {
          await objectMetadataService.saveThumbnailUrl(manifestUrl, thumbnail);
          setObjectMetadata((prev) => prev ? { ...prev, thumbnail_url: thumbnail } : prev);
        }
        if (label && !metadata.manifest_label) {
          await objectMetadataService.saveManifestLabel(manifestUrl, label);
          setObjectMetadata((prev) => prev ? { ...prev, manifest_label: label } : prev);
        }
      }
    };
    fetchObjectMetadata();
  }, [manifestUrl, researchProjectId]);

  return {
    objectMetadata,
    setObjectMetadata,
    objectLocationLat,
    setObjectLocationLat,
    objectLocationLng,
    setObjectLocationLng,
  };
}
