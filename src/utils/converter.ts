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

export const downloadIIIFManifest = async (
  manifestUrl: string,
  firebaseDocuments: NewAnnotation[],
  baseUrl: string,
  objectMetadata?: {
    media: { id: string; type: string; source: string; caption: string }[];
    wikidata: { type: string; label: string; uri: string; wikipedia?: string; lat?: string; lng?: string; thumbnail?: string }[];
    bibliography: { id: string; author: string; title: string; year: string; page?: string; pdf?: string }[];
    location?: { lat: string; lng: string };
  } | null
) => {
  // manifestUrlを/でsplitして最後の要素を削除
  const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

  // マニフェストを先に取得してラベルを取得
  const data = await fetch(manifestUrl).then((res) => res.json());
  const manifestLabel =
    typeof data.label === 'string'
      ? data.label
      : data.label?.ja?.[0] || data.label?.en?.[0] || data.label?.none?.[0] || 'Manifest';

  const annotations: IIIFAnnotation[] = [];
  const geoFeatures: GeoFeature[] = [];

  firebaseDocuments.forEach((doc) => {
    const html = parser.parse(doc.data.body.value);

    // Wikidataの地名を説明文に追加
    let descriptionHtml: string;
    const baseHtml = Array.isArray(html) ? html.join('') : String(html);

    if (doc.wikidata && doc.wikidata.length > 0) {
      const wikidataLabels = doc.wikidata
        .map((wikiItem: WikidataItem) => wikiItem.label)
        .filter((label: string) => label)
        .join(', ');
      if (wikidataLabels) {
        descriptionHtml = `<p>${wikidataLabels}</p>${baseHtml}`;
      } else {
        descriptionHtml = baseHtml;
      }
    } else {
      descriptionHtml = baseHtml;
    }

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

    annotations.push(annotation);

    // Geo features from location
    const locationFeature = createGeoFeatureFromLocation(doc, baseUrl, manifestLabel, manifestUrl);
    if (locationFeature) {
      geoFeatures.push(locationFeature);
    }

    // Geo features from wikidata items with lat/lng
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
  });

  // Canvas直下にannotations配列がなければ作成
  // data.items[0] = Canvas
  if (!data.items[0].annotations) {
    data.items[0].annotations = [];
  }

  // AnnotationPage for painting annotations
  const paintingAnnotationPage = {
    id: `${newUrl}/annotationPage/${uuidv4()}`,
    type: 'AnnotationPage',
    items: annotations,
  };
  data.items[0].annotations.push(paintingAnnotationPage);

  // AnnotationPage for georeferencing (if there are geo features)
  if (geoFeatures.length > 0) {
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
        features: geoFeatures,
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
    // metadataを初期化（存在しない場合）
    if (!data.metadata) {
      data.metadata = [];
    }

    // Wikidataをmetadataに追加（URI付き）
    if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
      objectMetadata.wikidata.forEach((wikiItem) => {
        // Linked Artスタイルでメタデータを追加
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

    // WikidataをseeAlsoに追加（完全な情報を保持）
    if (objectMetadata.wikidata && objectMetadata.wikidata.length > 0) {
      objectMetadata.wikidata.forEach((wikiItem) => {
        const seeAlsoEntry: Record<string, unknown> = {
          id: wikiItem.uri,
          type: 'Dataset',
          label: { en: [wikiItem.label] },
          format: 'application/ld+json',
          profile: wikiItem.type === 'wikidata' ? 'https://www.wikidata.org' : 'https://www.geonames.org',
        };

        // 地理情報を含める
        if (wikiItem.lat && wikiItem.lng) {
          seeAlsoEntry.latitude = parseFloat(wikiItem.lat);
          seeAlsoEntry.longitude = parseFloat(wikiItem.lng);
        }

        // サムネイルを含める
        if (wikiItem.thumbnail) {
          seeAlsoEntry.thumbnail = wikiItem.thumbnail;
        }

        data.seeAlso.push(seeAlsoEntry);

        // Wikipediaリンクも追加
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

    // Locationがある場合、navPlaceを追加（IIIF Navplace Extension準拠）
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

  return data;
};
