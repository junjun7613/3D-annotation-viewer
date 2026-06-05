# CLAUDE.md — プロジェクト記録

## プロジェクト概要

IIIF Semantic Editor — 文化遺産資料（2D画像・3Dモデル）に対する構造化アノテーションシステム。

- **フレームワーク**: Next.js (App Router)
- **データストア**: Firestore
- **対象資料**: IIIF Presentation API 3.0 準拠マニフェスト（2D・3D）
- **データ出力**: RDF/Turtle、IIIFマニフェスト

---

## アーキテクチャ概要

### Firestore コレクション

| コレクション | 内容 |
|---|---|
| `test` | アノテーション（部分領域・オブジェクト全体） |
| `regions` | 領域ノード（座標情報のみ） |
| `manifest_metadata` | オブジェクトメタデータ（location・thumbnail・label・TEI） |

### アノテーション構造

```
Object（Manifest）
  ├─ ObjectAnnotation（isObjectLevel: true, test コレクション）
  │    ├─ bibliography: [...]
  │    ├─ wikidata: [...]
  │    └─ media: [...]
  └─ Region（regions コレクション）← 座標情報のみ
       ├─ Annotation A（test コレクション）
       │    ├─ bibliography, wikidata, media
       │    └─ relatedAnnotations: [{relation: 'supports'|'challenges'|'supplements'}]
       └─ Annotation B（test コレクション）
```

### キーファイル

```
src/
  types/main.ts                    # 型定義（全リソース型）
  utils/rdf.ts                     # RDF/Turtle 出力
  utils/converter.ts               # IIIF マニフェスト変換
  app/
    atoms/infoPanelAtom.ts         # Jotai atom（パネル状態管理）
    hooks/
      useRelationHierarchy.ts      # JSON から関係階層を取得
      useObjectMetadata.ts         # オブジェクトメタデータ取得
    components/
      ThreeCanvasManifest.tsx      # 3D ビューア
      RegionAnnotationList.tsx     # 領域アノテーション一覧
      RelationTypeSelector.tsx     # 関係性選択 UI（JSON 駆動）
      dialogs/
        BibliographyDialog.tsx
        WikidataDialog.tsx
        MediaDialog.tsx
    editor/
      3d/page.tsx                  # 3D エディタ
      2d/page.tsx                  # 2D エディタ
  lib/services/
    objectMetadata.ts              # objectMetadataService + objectAnnotationService
  app/api/[vol]/[id]/
    manifest/route.ts              # IIIF マニフェスト出力
    rdf/route.ts                   # RDF 出力
scripts/
  migrate-regions.ts               # annotation → regions マイグレーション（実行済み）
  migrate-added-comment.ts         # addedComment 追加（実行済み）
  migrate-object-annotations.ts    # manifest_metadata → test（実行済み）
public/
  ontology/
    relation-hierarchy.json        # 関係性プロパティ階層定義（JSON）
  figures/
    linked-resource-classification.py / .png
    relation-hierarchy.py / .png
```

---

## データモデル

### オントロジー（CHAO v0.1）

`public/ontology/relation-hierarchy.json` に定義。`vocabulary.ttl` としてダウンロード可能。

#### Linked Resource の3分類

- **書誌資料（BibliographicResource）**: Primary Source / Secondary Source / Report
- **典拠データ（AuthorityResource）**: Person / Place / Event / Object / Period / Region / Culture / Language / Script / Concept
- **メディア資料（MediaResource）**: Image（File・IIIF）/ Video（YouTube）/ 3D Model

#### Relation Hierarchy

Direct Relation:
- Generic: `mentions`, `depicts`, `illustrates`
- Bibliographic: `describes`, `reports`, `analyzes`, `catalogues`, `illustrates`, `transcribes`, `translates`
- Authority: `identifies`, `depicts`, `mentions`
- Media: `depicts`, `depicts_part`, `documents`, `measures`, `reproduces`, `illustrates`

Conceptual Relation:
- Bibliographic: `contextualizes`（+ 4サブタイプ）, `compares_with`, `provides_typology`
- Authority: `associated_with`, `classified_as`, `has_type`, `written_in_language`, `uses_script`, `created_by`, `discovered_by`, `discovered_at`
- Media: `contextualizes`（+ 4サブタイプ）, `compares_with`, `illustrates_typology`

#### E13 Attribute Assignment

各リソース紐づけは独立した付与行為として記録：
- `addedBy`: 付与者 UID
- `addedAt`: 付与日時（ms）
- `addedComment`: 補足コメント（crm:P3_has_note）

RDF 出力では `crm:E13_Attribute_Assignment` として記述。

#### アノテーション間関係

同一領域ノードのアノテーション間に付与可能：
- `supports`（支持）
- `challenges`（批判）
- `supplements`（補足）

`oa:motivatedBy` の下位プロパティ。`rdf:Statement` によるリフィケーションで付与者・日時・コメントを記述。

---

## UI フロー

### 3D エディタ

- **ダブルクリック / ポリゴン選択** → 領域ノード作成 → アノテーション入力
- **マーカークリック** → 領域アノテーション一覧表示（全面）→ アノテーション選択 → 詳細
- **マーカー以外をクリック** → オブジェクトレベルアノテーション一覧表示（全面）→ 選択 → 詳細

### 2D エディタ

- **矩形 / ポリゴン選択** → 領域ノード作成 → アノテーション入力
- **マーカークリック** → 領域アノテーション一覧 → 選択 → 詳細
- **マーカー以外をクリック** → オブジェクトレベルアノテーション一覧表示（全面）→ 選択 → 詳細

### アノテーション詳細パネル

Object Annotation / Region Annotation のどちらも **同一の 4 タブ構成**で表示・編集する。選択中アノテーションの種別（`infoPanelContent.isObjectLevel`）はクリック導線で確定済みのため、詳細パネル側にメタタブ（Object/Annotation 切替）は持たない。

- **Resources タブ**: メディア一覧・追加
- **Linked Data タブ**: 典拠（Wikidata / GeoNames）一覧・追加
- **References タブ**: 書誌一覧・追加
- **Location タブ**: 地理座標

編集ハンドラ（`saveWikidata` 等）は `doc(db, 'test', infoPanelContent.id)` を直接更新するため、Object / Region どちらの ID でも動作する。

---

## 主要サービス

### objectAnnotationService（新設）

`src/lib/services/objectMetadata.ts` に定義。

オブジェクト全体を対象とするアノテーション（`isObjectLevel: true`）を `test` コレクションで管理。`getOrCreateObjectAnnotation` で自動作成。

### objectMetadataService（既存）

`manifest_metadata` コレクションを操作。location・thumbnail・label・TEI のみ管理。media/wikidata/bibliography は `objectAnnotationService` に移行済み。

---

## IIIF 出力仕様

- 領域ノード → `oa:SpecificResource`（固有 URI 付与）
- 同一 regionId の2つ目以降のアノテーション → `id` 参照のみ（selector 省略）
- セレクタ変換:
  - 3D点選択 → `PointSelector`
  - 3Dポリゴン → `PolygonZSelector`（WKT）
  - 2D矩形 → `FragmentSelector`（xywh=percent）
  - 2Dポリゴン → `SvgSelector`
- Linked Resource の詳細は IIIF に含まれず RDF に委ねる（共通 URI で相互参照）

---

## RDF 出力仕様

- `oa:Annotation` ≈ `crmdig:D29_Annotation_Object`
- `oa:SpecificResource` ≈ `crmdig:D35_Area`
- `prov:wasAttributedTo` + `prov:generatedAtTime` でアノテーション作成情報を記述
- D30 Annotation Event は不採用（prov-O で代替）
- E13 Attribute Assignment でリソース紐づけの来歴を記述

---

## 未対応・今後の課題

- SearchPanel の `associated_with` 単一化への追従
- `depicts_object/person/place/event` の後方互換処理（旧データのみ）
- `relevant_to_period/region` は旧データ読み取り用として型定義に残存（UI からは削除済み）
- vocabulary.ttl の `provides_typology` の domain を Media まで拡張

### クリーンアップ候補（動作には影響なし）

メタタブ廃止に伴い、以下のコードが未使用化している。削除可能だが、ローカル RDF プレビュー機能との依存関係を確認してから対応する。

- `saveObjectMedia` / `saveObjectWikidata` / `saveObjectBibliography` / `deleteObjectMedia` / `deleteObjectWikidata` / `deleteObjectBibliography`（旧 Object タブ専用ハンドラ）
- Object 専用ダイアログ state (`isObjectMediaDialogOpen` 等) と関連入力 state (`objectSource`, `objectIRI`, `objectBibAuthor` 等)
- `objectTab` state（旧 Object タブ内の sub-tab 切替）
- `useObjectMetadata` の media / wikidata / bibliography マージロジック（ローカル RDF プレビューが依存）

---

## マイグレーション履歴

| スクリプト | 内容 | 状態 |
|---|---|---|
| `migrate-regions.ts` | アノテーション → regions コレクション生成 | 実行済み（151件） |
| `migrate-added-comment.ts` | bibliography/wikidata/media に `addedComment: ""` 追加 | 実行済み（95件） |
| `migrate-object-annotations.ts` | manifest_metadata → test（isObjectLevel: true） | 実行済み（1件） |

---

## Firestore セキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /test/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && request.auth.uid == resource.data.creator;
    }
    match /regions/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && request.auth.uid == resource.data.creator;
    }
    match /manifest_metadata/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
