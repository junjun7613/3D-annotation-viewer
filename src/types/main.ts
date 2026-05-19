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

// Direct Authority Relations
export type DirectAuthorityRelation =
  // identity_relation
  | ':identifies'
  // depiction_relation
  | ':depicts_object'
  | ':depicts_person'
  | ':depicts_place'
  | ':depicts_event'
  // textual_reference_relation
  | ':mentions_person'
  | ':mentions_place'
  | ':mentions_event';

// Conceptual Authority Relations
export type ConceptualAuthorityRelation =
  // contextual_relation
  | ':associated_with_period'
  | ':associated_with_region'
  | ':associated_with_person'
  | ':associated_with_culture'
  // conceptual_relation
  | ':compared_with'
  | ':related_to_concept'
  // classification_relation
  | ':classified_as'
  | ':has_type'
  // linguistic_relation
  | ':written_in_language'
  | ':uses_script'
  // event_relation
  | ':created_by'
  | ':discovered_by'
  | ':discovered_at';

export type AuthorityRelationType = DirectAuthorityRelation | ConceptualAuthorityRelation;

export interface WikidataItem {
  type: string; // 'wikidata' | 'geonames'
  label: string;
  uri: string;
  wikipedia?: string;
  lat?: string;
  lng?: string;
  thumbnail?: string;
  property?: WikidataProperty;
  relationTypes?: AuthorityRelationType[]; // 接続の性質（multi-label）
  // 後方互換用（旧データ読み取りのみ）
  roleType?: string;
  referenceLevel?: string;
}

// 書誌役割種別（文書自体のタイプ）
export type BibliographyRoleType =
  | ':PrimarySource'
  | ':ResearchLiterature'
  | ':SurveyReport';

// 後方互換のため残す
export type BibliographyProperty =
  | 'crm:P70_documents'
  | 'crm:P67_refers_to';

// 書誌関係性プロパティ（接続の性質）
// Direct Bibliographic Relation
export type DirectBibliographicRelation =
  | ':mentions'
  | ':describes'
  | ':reports'
  | ':analyzes'
  | ':catalogues'
  | ':illustrates'
  | ':transcribes'
  | ':translates';

// Conceptual Bibliographic Relation
export type ConceptualBibliographicRelation =
  | ':contextualizes'
  | ':discusses_related_concept'
  | ':compares_with'
  | ':provides_typology'
  | ':relevant_to_period'
  | ':relevant_to_region'
  | ':associated_with_person';

export type BibliographicRelationType =
  | DirectBibliographicRelation
  | ConceptualBibliographicRelation;

export interface BibliographyItem {
  id: string;
  author: string;
  title: string;
  year: string;
  page?: string;
  pdf?: string;
  property?: BibliographyProperty;      // 既存データの後方互換用
  roleType?: BibliographyRoleType;      // 文書タイプ（デフォルト: ':PrimarySource'）
  relationTypes?: BibliographicRelationType[]; // 接続の性質（multi-label）
  referenceLevel?: ReferenceLevel;      // 後方互換用（新規データはrelationTypesで表現）
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
