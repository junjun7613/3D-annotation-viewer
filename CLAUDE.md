# CLAUDE.md — プロジェクト記録

IIIF Semantic Editor — 文化遺産資料（2D画像・3Dモデル）に対する構造化アノテーションシステム。

- **フレームワーク**: Next.js (App Router) / **データストア**: Firestore
- **対象**: IIIF Presentation API 3.0 マニフェスト（2D・3D）
- **出力**: RDF/Turtle、IIIF マニフェスト

---

## アーキテクチャ

### Firestore コレクション

| コレクション | 内容 |
|---|---|
| `test` | アノテーション（部分領域・オブジェクト全体） |
| `regions` | 領域ノード（座標情報のみ・プロジェクト横断の公開資産） |
| `manifest_metadata` | オブジェクトメタデータ（location・thumbnail・label・TEI） |
| `projects` + `projects/{pid}/members` | プロジェクト・メンバー |

### アノテーション構造

```
Object（Manifest）
  ├─ ObjectAnnotation（isObjectLevel: true, test コレクション）
  │    ├─ bibliography / wikidata / media
  └─ Region（regions コレクション）← 座標のみ
       ├─ Annotation A（test コレクション）
       │    ├─ bibliography / wikidata / media
       │    └─ relatedAnnotations: [{relation: 'supports'|'challenges'|'supplements'}]
       └─ Annotation B
```

各アノテーション: `researchProjectId` で `projects/{pid}` に所属。

### 主要ディレクトリ

```
src/
  types/main.ts                    # 型定義
  utils/rdf.ts / converter.ts / markdown.ts  # RDF / IIIF / Markdown 出力
  app/
    atoms/                         # Jotai atoms（infoPanel, currentProject など）
    hooks/                         # useCurrentProject, useObjectMetadata, useIIIFThumbnails 等
    components/                    # ProjectSwitcher, RegionAnnotationList, dialogs/ 等
    editor/{2d,3d,textual}/page.tsx
    projects/[pid]/page.tsx        # プロジェクト個別画面
    api/                           # IIIF / RDF 出力、プロジェクト招待
  lib/services/                    # objectMetadata, objectAnnotation, projects
scripts/                           # マイグレーション群（docs/migrations.md 参照）
public/ontology/relation-hierarchy.json  # 関係性プロパティ階層
```

---

## データモデル（CHAO v0.1）

定義: `public/ontology/relation-hierarchy.json`（`vocabulary.ttl` としてダウンロード可能）。

### Linked Resource の3分類

- **書誌（BibliographicResource）**: Primary / Secondary / Report
- **典拠（AuthorityResource）**: Person / Place / Event / Object / Period / Region / Culture / Language / Script / Concept
- **メディア（MediaResource）**: Image（File・IIIF）/ Video（YouTube）/ 3D Model

### Relation Hierarchy

- **Direct**: `mentions`, `depicts`, `illustrates` 系（書誌/典拠/メディアで個別語彙あり）
- **Conceptual**: `contextualizes`（+4サブ）, `compares_with`, `provides_typology`, `associated_with`, `classified_as` 等

詳細は `relation-hierarchy.json` を直接参照。

### E13 Attribute Assignment

各リソース紐づけは独立した付与行為として記録：`addedBy` / `addedAt` / `addedComment`。RDF では `crm:E13_Attribute_Assignment` として記述。

### アノテーション間関係

同一領域ノードのアノテーション間：`supports` / `challenges` / `supplements`（`oa:motivatedBy` の下位）。`rdf:Statement` リフィケーションで付与者・日時・コメントを記述。

---

## UI フロー

### 2D / 3D エディタ

- 矩形・ポリゴン・ダブルクリック → 領域ノード作成 → アノテーション入力
- マーカークリック → 領域アノテーション一覧 → 選択 → 詳細
- マーカー以外クリック → オブジェクトレベルアノテーション一覧 → 選択 → 詳細

### アノテーション詳細パネル

Object / Region どちらも**同一の 4 タブ構成**：

- **Resources**（メディア）/ **Linked Data**（典拠）/ **References**（書誌）/ **Location**（地理座標）

種別はクリック導線で確定済みのため、詳細パネル側にメタタブはない。編集ハンドラは `doc(db, 'test', infoPanelContent.id)` を直接更新するので Object / Region どちらの ID でも動作する。

### Textual エディタ

TEI XML と領域ノードのリンク管理。詳細: [docs/textual-editor.md](docs/textual-editor.md)

---

## サービス層

- **objectAnnotationService**（`src/lib/services/objectMetadata.ts`）: `test` コレクションの `isObjectLevel: true` を管理。`getOrCreateObjectAnnotation(manifestUrl, userId, researchProjectId)` で自動作成
- **objectMetadataService**（同ファイル）: `manifest_metadata` コレクション（location / thumbnail / label / TEI のみ）
- **projectService / projectMemberService**（`src/lib/services/projects.ts`）: プロジェクト CRUD + 権限ヘルパ（`canEdit` / `canView` / `canManageProject`）

---

## IIIF 出力仕様

- 領域ノード → `oa:SpecificResource`（固有 URI、`target.id = .../region/{regionId}`）
- 同一 regionId を共有するアノテーションも、各々が独立に valid な `SpecificResource`（`id` + `source` + `selector` を完全展開）として出力。既存 IIIF ビューア互換のため selector を冗長に複製し、領域 URI による集約は RDF 側に委ねる
- セレクタ:
  - 3D 点 → `PointSelector` / 3D ポリゴン → `PolygonZSelector`（WKT）
  - 2D 矩形 → `FragmentSelector`（xywh=percent）/ 2D ポリゴン → `SvgSelector`
- Linked Resource 詳細は IIIF に含めず RDF に委ねる（共通 URI で相互参照）

---

## RDF 出力仕様

- `oa:Annotation` ≈ `crmdig:D29_Annotation_Object`
- `oa:SpecificResource` ≈ `crmdig:D35_Area`
- `prov:wasAttributedTo` + `prov:generatedAtTime` でアノテーション作成情報
- D30 Annotation Event は不採用（prov-O で代替）
- E13 Attribute Assignment でリソース紐づけの来歴
- 本文 Markdown から `cito:cites` / `cito:discusses` を自動抽出（CiTO）

---

## Description（本文）の Markdown 化

annotation 本文は CommonMark + GFM の Markdown 文字列。`[label](#bib/<id>)` / `[label](#auth/<id>)` / `![caption](#media/<id>)` で同一アノテーションの紐づきリソースを参照できる。

詳細（エディタ・レンダラ・サムネ解決・スタイル）: [docs/description-markdown.md](docs/description-markdown.md)

---

## 研究プロジェクト所有モデル

アノテーションの所有・編集権限は**プロジェクト単位**（`projects/{pid}` + `members/{uid}` サブコレクション、ロール `owner` / `editor` / `viewer`）。

- URL: `/editor/{2d,3d,textual}?manifest=...&pid=xxx`
- pid は `useCurrentProject` フック経由で URL クエリから取得 + Jotai atom にキャッシュ
- 領域マーカーはプロジェクト横断で表示、領域クリック時のアノテ一覧は現プロジェクトのみ
- pid なし / 編集権限なしは読み取り専用モード（バナー表示 + 新規作成抑制）

Phase 1 / Phase 2 実装の経緯と未実施作業（ルールデプロイ）: [docs/projects-migration.md](docs/projects-migration.md)

---

## Firestore セキュリティルール

現在は旧ルール（creator ベース）が本番デプロイ済み。新ルール（プロジェクト所有モデル）は `firestore.rules.draft` に準備済み・未デプロイ。

詳細: [docs/firestore-rules.md](docs/firestore-rules.md)

---

## マイグレーション

スクリプト一覧・実行履歴: [docs/migrations.md](docs/migrations.md)

---

## 未対応・課題

- **Textual エディタのテキスト ↔ 領域リンクが動作しない**（保留中、詳細: [docs/textual-editor.md](docs/textual-editor.md)）
- Phase 2 ルールデプロイ未実施（詳細: [docs/projects-migration.md](docs/projects-migration.md)）
- SearchPanel の `associated_with` 単一化への追従
- `depicts_object/person/place/event` の後方互換処理（旧データのみ）
- `relevant_to_period/region` は型定義に残存（UI 削除済み）
- vocabulary.ttl の `provides_typology` の domain を Media まで拡張

### クリーンアップ候補（動作には影響なし）

メタタブ廃止に伴い lint を通っているが実質未使用：

- Object 専用ダイアログ（`isObjectMediaDialogOpen` 等）と関連 state — 開く導線なし
- Object 専用保存ハンドラ（`saveObjectMedia` 等） — 上記ダイアログ内のみ参照
- `useObjectMetadata` の media/wikidata/bibliography マージロジック — ローカル RDF プレビューが依存
