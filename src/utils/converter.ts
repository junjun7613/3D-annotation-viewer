import { v4 as uuidv4 } from 'uuid';
import { NewAnnotation, IIIFAnnotation, WikidataItem } from '@/types/main';
import { toWikidataEntityUri } from '@/lib/services/wikidata';
import { renderMarkdown } from './markdown';

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

// label が string / 多言語 / 配列 のいずれであっても v3 言語マップに正規化する。
// lang ヒントは入力 manifest の表記に従う（NDL は日本語想定なので "ja" を既定）。
function toLanguageMap(label: unknown, defaultLang: string = 'ja'): Record<string, string[]> {
  if (label == null) return { none: [''] };
  if (typeof label === 'string') return { [defaultLang]: [label] };
  if (Array.isArray(label)) return { [defaultLang]: label.map(String) };
  if (typeof label === 'object') {
    // すでに言語マップ形式（値が配列）ならそのまま、値が文字列なら配列化
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(label as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.map(String);
      else if (typeof v === 'string') out[k] = [v];
    }
    if (Object.keys(out).length > 0) return out;
  }
  return { none: [String(label)] };
}

// IIIF Presentation API 2.x マニフェストを 3.0 形式に正規化する。
// 入力がすでに v3（items を持つ）であればそのまま返す。
// 対応スコープ: ルート Manifest / sequences[0].canvases / 各 Canvas の images（painting Annotation）。
// otherContent（v2 の AnnotationList 参照）は本実装ではフェッチせず破棄する。
// 既存アノテーションは本システムが Canvas.annotations に新規 AnnotationPage として追加するため。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeV2ToV3(data: any): any {
  // すでに v3 とみなせる: items 配列を持っていれば触らない
  if (Array.isArray(data.items) && data.items.length > 0) {
    return data;
  }

  const v2Canvases = data?.sequences?.[0]?.canvases;
  if (!Array.isArray(v2Canvases) || v2Canvases.length === 0) {
    // v2 でも v3 でもない: 呼び出し元のエラーハンドリングに委ねる
    return data;
  }

  // --- ルートを v3 化 ---
  data['@context'] = 'http://iiif.io/api/presentation/3/context.json';
  if (data['@id'] && !data.id) data.id = data['@id'];
  delete data['@id'];
  data.type = 'Manifest';
  delete data['@type'];
  data.label = toLanguageMap(data.label);

  // attribution → requiredStatement（v3）
  if (data.attribution && !data.requiredStatement) {
    data.requiredStatement = {
      label: toLanguageMap('Attribution', 'en'),
      value: toLanguageMap(data.attribution),
    };
  }
  delete data.attribution;

  // logo は v3 では provider.logo 配下だが、出力 viewer 側で必須でないので簡易処理
  if (data.logo) {
    const logoUrl = typeof data.logo === 'string' ? data.logo : data.logo['@id'];
    if (logoUrl) {
      data.provider = data.provider || [
        {
          id: data.id || 'https://example.org/provider',
          type: 'Agent',
          label: toLanguageMap('Provider', 'en'),
          logo: [{ id: logoUrl, type: 'Image', format: 'image/png' }],
        },
      ];
    }
    delete data.logo;
  }

  // license → rights（v3 は URL 文字列）
  if (data.license && !data.rights) {
    data.rights = typeof data.license === 'string' ? data.license : data.license['@id'];
  }
  delete data.license;

  // metadata: v2 は { label, value } の文字列。v3 は言語マップ。
  if (Array.isArray(data.metadata)) {
    data.metadata = data.metadata.map((m: Record<string, unknown>) => ({
      label: toLanguageMap(m.label),
      value: toLanguageMap(m.value),
    }));
  }

  // seeAlso: v2 は文字列でも許容。v3 は配列のオブジェクト。
  if (typeof data.seeAlso === 'string') {
    data.seeAlso = [{ id: data.seeAlso, type: 'Dataset' }];
  }

  // --- canvases → items に変換 ---
  data.items = v2Canvases.map((c: Record<string, unknown>) => normalizeV2Canvas(c));
  delete data.sequences;

  return data;
}

// v2 Canvas を v3 Canvas に変換する。
// images: [oa:Annotation{ resource: dctypes:Image, on: <canvasId> }] を
// items: [AnnotationPage{ items: [Annotation{ motivation:"painting", body, target }] }] に展開する。
function normalizeV2Canvas(canvas: Record<string, unknown>): Record<string, unknown> {
  const canvasId = (canvas['@id'] as string) || (canvas.id as string);
  const out: Record<string, unknown> = {
    id: canvasId,
    type: 'Canvas',
    label: toLanguageMap(canvas.label),
    width: canvas.width,
    height: canvas.height,
  };

  const images = canvas.images as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const paintingAnnotations = images.map((img) => {
      const resource = (img.resource as Record<string, unknown>) || {};
      const body: Record<string, unknown> = {
        id: (resource['@id'] as string) || (resource.id as string),
        type: 'Image',
        format: (resource.format as string) || 'image/jpeg',
      };
      if (resource.width) body.width = resource.width;
      if (resource.height) body.height = resource.height;

      // IIIF Image API service の v2 → v3 変換（最小限）
      const service = resource.service as Record<string, unknown> | undefined;
      if (service) {
        const svcId = (service['@id'] as string) || (service.id as string);
        if (svcId) {
          body.service = [
            {
              id: svcId,
              type: 'ImageService2',
              profile: (service.profile as string) || 'http://iiif.io/api/image/2/level1.json',
            },
          ];
        }
      }

      return {
        id: (img['@id'] as string) || `${canvasId}/painting/${uuidv4()}`,
        type: 'Annotation',
        motivation: 'painting',
        body,
        target: (img.on as string) || canvasId,
      };
    });

    out.items = [
      {
        id: `${canvasId}/page`,
        type: 'AnnotationPage',
        items: paintingAnnotations,
      },
    ];
  }

  return out;
}

// seeAlsoアイテムを構築する関数
function buildSeeAlsoItems(doc: NewAnnotation, manifestBase: string): Record<string, unknown>[] {
  const seeAlsoItems: Record<string, unknown>[] = [];

  // Mediaを追加
  if (doc.media && doc.media.length > 0) {
    doc.media.forEach((mediaItem) => {
      const mediaEntry: Record<string, unknown> = {
        // RDFと同一のURIを id として付与
        id: `${manifestBase}/media/${mediaItem.id}`,
        type: mediaItem.type === 'iiif' ? 'Manifest' : (mediaItem.type === 'video' ? 'Video' : (mediaItem.type === 'sketchfab' ? 'Model' : 'Image')),
        label: { en: [mediaItem.caption || mediaItem.type] },
      };

      if (mediaItem.type === 'iiif' && mediaItem.manifestUrl) {
        mediaEntry.format = 'application/ld+json';
        mediaEntry.profile = 'http://iiif.io/api/presentation/3/context.json';
        mediaEntry.source = mediaItem.manifestUrl;
      } else if (mediaItem.type === 'sketchfab' && mediaItem.canvasId) {
        mediaEntry.format = 'text/html';
        mediaEntry.source = `https://sketchfab.com/models/${mediaItem.canvasId}`;
      } else if (mediaItem.type === 'video') {
        mediaEntry.format = 'text/html';
        mediaEntry.source = mediaItem.source;
      } else {
        mediaEntry.format = 'image/jpeg';
        mediaEntry.source = mediaItem.source;
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
        // RDFと同一のURIを id として付与
        id: `${manifestBase}/bibliography/${bibItem.id}`,
        type: 'Text',
        label: { en: [`${bibItem.author} (${bibItem.year}). ${bibItem.title}`] },
        format: bibItem.pdf ? 'application/pdf' : 'text/plain',
      };
      if (bibItem.pdf) {
        bibEntry.source = bibItem.pdf;
      }
      seeAlsoItems.push(bibEntry);
    });
  }

  return seeAlsoItems;
}

// Firebase保存形式のセレクターをIIIF仕様形式に変換する
// 3D: IIIF 3D Draft仕様 https://iiif.github.io/3d/temp-draft-4.html
// 2D: Web Annotation Data Model (FragmentSelector / SvgSelector)
function convertSelectorToIIIF(selector: Record<string, unknown>): Record<string, unknown> {
  const type = selector.type as string;

  // --- 3D ---
  if (type === '3DSelector') {
    const value = selector.value as [number, number, number];
    return { type: 'PointSelector', x: value[0], y: value[1], z: value[2] };
  }
  if (type === 'PolygonSelector') {
    const area = (selector.area ?? selector.value) as number[];
    // 頂点群を WKT POLYGONZ 形式に変換
    const points: string[] = [];
    for (let i = 0; i + 2 < area.length; i += 3) {
      points.push(`${area[i]} ${area[i + 1]} ${area[i + 2]}`);
    }
    // 閉じる（最初の点を末尾に繰り返す）
    if (points.length > 0) points.push(points[0]);
    return { type: 'PolygonZSelector', value: `POLYGONZ((${points.join(', ')}))` };
  }

  // --- 2D ---
  if (type === '2DRectSelector') {
    const { x, y, width, height } = selector as { x: number; y: number; width: number; height: number };
    // xywh= は正規化座標（0–1）を pixel に変換しない — viewer 側で解釈
    return {
      type: 'FragmentSelector',
      conformsTo: 'http://www.w3.org/TR/media-frags/',
      value: `xywh=percent:${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(width * 100)},${Math.round(height * 100)}`,
    };
  }
  if (type === '2DPolygonSelector') {
    const points = selector.points as { x: number; y: number }[];
    const svgPoints = points.map((p) => `${(p.x * 100).toFixed(2)}%,${(p.y * 100).toFixed(2)}%`).join(' ');
    return {
      type: 'SvgSelector',
      value: `<svg><polygon points="${svgPoints}" /></svg>`,
    };
  }

  return selector;
}

// sourceの type を selector 種別から決定
function sourceTypeFromSelector(selectorType: string): string {
  if (selectorType === '3DSelector' || selectorType === 'PolygonSelector') return 'Scene';
  return 'Canvas';
}

// アノテーションをIIIF形式に変換する関数
// 同一 regionId を共有する場合も、各アノテーションは独立に valid な
// SpecificResource（id + source + selector を完全展開）として出力する。
// 領域 URI（target.id）の一致でアノテーション間の集約は RDF 側に委ねる。
function convertAnnotationToIIIF(
  doc: NewAnnotation,
  newUrl: string,
  baseUrl: string,
  manifestLabel: string,
  manifestUrl: string,
  regionsMap?: Map<string, Record<string, unknown>>
): { annotation: IIIFAnnotation; geoFeatures: GeoFeature[] } {
  const markdown = typeof doc.data.body.value === 'string' ? doc.data.body.value : '';
  const descriptionHtml = renderMarkdown(markdown, {
    bibliography: doc.bibliography,
    wikidata: doc.wikidata,
    media: doc.media,
  });

  const regionId = (doc as unknown as Record<string, unknown>).regionId as string | undefined;
  const regionData = regionId ? regionsMap?.get(regionId) : undefined;
  const rawSelector = regionData
    ? (regionData.selector as Record<string, unknown>)
    : (doc.data.target.selector as unknown as Record<string, unknown>);
  const targetId = regionId ? `${newUrl}/region/${regionId}` : undefined;

  const selectorType = rawSelector.type as string;
  const sourceType = sourceTypeFromSelector(selectorType);
  // W3C Web Annotation Data Model に合わせ source / selector は単一オブジェクトで出力する
  // （Universal Viewer / Annona 等の主要パーサは配列形を解釈しない）。
  const target: Record<string, unknown> = {
    type: 'SpecificResource',
    source: { id: doc.target_canvas, type: sourceType },
    selector: convertSelectorToIIIF(rawSelector),
  };
  if (targetId) target.id = targetId;

  // body は v3 の TextualBody に正規化。
  // 本文（Markdown 由来の HTML）が空のときはアノテーションラベルをフォールバック表示にする。
  const bodyValue = descriptionHtml && descriptionHtml.trim().length > 0
    ? descriptionHtml
    : (doc.data.body.label ?? '');
  const annotation: IIIFAnnotation = {
    id: `${newUrl}/annotation/${doc.id}`,
    type: 'Annotation',
    motivation: 'commenting',
    body: {
      type: 'TextualBody',
      format: 'text/html',
      value: bodyValue,
      label: doc.data.body.label,
    },
    target,
  };

  // seeAlsoを構築
  const seeAlsoItems = buildSeeAlsoItems(doc, newUrl);
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

// pid 指定時、manifest トップに研究プロジェクト情報を付加する
// metadata に Project / Visibility / Description を、seeAlso に projects/<pid> を追加。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addProjectInfoToManifest(data: any, project: ProjectInfo, baseUrl: string): void {
  if (!Array.isArray(data.metadata)) data.metadata = [];
  if (!Array.isArray(data.seeAlso)) data.seeAlso = [];

  data.metadata.push({
    label: { en: ['Research Project'], ja: ['研究プロジェクト'] },
    value: { en: [project.name] },
  });
  data.metadata.push({
    label: { en: ['Project Visibility'], ja: ['プロジェクト公開範囲'] },
    value: { en: [project.visibility] },
  });
  if (project.description) {
    data.metadata.push({
      label: { en: ['Project Description'], ja: ['プロジェクト概要'] },
      value: { en: [project.description] },
    });
  }

  data.seeAlso.push({
    id: `${baseUrl}/projects/${project.id}`,
    type: 'Dataset',
    label: { en: [`Research Project: ${project.name}`] },
    format: 'text/html',
  });
}

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  visibility: string;
}

export const downloadIIIFManifest = async (
  manifestUrl: string,
  firebaseDocuments: NewAnnotation[],
  baseUrl: string,
  objectMetadata?: ObjectMetadata | null,
  regionsMap?: Map<string, Record<string, unknown>>,
  project?: ProjectInfo | null
) => {
  const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

  // マニフェストを取得してラベルを取得
  const data = await fetch(manifestUrl).then((res) => res.json());
  const manifestLabel =
    typeof data.label === 'string'
      ? data.label
      : data.label?.ja?.[0] || data.label?.en?.[0] || data.label?.none?.[0] || 'Manifest';

  // IIIF Presentation v2 を v3 に正規化する。v3 ならそのまま通す。
  // これにより以降の v3 前提コード（data.items[0].annotations 等）が一貫して動作し、
  // 出力 manifest も IIIF Presentation API 3.0 に準拠する。
  normalizeV2ToV3(data);
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(
      `IIIF manifest has no items / sequences[0].canvases — unsupported shape: ${manifestUrl}`
    );
  }

  // アノテーションとGeo featuresを変換。target_canvas 単位にグルーピングする。
  const annotationsByCanvas = new Map<string, IIIFAnnotation[]>();
  const allGeoFeatures: GeoFeature[] = [];

  firebaseDocuments.forEach((doc) => {
    // Object Annotation は領域セレクタを持たないため IIIF 領域アノテとしては出力しない。
    // Object 全体のメタデータは別途 addObjectMetadataToManifest 経由で manifest 直下に載る。
    if ((doc as unknown as { isObjectLevel?: boolean }).isObjectLevel === true) return;
    const { annotation, geoFeatures } = convertAnnotationToIIIF(
      doc,
      newUrl,
      baseUrl,
      manifestLabel,
      manifestUrl,
      regionsMap
    );
    // 紐づけ先 canvas が manifest 内に存在しなければ先頭 canvas にフォールバック。
    const targetCanvas = doc.target_canvas || (data.items[0]?.id as string) || '';
    const bucket = annotationsByCanvas.get(targetCanvas) ?? [];
    bucket.push(annotation);
    annotationsByCanvas.set(targetCanvas, bucket);
    allGeoFeatures.push(...geoFeatures);
  });

  // 各 canvas の annotations に、当該 canvas を target に持つアノテーション群を AnnotationPage として付与する。
  const canvasById = new Map<string, Record<string, unknown>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data.items as any[]).forEach((c) => {
    if (c && typeof c.id === 'string') canvasById.set(c.id, c);
  });

  annotationsByCanvas.forEach((annos, canvasId) => {
    const canvas = canvasById.get(canvasId) ?? data.items[0];
    if (!Array.isArray(canvas.annotations)) canvas.annotations = [];
    canvas.annotations.push({
      id: `${newUrl}/annotationPage/${uuidv4()}`,
      type: 'AnnotationPage',
      items: annos,
    });
  });

  // Geo featuresがある場合、georeferencingのAnnotationPageを先頭 canvas に付与する。
  if (allGeoFeatures.length > 0) {
    const targetCanvas = firebaseDocuments[0]?.target_canvas || (data.items[0]?.id as string) || '';
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
    const hostCanvas = canvasById.get(targetCanvas) ?? data.items[0];
    if (!Array.isArray(hostCanvas.annotations)) hostCanvas.annotations = [];
    hostCanvas.annotations.push(geoAnnotationPage);
  }

  // Objectメタデータを追加
  if (objectMetadata) {
    addObjectMetadataToManifest(data, objectMetadata, baseUrl, manifestLabel);
  }

  // 研究プロジェクト情報を追加（pid 指定時のみ）
  if (project) {
    addProjectInfoToManifest(data, project, baseUrl);
  }

  // RDF APIへのseeAlsoをトップレベルに追加
  const rdfUrl = `${baseUrl}/api/3/${createSlug(manifestUrl)}/rdf`;
  const existingSeeAlso: unknown[] = Array.isArray(data.seeAlso) ? data.seeAlso : [];
  data.seeAlso = [
    ...existingSeeAlso,
    {
      id: rdfUrl,
      type: 'Dataset',
      label: { en: ['RDF/Turtle description'] },
      format: 'text/turtle',
      profile: 'https://www.w3.org/TR/turtle/',
    },
  ];

  return data;
};
