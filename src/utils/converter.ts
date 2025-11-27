import { v4 as uuidv4 } from 'uuid';
import EditorJSHtml from 'editorjs-html';
import { NewAnnotation, IIIFAnnotation, WikidataItem } from '@/types/main';

const parser = EditorJSHtml();

interface GeoFeature {
  type: 'Feature';
  metadata: {
    label: string;
    id: string;
  };
  geometry: {
    coordinates: [number, number];
    type: 'Point';
  };
  properties: {
    resourceCoords: [number, number, number];
  };
}

interface GeoAnnotation {
  id: string;
  type: 'Annotation';
  motivation: 'georeferencing';
  target: string;
  body: {
    type: 'FeatureCollection';
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

export const downloadIIIFManifest = async (
  manifestUrl: string,
  firebaseDocuments: NewAnnotation[]
) => {
  // manifestUrlを/でsplitして最後の要素を削除
  const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

  const annotations: IIIFAnnotation[] = [];
  const geoFeatures: GeoFeature[] = [];

  firebaseDocuments.forEach((doc) => {
    const html = parser.parse(doc.data.body.value);

    const annotation: IIIFAnnotation = {
      id: `${newUrl}/annotation/${doc.id}`,
      type: 'Annotation',
      motivation: 'commenting',
      body: {
        value: html,
        label: doc.data.body.label,
        type: doc.data.body.type,
      }, // doc.data.body,
      target: {
        source: doc.target_canvas,
        selector: doc.data.target.selector,
      },
    };

    annotations.push(annotation);

    // Geo features from location
    if (doc.location?.lat && doc.location?.lng) {
      const geoFeature: GeoFeature = {
        type: 'Feature',
        metadata: {
          label: doc.data.body.label,
          id: doc.id,
        },
        geometry: {
          coordinates: [parseFloat(doc.location.lng), parseFloat(doc.location.lat)],
          type: 'Point',
        },
        properties: {
          resourceCoords: doc.data.target.selector.value,
        },
      };
      geoFeatures.push(geoFeature);
    }

    // Geo features from wikidata items with lat/lng
    if (doc.wikidata && doc.wikidata.length > 0) {
      doc.wikidata.forEach((wikiItem: WikidataItem) => {
        if (wikiItem.lat && wikiItem.lng) {
          const geoFeature: GeoFeature = {
            type: 'Feature',
            metadata: {
              label: wikiItem.label,
              id: `${doc.id}-${wikiItem.uri.split('/').pop()}`,
            },
            geometry: {
              coordinates: [parseFloat(wikiItem.lng), parseFloat(wikiItem.lat)],
              type: 'Point',
            },
            properties: {
              resourceCoords: doc.data.target.selector.value,
            },
          };
          geoFeatures.push(geoFeature);
        }
      });
    }
  });

  const url = manifestUrl;

  const data = await fetch(url).then((res) => res.json());

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
