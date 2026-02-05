import { v4 as uuidv4 } from 'uuid';
import EditorJSHtml from 'editorjs-html';
import { NewAnnotation, IIIFAnnotation, WikidataItem } from '@/types/main';
import { toWikidataEntityUri } from '@/lib/services/wikidata';

const parser = EditorJSHtml();

export interface GeoFeature {
  '@context': string;
  '@id': string;
  type: 'Feature';
  geometry: {
    coordinates: [number, number];
    type: 'Point';
  };
  properties: {
    title: string;
    resourceCoords: [number, number, number];
  };
  names: {
    toponym: string;
    lang?: string;
    citations: { label: string; '@id'?: string }[];
  }[];
  links?: { type: string; identifier: string }[];
  depictions?: { '@id': string; title?: string }[];
}

interface GeoAnnotation {
  id: string;
  type: 'Annotation';
  motivation: 'georeferencing';
  target: string;
  body: {
    type: 'FeatureCollection';
    '@context': string;
    features: GeoFeature[];
  };
}

// デコード
export function decodeSlug(slug: string): string {
  const base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString();
}

export function createSlug(url: string): string {
  return Buffer.from(url)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// GeoFeatureを生成する共通関数
export function createGeoFeatureFromLocation(
  doc: NewAnnotation,
  baseUrl: string,
  manifestLabel: string,
  manifestUrl: string
): GeoFeature | null {
  if (!doc.location?.lat || !doc.location?.lng) {
    return null;
  }
  return {
    '@context':
      'https://raw.githubusercontent.com/LinkedPasts/linked-places/master/linkedplaces-context-v1.1.jsonld',
    '@id': `${baseUrl}/api/annot/${doc.id}`,
    type: 'Feature',
    geometry: {
      coordinates: [parseFloat(doc.location.lng), parseFloat(doc.location.lat)],
      type: 'Point',
    },
    properties: {
      title: doc.data.body.label,
      resourceCoords: doc.data.target.selector.value,
    },
    names: [
      {
        toponym: doc.data.body.label,
        lang: 'ja',
        citations: [{ label: manifestLabel, '@id': manifestUrl }],
      },
    ],
  };
}

export function createGeoFeatureFromWikidata(
  doc: NewAnnotation,
  wikiItem: WikidataItem,
  baseUrl: string,
  manifestLabel: string,
  manifestUrl: string
): GeoFeature | null {
  if (!wikiItem.lat || !wikiItem.lng) {
    return null;
  }
  return {
    '@context':
      'https://raw.githubusercontent.com/LinkedPasts/linked-places/master/linkedplaces-context-v1.1.jsonld',
    '@id': `${baseUrl}/api/annot/${doc.id}`,
    type: 'Feature',
    geometry: {
      coordinates: [parseFloat(wikiItem.lng), parseFloat(wikiItem.lat)],
      type: 'Point',
    },
    properties: {
      title: doc.data.body.label,
      resourceCoords: doc.data.target.selector.value,
    },
    names: [
      {
        toponym: doc.data.body.label,
        lang: 'ja',
        citations: [{ label: manifestLabel, '@id': manifestUrl }],
      },
      ...(wikiItem.label
        ? [
            {
              toponym: wikiItem.label,
              lang: 'ja',
              citations: wikiItem.wikipedia
                ? [{ label: 'Wikipedia', '@id': wikiItem.wikipedia }]
                : [{ label: 'Wikidata', '@id': wikiItem.uri }],
            },
          ]
        : []),
    ],
    links: [
      { type: 'closeMatch', identifier: toWikidataEntityUri(wikiItem.uri) },
      ...(wikiItem.wikipedia
        ? [{ type: 'primaryTopicOf', identifier: wikiItem.wikipedia }]
        : []),
    ],
    depictions: wikiItem.thumbnail ? [{ '@id': wikiItem.thumbnail }] : undefined,
  };
}

// マニフェストラベルを取得する共通関数
export async function fetchManifestLabel(manifestUrl: string): Promise<{ label: string; data: unknown }> {
  const data = await fetch(manifestUrl).then((res) => res.json());
  const label =
    typeof data.label === 'string'
      ? data.label
      : data.label?.ja?.[0] || data.label?.en?.[0] || data.label?.none?.[0] || 'Manifest';
  return { label, data };
}

// seeAlsoアイテムを構築する関数
function buildSeeAlsoItems(doc: NewAnnotation): Record<string, unknown>[] {
  const seeAlsoItems: Record<string, unknown>[] = [];

  // Mediaを追加
  if (doc.media && doc.media.length > 0) {
    doc.media.forEach((mediaItem) => {
      const mediaEntry: Record<string, unknown> = {
        type: mediaItem.type === 'iiif' ? 'Manifest' : (mediaItem.type === 'video' ? 'Video' : (mediaItem.type === 'sketchfab' ? 'Model' : 'Image')),
        label: { en: [mediaItem.caption || mediaItem.type] },
      };

      if (mediaItem.type === 'iiif' && mediaItem.manifestUrl) {
        mediaEntry.id = mediaItem.manifestUrl;
        mediaEntry.format = 'application/ld+json';
        mediaEntry.profile = 'http://iiif.io/api/presentation/3/context.json';
      } else if (mediaItem.type === 'sketchfab' && mediaItem.canvasId) {
        mediaEntry.id = `https://sketchfab.com/models/${mediaItem.canvasId}`;
        mediaEntry.format = 'text/html';
      } else if (mediaItem.type === 'video') {
        mediaEntry.id = mediaItem.source;
        mediaEntry.format = 'text/html';
      } else {
        mediaEntry.id = mediaItem.source;
        mediaEntry.format = 'image/jpeg';
      }

      seeAlsoItems.push(mediaEntry);
    });
  }

  // Wikidataを追加
  if (doc.wikidata && doc.wikidata.length > 0) {
    doc.wikidata.forEach((wikiItem: WikidataItem) => {
      const wikiEntry: Record<string, unknown> = {
        id: wikiItem.uri,
        type: 'Dataset',
        label: { en: [wikiItem.label] },
        format: 'application/ld+json',
        profile: 'https://www.wikidata.org',
      };

      if (wikiItem.wikipedia) {
        seeAlsoItems.push({
          id: wikiItem.wikipedia,
          type: 'Text',
          label: { en: [`Wikipedia: ${wikiItem.label}`] },
          format: 'text/html',
        });
      }

      seeAlsoItems.push(wikiEntry);
    });
  }

  // Bibliographyを追加
  if (doc.bibliography && doc.bibliography.length > 0) {
    doc.bibliography.forEach((bibItem) => {
      const bibEntry: Record<string, unknown> = {
        type: 'Text',
        label: { en: [`${bibItem.author} (${bibItem.year}). ${bibItem.title}`] },
        format: bibItem.pdf ? 'application/pdf' : 'text/plain',
      };
      if (bibItem.pdf) {
        bibEntry.id = bibItem.pdf;
      }
      seeAlsoItems.push(bibEntry);
    });
  }

  return seeAlsoItems;
}

// アノテーションをIIIF形式に変換する関数
function convertAnnotationToIIIF(
  doc: NewAnnotation,
  newUrl: string,
  baseUrl: string,
  manifestLabel: string,
  manifestUrl: string
): { annotation: IIIFAnnotation; geoFeatures: GeoFeature[] } {
  const html = parser.parse(doc.data.body.value);
  const descriptionHtml = Array.isArray(html) ? html.join('') : String(html);

  const annotation: IIIFAnnotation = {
    id: `${newUrl}/annotation/${doc.id}`,
    type: 'Annotation',
    motivation: 'commenting',
    body: {
      value: descriptionHtml,
      label: doc.data.body.label,
      type: doc.data.body.type,
    },
    target: {
      source: doc.target_canvas,
      selector: doc.data.target.selector,
    },
  };

  // seeAlsoを構築
  const seeAlsoItems = buildSeeAlsoItems(doc);
  if (seeAlsoItems.length > 0) {
    annotation.seeAlso = seeAlsoItems;
  }

  // Geo featuresを収集
  const geoFeatures: GeoFeature[] = [];

  const locationFeature = createGeoFeatureFromLocation(doc, baseUrl, manifestLabel, manifestUrl);
  if (locationFeature) {
    geoFeatures.push(locationFeature);
  }

  if (doc.wikidata && doc.wikidata.length > 0) {
    doc.wikidata.forEach((wikiItem: WikidataItem) => {
      const wikidataFeature = createGeoFeatureFromWikidata(
        doc,
        wikiItem,
        baseUrl,
        manifestLabel,
        manifestUrl
      );
      if (wikidataFeature) {
        geoFeatures.push(wikidataFeature);
      }
    });
  }

  return { annotation, geoFeatures };
}

// ObjectMetadataの型定義
type ObjectMetadata = {
  media: { id: string; type: string; source: string; caption: string; manifestUrl?: string; canvasId?: string }[];
  wikidata: { type: string; label: string; uri: string; wikipedia?: string; lat?: string; lng?: string; thumbnail?: string }[];
  bibliography: { id: string; author: string; title: string; year: string; page?: string; pdf?: string }[];
  location?: { lat: string; lng: string };
};

// マニフェストにObjectメタデータを追加する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addObjectMetadataToManifest(data: any, objectMetadata: ObjectMetadata, baseUrl: string, manifestLabel: string): void {
  // metadataを初期化（存在しない場合）
  if (!data.metadata) {
    data.metadata = [];
  }

  // Wikidataをmetadataに追加（URI付き）
  if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
    objectMetadata.wikidata.forEach((wikiItem) => {
      data.metadata.push({
        label: { en: ['Related Entity'] },
        value: {
          '@id': wikiItem.uri,
          type: 'Text',
          format: 'text/html',
          language: ['en'],
          value: wikiItem.label,
        },
      });
    });
  }

  // seeAlsoを初期化（存在しない場合）
  if (!data.seeAlso) {
    data.seeAlso = [];
  }

  // WikidataをseeAlsoに追加
  if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
    objectMetadata.wikidata.forEach((wikiItem) => {
      const seeAlsoEntry: Record<string, unknown> = {
        id: wikiItem.uri,
        type: 'Dataset',
        label: { en: [wikiItem.label] },
        format: 'application/ld+json',
        profile: wikiItem.type === 'wikidata' ? 'https://www.wikidata.org' : 'https://www.geonames.org',
      };

      if (wikiItem.lat && wikiItem.lng) {
        seeAlsoEntry.latitude = parseFloat(wikiItem.lat);
        seeAlsoEntry.longitude = parseFloat(wikiItem.lng);
      }

      if (wikiItem.thumbnail) {
        seeAlsoEntry.thumbnail = wikiItem.thumbnail;
      }

      data.seeAlso.push(seeAlsoEntry);

      if (wikiItem.wikipedia) {
        data.seeAlso.push({
          id: wikiItem.wikipedia,
          type: 'Text',
          label: { en: [`Wikipedia: ${wikiItem.label}`] },
          format: 'text/html',
        });
      }
    });
  }

  // 参考文献をseeAlsoに追加
  if (objectMetadata.bibliography && objectMetadata.bibliography.length > 0) {
    objectMetadata.bibliography.forEach((bibItem) => {
      const bibEntry: Record<string, unknown> = {
        type: 'Text',
        label: { en: [`${bibItem.author} (${bibItem.year}). ${bibItem.title}`] },
        format: bibItem.pdf ? 'application/pdf' : 'text/plain',
      };
      if (bibItem.pdf) {
        bibEntry.id = bibItem.pdf;
      }
      data.seeAlso.push(bibEntry);
    });
  }

  // MediaをseeAlsoに追加
  if (objectMetadata.media && objectMetadata.media.length > 0) {
    objectMetadata.media.forEach((mediaItem) => {
      const mediaEntry: Record<string, unknown> = {
        type: mediaItem.type === 'iiif' ? 'Manifest' : (mediaItem.type === 'video' ? 'Video' : 'Image'),
        label: { en: [mediaItem.caption] },
      };

      if (mediaItem.type === 'iiif' && mediaItem.manifestUrl) {
        mediaEntry.id = mediaItem.manifestUrl;
        mediaEntry.format = 'application/ld+json';
        mediaEntry.profile = 'http://iiif.io/api/presentation/3/context.json';
        if (mediaItem.canvasId) {
          mediaEntry.partOf = [{
            id: mediaItem.manifestUrl,
            type: 'Manifest'
          }];
          mediaEntry.id = mediaItem.canvasId;
          mediaEntry.type = 'Canvas';
        }
      } else {
        mediaEntry.id = mediaItem.source;
        if (mediaItem.type === 'video') {
          mediaEntry.format = 'video/mp4';
        } else if (mediaItem.type === 'img') {
          mediaEntry.format = 'image/jpeg';
        }
      }

      data.seeAlso.push(mediaEntry);
    });
  }

  // Locationがある場合、navPlaceを追加
  if (objectMetadata.location) {
    data.navPlace = {
      id: `${baseUrl}/place/object`,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(objectMetadata.location.lng), parseFloat(objectMetadata.location.lat)],
      },
      properties: {
        name: manifestLabel,
      },
    };
  }
}

export const downloadIIIFManifest = async (
  manifestUrl: string,
  firebaseDocuments: NewAnnotation[],
  baseUrl: string,
  objectMetadata?: ObjectMetadata | null
) => {
  const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

  // マニフェストを取得してラベルを取得
  const data = await fetch(manifestUrl).then((res) => res.json());
  const manifestLabel =
    typeof data.label === 'string'
      ? data.label
      : data.label?.ja?.[0] || data.label?.en?.[0] || data.label?.none?.[0] || 'Manifest';

  // アノテーションとGeo featuresを変換
  const annotations: IIIFAnnotation[] = [];
  const allGeoFeatures: GeoFeature[] = [];

  firebaseDocuments.forEach((doc) => {
    const { annotation, geoFeatures } = convertAnnotationToIIIF(
      doc,
      newUrl,
      baseUrl,
      manifestLabel,
      manifestUrl
    );
    annotations.push(annotation);
    allGeoFeatures.push(...geoFeatures);
  });

  // Canvas直下にannotations配列がなければ作成
  if (!data.items[0].annotations) {
    data.items[0].annotations = [];
  }

  // AnnotationPageを追加
  const paintingAnnotationPage = {
    id: `${newUrl}/annotationPage/${uuidv4()}`,
    type: 'AnnotationPage',
    items: annotations,
  };
  data.items[0].annotations.push(paintingAnnotationPage);

  // Geo featuresがある場合、georeferencingのAnnotationPageを追加
  if (allGeoFeatures.length > 0) {
    const targetCanvas = firebaseDocuments[0]?.target_canvas || '';
    const geoAnnotation: GeoAnnotation = {
      id: `${newUrl}/annotation/geo`,
      type: 'Annotation',
      motivation: 'georeferencing',
      target: targetCanvas,
      body: {
        type: 'FeatureCollection',
        '@context':
          'https://raw.githubusercontent.com/LinkedPasts/linked-places/master/linkedplaces-context-v1.1.jsonld',
        features: allGeoFeatures,
      },
    };

    const geoAnnotationPage = {
      id: `${newUrl}/annotationPage/geo`,
      type: 'AnnotationPage',
      items: [geoAnnotation],
    };
    data.items[0].annotations.push(geoAnnotationPage);
  }

  // Objectメタデータを追加
  if (objectMetadata) {
    addObjectMetadataToManifest(data, objectMetadata, baseUrl, manifestLabel);
  }

  return data;
};
