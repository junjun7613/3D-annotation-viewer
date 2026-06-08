export type ManifestType = '2d' | '3d' | 'unknown';

/**
 * IIIF Manifest JSON を fetch して 2D / 3D を判定する。
 * v3 の `canvas.items[0].items[0].body.format/type` と
 * v2 の `canvas.images[0].resource.format` の両方を見る。
 */
export async function detectManifestType(manifestUrl: string): Promise<ManifestType> {
  try {
    const res = await fetch(manifestUrl);
    const manifest = await res.json();
    const canvas = manifest.items?.[0] || manifest.sequences?.[0]?.canvases?.[0];
    if (!canvas) return 'unknown';
    const body = canvas.items?.[0]?.items?.[0]?.body;
    const bodies = Array.isArray(body) ? body : body ? [body] : [];
    for (const b of bodies) {
      const fmt = typeof b?.format === 'string' ? b.format : '';
      const typ = typeof b?.type === 'string' ? b.type : '';
      if (fmt.startsWith('model/') || typ === 'Model' || typ === 'PhysicalObject') return '3d';
      if (fmt.startsWith('image/') || typ === 'Image') return '2d';
    }
    const resource = canvas.images?.[0]?.resource;
    if (resource) {
      const fmt = typeof resource.format === 'string' ? resource.format : '';
      if (fmt.startsWith('model/')) return '3d';
      if (fmt.startsWith('image/') || resource['@type']?.includes('Image')) return '2d';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
