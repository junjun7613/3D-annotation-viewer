import type { Vector3 } from 'three';
import type { OutputData } from '@editorjs/editorjs';

export interface Annotation {
  id: string;
  creator: string;
  title: string;
  description: string;
  media: [];
  wikidata: [];
  bibliography: [];
  position: {
    x: number;
    y: number;
    z: number;
  };
  target_manifest?: string;
  data: {
    body: {
      value: string;
      label: string;
    };
    target: {
      selector: {
        type: string;
        value: [number, number, number];
        area: [number, number, number];
        camPos: [number, number, number];
      };
    };
  };
}

export interface NewAnnotation {
  id: string;
  creator: string;
  createdAt?: number;
  title: string;
  description: string;
  media: MediaItem[];
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
  location?: LocationItem;
  position: {
    x: number;
    y: number;
    z: number;
  };
  target_manifest: string;
  target_canvas: string;
  data: {
    body: {
      value: OutputData;
      label: string;
      type: string;
    };
    target: {
      selector: {
        type: string;
        value: [number, number, number];
        area: [number, number, number];
        camPos: [number, number, number];
      };
    };
  };
}

export interface IIIFAnnotation {
  id: string;
  type: string;
  motivation: string;
  body: { value: string; label: string; type: string };
  target: Record<string, unknown>;
  seeAlso?: Record<string, unknown>[];
}

// メディアフォーマット種別: 'img' | 'video' | 'iiif' | 'sketchfab'
// メディア役割種別
export type MediaRoleType =
  | ':ObjectMedia'
  | ':ExplanatoryMedia'
  | ':ContextualMedia';

// 参照レベル（直接=インスタンスレベル / 間接=カテゴリレベル）
export type ReferenceLevel =
  | ':DirectReference'
  | ':IndirectReference';

export interface MediaItem {
  id: string;
  type: string; // 'img' | 'video' | 'iiif' | 'sketchfab'
  source: string;
  caption: string;
  manifestUrl?: string;
  canvasId?: string;
  roleType?: MediaRoleType;       // 未設定時のデフォルト: ':ObjectMedia'
  referenceLevel?: ReferenceLevel; // 未設定時のデフォルト: ':DirectReference'
}

export type WikidataProperty = 'crm:P67_refers_to';

// 典拠役割種別
export type AuthorityRoleType =
  | ':ObjectAuthority'
  | ':GeographicAuthority'
  | ':DepictedPlace'
  | ':FoundAt'
  | ':ProducedAt'
  | ':OriginatedAt'
  | ':DepictedAt';

export interface WikidataItem {
  type: string; // 'wikidata' | 'geonames'
  label: string;
  uri: string;
  wikipedia?: string;
  lat?: string;
  lng?: string;
  thumbnail?: string;
  property?: WikidataProperty;
  roleType?: AuthorityRoleType;    // 未設定時のデフォルト: ':ObjectAuthority'
  referenceLevel?: ReferenceLevel; // 未設定時のデフォルト: ':DirectReference'
}

// 書誌役割種別（BibliographyPropertyを置き換え）
export type BibliographyRoleType =
  | ':PrimarySource'
  | ':ResearchLiterature'
  | ':SurveyReport';

// 後方互換のため残す
export type BibliographyProperty =
  | 'crm:P70_documents'
  | 'crm:P67_refers_to';

export interface BibliographyItem {
  id: string;
  author: string;
  title: string;
  year: string;
  page?: string;
  pdf?: string;
  property?: BibliographyProperty; // 既存データの後方互換用
  roleType?: BibliographyRoleType;  // 未設定時のデフォルト: ':PrimarySource'
  referenceLevel?: ReferenceLevel;  // 未設定時のデフォルト: ':DirectReference'
  containerTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
}

export interface LocationItem {
  lat: string;
  lng: string;
}

export interface InfoPanelContent {
  id: string;
  creator: string;
  title: string;
  description: string;
  media: MediaItem[];
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
  location?: LocationItem;
}

export interface Annotation3 {
  id: string;
  position: Vector3;
  content: string;
  cameraPosition: Vector3;
  targetPosition: Vector3;
}

export interface TeiLineMapping {
  lineNumber: string;
  lineText: string;
  annotationId: string | null;
}

export interface TeiLineMappingMap {
  [lineNumber: string]: TeiLineMapping;
}

export interface ObjectMetadata {
  manifest_url: string;
  thumbnail_url?: string;
  manifest_label?: string;
  media: MediaItem[];
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
  location?: LocationItem;
  lastUpdatedBy?: string;
  updatedAt?: number;
  tei_original?: string;
  tei_sourcedoc?: string;
  tei_line_mappings?: TeiLineMappingMap;
}
