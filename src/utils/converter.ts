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
  baseUrl: string
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

  return data;
};
