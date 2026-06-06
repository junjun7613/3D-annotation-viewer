import type { Vector3 } from 'three';

// relation-hierarchy.json のノード型
export interface RelationNode {
  id: string;
  label: string;
  desc?: string;
  examples?: string[];
  resourceType?: 'bibliography' | 'authority' | 'media';
  children?: RelationNode[];
}

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

// アノテーション間のメタ関係性
export type AnnotationRelationType = 'supports' | 'challenges' | 'supplements';

export interface AnnotationRelation {
  annotationId: string;           // 関係先アノテーションID
  relation: AnnotationRelationType;
  comment?: string;               // 関係付けの補足説明
  createdBy?: string;             // 付与者 UID
  createdAt?: number;             // 付与日時（ms）
}

export interface NewAnnotation {
  id: string;
  creator: string;
  createdAt?: number;
  regionId?: string;              // 領域ノードへの参照（部分領域アノテーション）
  isObjectLevel?: boolean;        // オブジェクト全体を対象とするアノテーション
  relatedAnnotations?: AnnotationRelation[]; // アノテーション間関係
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
      value: string;     // Markdown 文字列（CommonMark）
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

// 領域ノード — 位置情報のみを持ち、複数アノテーションが参照する
export interface Region {
  id: string;
  creator: string;
  createdAt?: number;
  target_manifest: string;
  target_canvas: string;
  selector: {
    type: string;                        // '3DSelector' | 'PolygonSelector' | '2DRectSelector' | '2DPolygonSelector'
    value?: [number, number, number];    // 3D座標
    area?: number[];                     // 3Dポリゴン頂点 / 2D座標列
    camPos?: [number, number, number];   // カメラ位置（3D）
    x?: number; y?: number;             // 2D矩形
    width?: number; height?: number;
    points?: { x: number; y: number }[]; // 2Dポリゴン
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
  relationTypes?: MediaRelationType[]; // 接続の性質（CHAO §6）
  addedBy?: string;      // E13: 付与者 UID
  addedAt?: number;      // E13: 付与日時（ms）
  addedComment?: string; // 付与者コメント（crm:P3_has_note）
  // 後方互換用（旧データ読み取りのみ）
  roleType?: MediaRoleType;
  referenceLevel?: ReferenceLevel;
}

// Media 関係性プロパティ（JSON relation-hierarchy.json の media ノードに対応）
export type MediaDirectRelation =
  | ':depicts'
  | ':depicts_part'
  | ':documents'
  | ':measures'
  | ':reproduces'
  | ':illustrates';

export type MediaConceptualRelation =
  | ':contextualizes'
  | ':concept_contextualization'
  | ':period_contextualization'
  | ':region_contextualization'
  | ':person_contextualization'
  | ':compares_with'
  | ':illustrates_typology';

export type MediaRelationType = MediaDirectRelation | MediaConceptualRelation;

export type WikidataProperty = 'crm:P67_refers_to';

// Direct Authority Relations（JSON の direct.authority ノードに対応）
export type DirectAuthorityRelation =
  // identity_relation
  | ':identifies'
  // representation_relation
  | ':depicts'
  // reference_relation
  | ':mentions'
  // 後方互換用（旧データ読み取りのみ）
  | ':depicts_object'
  | ':depicts_person'
  | ':depicts_place'
  | ':depicts_event'
  | ':mentions_person'
  | ':mentions_place'
  | ':mentions_event';

// Conceptual Authority Relations（JSON の conceptual.authority ノードに対応）
export type ConceptualAuthorityRelation =
  | ':associated_with'
  | ':classified_as'
  | ':has_type'
  | ':written_in_language'
  | ':uses_script'
  | ':created_by'
  | ':discovered_by'
  | ':discovered_at'
  // 後方互換用（旧データ読み取りのみ）
  | ':associated_with_period'
  | ':associated_with_region'
  | ':associated_with_person'
  | ':associated_with_culture'
  | ':contextualizes'
  | ':compares_with'
  | ':related_to_concept';

export type AuthorityRelationType = DirectAuthorityRelation | ConceptualAuthorityRelation;

// CHAO §7 Authority Entity Model — こちら側で統制するカテゴリ
export type AuthorityEntityType =
  | ':Person'
  | ':Place'
  | ':Event'
  | ':Object'
  | ':Period'
  | ':Region'
  | ':Culture'
  | ':Language'
  | ':Script'
  | ':Concept';

export interface WikidataItem {
  type: string; // 'wikidata' | 'geonames'
  label: string;
  uri: string;
  wikipedia?: string;
  lat?: string;
  lng?: string;
  thumbnail?: string;
  property?: WikidataProperty;
  entityType?: AuthorityEntityType;        // CHAO §7 エンティティ種別
  relationTypes?: AuthorityRelationType[]; // 接続の性質（multi-label）
  addedBy?: string;      // E13: 付与者 UID
  addedAt?: number;      // E13: 付与日時（ms）
  addedComment?: string; // 付与者コメント（crm:P3_has_note）
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

// 書誌関係性プロパティ（JSON の bibliography ノードに対応）
// Direct
export type DirectBibliographicRelation =
  | ':mentions'
  | ':describes'
  | ':reports'
  | ':analyzes'
  | ':catalogues'
  | ':illustrates'
  | ':transcribes'
  | ':translates';

// Conceptual
export type ConceptualBibliographicRelation =
  | ':contextualizes'
  | ':concept_contextualization'
  | ':period_contextualization'
  | ':region_contextualization'
  | ':person_contextualization'
  | ':compares_with'
  | ':provides_typology'
  // 後方互換用（旧データ読み取りのみ）
  | ':discusses_related_concept'
  | ':relevant_to_period'
  | ':relevant_to_region'
  | ':relevant_to_person'
  | ':associated_with_period'
  | ':associated_with_region'
  | ':associated_with_person'
  | ':associated_with_culture'
  | ':related_to_concept';

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
  addedBy?: string;      // E13: 付与者 UID
  addedAt?: number;      // E13: 付与日時（ms）
  addedComment?: string; // 付与者コメント（crm:P3_has_note）
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
  createdAt?: number;
  title: string;
  description: string;
  media: MediaItem[];
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
  location?: LocationItem;
  relatedAnnotations?: AnnotationRelation[];
}

// 領域ノード選択時のパネル状態（アノテーション一覧モード）
export interface RegionPanelContent {
  regionId: string;
  annotations: InfoPanelContent[];
}

export interface Annotation3 {
  id: string;
  position: Vector3;
  content: string;
  cameraPosition: Vector3;
  targetPosition: Vector3;
}

/**
 * TEI 要素 ↔ 領域ノードの紐付け。
 * elementId は対象要素の `xml:id`、ただし lb は xml:id を持たないことが多いため `lb#<@n>` を採用する。
 * elementType は TEI のタグ名（例: 'lb' | 'persName' | 'placeName' | 'w' | ...）。
 */
export interface TeiElementMapping {
  elementId: string;
  elementType: string;
  label: string;       // 表示用の短いラベル（行テキスト、要素テキスト等）
  regionId: string | null;
}

export interface TeiElementMappingMap {
  [elementId: string]: TeiElementMapping;
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
  tei_element_mappings?: TeiElementMappingMap;
}
