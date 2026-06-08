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
  utils/markdown.ts                # Markdown レンダラ / CiTO リンク抽出
  app/
    atoms/infoPanelAtom.ts         # Jotai atom（パネル状態管理）
    hooks/
      useRelationHierarchy.ts      # JSON から関係階層を取得
      useObjectMetadata.ts         # オブジェクトメタデータ取得
      useIIIFThumbnails.ts         # IIIF manifest → サムネ URL 解決（モジュール内キャッシュ）
    components/
      ThreeCanvasManifest.tsx      # 3D ビューア
      RegionAnnotationList.tsx     # 領域アノテーション一覧
      RelationTypeSelector.tsx     # 関係性選択 UI（JSON 駆動）
      TEILinkViewer.tsx            # TEI テキスト + 要素ハイライト（textual エディタで使用）
      dialogs/
        BibliographyDialog.tsx
        WikidataDialog.tsx
        MediaDialog.tsx
        DescriptionDialog.tsx      # Markdown エディタ + Insert ピッカー（書誌/典拠/メディア）
    editor/
      3d/page.tsx                  # 3D エディタ
      2d/page.tsx                  # 2D エディタ
      textual/page.tsx             # Textual エディタ（TEI ↔ 領域ノードリンク）
  lib/services/
    objectMetadata.ts              # objectMetadataService + objectAnnotationService
  app/api/[vol]/[id]/
    manifest/route.ts              # IIIF マニフェスト出力
    rdf/route.ts                   # RDF 出力
scripts/
  migrate-regions.ts               # annotation → regions マイグレーション（実行済み）
  migrate-added-comment.ts         # addedComment 追加（実行済み）
  migrate-object-annotations.ts    # manifest_metadata → test（実行済み）
  migrate-tei-elements.ts          # tei_line_mappings → tei_element_mappings（要素ベース）
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

## Textual エディタ（`/editor/textual`）

TEI XML と領域ノードのリンクを管理する独立画面（実装済み）。

### 画面構成

- 左 5：マニフェストタイプに応じた 2D 画像 or 3D モデルビューア（自動判定）
- 右 5：TEI テキスト（`TEILinkViewer`）。上部に「選択中 region」インジケータと「要素タイプフィルタ」
- ナビ：2D/3D エディタ ↔ Textual を相互リンク

### 動作

- 領域マーカー（`regions` コレクション）は**表示のみ**。作成・編集・削除は 2D/3D 側で行う
- マーカークリック → `regionPanelAtom` に regionId が入る → 接続可能要素（タイプフィルタで ON のもの）をクリックでリンク作成
- Unlink：リンク済みマーカーのダブルクリックで Unlink ポップオーバー
- 連動ハイライト：
  - 要素クリック → リンク先 region のマーカーをハイライト（`ThreeCanvas.focusRegionId` / `TwoDCanvas.focusAnnotationId`）
  - マーカークリック → リンク先要素をハイライト
- アノテーション一覧 / 詳細は表示しない（領域ノード単位のみ）

### 接続対象要素

行（`<lb>`）に限らず、TEI 文書中で **`xml:id` を持つ任意の要素**（`<persName>`, `<placeName>`, `<w>`, `<seg>` 等）を接続対象にできる。`<lb>` は xml:id を持たないことが多いため `@n` を `lb#<n>` 形式で id 代わりに採用。

UI：TEI ビューア上部に「Element types」フィルタ chip 群を表示。XML 読み込み時に検出した要素タイプを列挙し、ON のタイプのみマーカーが可視化される。デフォルトは `lb` のみ ON。

### マニフェストタイプ判定

`detectManifestType()` が IIIF JSON を fetch し、`canvas.items[0].items[0].body.format` / `type` から `model/*` ⇒ 3D、`image/*` ⇒ 2D を判定。IIIF v2 の `images[0].resource.format` にもフォールバック。

### データモデル

`manifest_metadata.tei_element_mappings` の値は `{ elementId, elementType, label, regionId }`。
- `elementId`: `xml:id`（`<lb>` は `lb#<@n>`）
- `elementType`: TEI タグ名（`'lb' | 'persName' | 'placeName' | 'w' | ...`）
- `label`: 表示用の短いテキスト
- `regionId`: `regions` コレクションのドキュメント ID

旧データ（`tei_line_mappings` / `annotationId`）は `scripts/migrate-tei-elements.ts` で一括変換する：

```bash
npx tsx scripts/migrate-tei-elements.ts --dry-run
npx tsx scripts/migrate-tei-elements.ts
```

### Export（`<sourceDoc>`）

`teiGenerator.ts` の `<zone type="line">` 生成は `elementType='lb'` のマッピングのみを対象とする（既存挙動）。`<lb>` 以外の要素は将来的に本文側 `corresp` 付与等で扱う余地を残してある。

### 2D / 3D エディタからの除去

`TEILinkViewer` 表示・`useTeiLinking` フック・`useObjectMetadata` の TEI 関連戻り値・TEI ハンドラを撤去。Description カードは横幅いっぱい。

---

## Description（本文）の Markdown 化

annotation 本文は **CommonMark + GFM** の Markdown 文字列で保持する（実装済み）。

### データモデル

```ts
data: { body: { value: string; label: string; type: string } }  // value = Markdown
```

### エディタ

- **ライブラリ**: `@uiw/react-md-editor`（split / live / preview モード、ツールバー付き）
- **コンポーネント**: [src/app/components/dialogs/DescriptionDialog.tsx](src/app/components/dialogs/DescriptionDialog.tsx)
- 2D / 3D エディタの「Description」ペン編集ボタンから呼び出される
- ライブプレビュー（右ペイン）は MDEditor の `components.preview` slot を差し替え、`renderMarkdown` で生成したカスタム HTML を表示。これによりプレビューも本番カードと完全に同じ見た目になる

### Linked Resource 参照・埋め込み

Markdown 本文中から、同じアノテーションに紐づく書誌 / 典拠 / メディアを参照できる。CommonMark のリンク・画像構文を流用。

| リソース種別 | 記法 | 例 |
|---|---|---|
| 書誌 | `[label](#bib/<id>)` | `[Smith 2020](#bib/abc123)` |
| 典拠 | `[label](#auth/<id>)` | `[Tokyo](#auth/xyz789)` |
| メディア | `![caption](#media/<id>)` | `![出土状況](#media/def456)` |

`<id>` は当該アノテーションの `bibliography[].id` / `wikidata[].id` / `media[].id`。

**ピッカー UI**: DescriptionDialog 上部の「Insert: Bibliography / Authority / Media」ボタン。クリックすると現アノテーションの紐づきリストがポップオーバーで開き、選択でカーソル位置に Markdown を挿入する。Media は `![img]` / `[link]` どちらの形式でも挿入可。

**レンダリング**: [src/utils/markdown.ts](src/utils/markdown.ts) の `renderMarkdown(markdown, ctx)` がカスタムレンダラで `#bib/` `#auth/` `#media/` を判定：

| 種別 | 描画 |
|---|---|
| `#bib/<id>` | `<span class="md-ref md-ref-bib">` 黄バッジ + tooltip（著者 "タイトル" (年)）。`bib.page` がある場合は `<a target="_blank">` で外部リンク化 |
| `#auth/<id>` | `<span class="md-ref md-ref-auth">` 青バッジ + tooltip（label + uri）。`wikidata.uri` がある場合は `<a target="_blank">` で外部リンク化 |
| `![caption](#media/<id>)` | メディア種別ごとにサムネイル付き `<figure class="md-embed-media">` を生成 |
| `[caption](#media/<id>)` | `<span class="md-ref md-ref-media">` バッジ |

### メディアサムネイル解決

| メディア種別 | サムネイル URL の解決 |
|---|---|
| `img` | `media.source` をそのまま `<img>` の `src` に |
| `video` | `media.source` から YouTube ID を抽出（`youtu.be/<id>`, `?v=<id>`, `youtube.com/embed/<id>` 形式に対応）→ `https://img.youtube.com/vi/<id>/mqdefault.jpg` |
| `iiif` | [src/app/hooks/useIIIFThumbnails.ts](src/app/hooks/useIIIFThumbnails.ts) が `manifestUrl` を fetch → v3/v2 両対応で `thumbnail` を解決。失敗時は紫グラデーションの "IIIF" プレースホルダ |
| `sketchfab` | サムネ URL を簡易取得できないため、常にティール→ブルーのグラデーションで "3D" プレースホルダ |

`useIIIFThumbnails` はモジュールスコープの Map にキャッシュを持ち、同一 manifest の再 fetch を回避する。

### クリック挙動（Description 表示中）

Description カード / DescriptionDialog プレビューの両方で:

- **メディアサムネ** (`figure.md-embed-media`) クリック → 2D/3D エディタが持つ既存の `setSelectedImage` / `setSelectedVideo` / `setSelectedIIIF` / `setSelectedSketchFab` を呼び、Mirador / YouTube embed / Sketchfab embed / 拡大画像のフルスクリーン dialog を開く（Resources タブと同じ UX）
- **書誌・典拠バッジ** クリック → 外部 URL を新規タブで開く（`bib.page` または `wikidata.uri` がある場合）。無い場合はバッジのみ表示
- ホバー：サムネは浮き上がり効果、バッジは brightness アップ

### RDF 出力（CiTO リンク抽出）

[src/utils/rdf.ts](src/utils/rdf.ts) は本文 Markdown を走査して `cito:` トリプルを追加：

```turtle
@prefix cito: <http://purl.org/spar/cito/> .

<annotation/<id>> a oa:Annotation ;
  schema:description "..." ;
  cito:cites <bib/abc123> ;          # [..](#bib/<id>)
  cito:discusses <wikidata-uri> .    # [..](#auth/<id>)
```

`extractResourceRefs(markdown)` で参照 ID を 3 分類に抽出。Annotation に紐づいているリソースのみが triple 化される（未紐付け参照は破棄）。メディア参照はリソース側を主語にする既存方針に揃え、Annotation 直接の triple には追加しない。

### IIIF 出力

[src/utils/converter.ts](src/utils/converter.ts) の `convertAnnotationToIIIF` も Markdown を `renderMarkdown` で HTML 化し、`body.value` にセット。

### マイグレーション

旧データ（Editor.js JSON `{ blocks: [...] }`）を Markdown 文字列に一括変換：

```bash
npx tsx scripts/migrate-description-to-markdown.ts --dry-run
npx tsx scripts/migrate-description-to-markdown.ts
```

| Editor.js ブロック | Markdown 変換 |
|---|---|
| `paragraph` | 段落そのまま（`<br>` は改行に） |
| `header` (level N) | `#` × N + テキスト |
| `list` (unordered) | `- ` 付きリスト |
| `list` (ordered) | `1. ` 付きリスト |

新形式（string）のみが残るため、コードに後方互換分岐は残していない。

### スタイル

[src/app/globals.css](src/app/globals.css) の `.description-content` 配下に Markdown 要素（h1-h6 / p / ul / ol / blockquote / code / pre / hr / table / img / del / strong / em / task list）のスタイルを追加。リソース参照用のクラス：

- `.md-ref-bib` (黄) / `.md-ref-auth` (青) / `.md-ref-media` (紫) — バッジ
- `.md-ref-link` — バッジを外部リンクで包んだ際の `<a>` ラッパ（下線・border-bottom を抑制、hover で brightness up）
- `.md-embed-media` — サムネイル付き figure（hover 効果あり）
- `.md-embed-iiif` / `.md-embed-sketchfab` — プレースホルダ（グラデーション + アイコン + ラベル）

### 依存

- 追加: `@uiw/react-md-editor`, `marked`
- 削除: `@editorjs/editorjs`, `@editorjs/header`, `@editorjs/list`, `editorjs-html`

---

## 未対応・今後の課題

- **Textual エディタのテキスト ↔ 領域リンクが動作しない（保留中）**
  - 症状：TEI ビューア上の鎖マーカー（lb / xml:id 要素）をクリックしても、region 選択時のリンク作成・既リンク要素のハイライト連動が発火しない
  - 試したこと：
    - `decorateXmlIdElements` のセレクタを `[xml\\:id]` → `[id]`（CETEIcean が `xml:id` を HTML `id` に変換するため）に修正
    - リンク済みマーカーの single click の早期 return を解除し、親に常時通知するよう変更
    - 上記でも依然として未動作。クリックイベント自体が `<span data-element-id>` まで到達していない可能性、または `onElementClickRef.current` 経由の伝播が切れている可能性が高い
  - 次に試すべき切り分け：
    1. ブラウザの DevTools で `[data-element-id]` の存在と click リスナー登録を確認
    2. `marker.addEventListener('click', ...)` の中に `console.log` を仕込んで発火有無を確認
    3. CETEIcean の Custom Elements が click を捕捉していないか（`pointerdown` 等で代替する必要があるか）
    4. `tei-lb` など Custom Element 上で `firstChild` への span 挿入が再レンダーで失われていないか
  - TEI 表示・保存・要素タイプフィルタ表示・マニフェスト判定は問題なく動作。リンク機能のみが未動作。
- SearchPanel の `associated_with` 単一化への追従
- `depicts_object/person/place/event` の後方互換処理（旧データのみ）
- `relevant_to_period/region` は旧データ読み取り用として型定義に残存（UI からは削除済み）
- vocabulary.ttl の `provides_typology` の domain を Media まで拡張

### クリーンアップ候補（動作には影響なし）

メタタブ廃止に伴い lint エラーになっていた未使用シンボルは削除済み（`saveObjectLocation`, `deleteObject*`, `editObject*`, `objectTab` state, `setObjectLocationLat/Lng` 構造分割）。以下は state 読み取りや JSX 参照により lint を通っているが実質未使用：

- Object 専用ダイアログ (`isObjectMediaDialogOpen`, `isObjectWikidataDialogOpen`, `isObjectBibDialogOpen` 等) と関連入力 state (`objectSource`, `objectIRI`, `objectBibAuthor` 等) — ダイアログ自体を開く導線が無いため到達不可
- Object 専用保存ハンドラ (`saveObjectMedia`, `saveObjectWikidata`, `saveObjectBibliography`) — 上記ダイアログ内でのみ参照される
- `useObjectMetadata` の media / wikidata / bibliography マージロジック — ローカル RDF プレビューが依存しているため要注意

---

## マイグレーション履歴

| スクリプト | 内容 | 状態 |
|---|---|---|
| `migrate-regions.ts` | アノテーション → regions コレクション生成 | 実行済み（151件） |
| `migrate-added-comment.ts` | bibliography/wikidata/media に `addedComment: ""` 追加 | 実行済み（95件） |
| `migrate-object-annotations.ts` | manifest_metadata → test（isObjectLevel: true） | 実行済み（1件） |
| `migrate-tei-elements.ts` | tei_line_mappings → tei_element_mappings | 未実行 |
| `migrate-description-to-markdown.ts` | body.value: Editor.js JSON → Markdown 文字列 | 未実行 |
| `migrate-to-projects.ts` | creator ごとに Project を作成、test に `researchProjectId` 付与 | 実行済み（2026-06-07、154件） |
| `delete-empty-projects.ts` | 指定 email ユーザーが作成したアノテ 0 件プロジェクトを削除（`--dry-run`/`--yes` 対応） | 随時 |
| `backup-firestore.ts` | 全コレクションのスナップショットを `.firestore-backups/` に保存 | 随時 |

---

## 研究プロジェクト所有モデル移行（進行中）

アノテーションの所有・編集権限を **ユーザー単位 → 研究プロジェクト単位**に移行する作業。Phase 1（バックエンド準備 + マイグレーション）完了済み、Phase 2（UI 改修）の実装が完了。**ルールデプロイ（Step 9-10）は未実施で次の作業**。

### 基本設計（確定済み）

- **所有モデル**: `projects/{pid}` コレクション + `projects/{pid}/members/{uid}` サブコレクション
- **ロール階層**: `owner` / `editor` / `viewer`
- **プロジェクト可視性**: `public` / `private`
- **アノテーション**: `test/{aid}.researchProjectId` でプロジェクトに所属
- **領域ノード**: `regions` は projectId を持たない**プロジェクト横断の公開資産**、座標 immutable
- **manifest_metadata**: 資料の事実情報（プロジェクト非依存）

### データモデル

```ts
// types/main.ts に追加済み
Project { id, name, description, visibility, createdAt, createdBy }
ProjectMember { uid, role, joinedAt, invitedBy }
NewAnnotation.researchProjectId?: string  // 移行過渡期は optional
```

### サービス層

- [src/lib/services/projects.ts](src/lib/services/projects.ts)（新設済み）
  - `projectService`: create / get / update / delete / listPublic / listForMember
  - `projectMemberService`: upsert / remove / getRole / list
  - 権限ヘルパ: `canEdit` / `canView` / `canManageProject`

### Phase 1 で実施済み

1. **型定義追加**: `Project` / `ProjectMember` / `ProjectRole` / `ProjectVisibility` + `NewAnnotation.researchProjectId`
2. **サービス層**: `src/lib/services/projects.ts` 新設
3. **マイグレーション**: `scripts/migrate-to-projects.ts` 実行（2026-06-07）
   - Firebase Auth から全 9 ユーザーを列挙
   - 実データを持つ 5 ユーザーに対して「`<email>` のワークスペース」プロジェクトを作成、本人を owner に
   - creator 欠落データ 1 件のため「Orphan Annotations (legacy)」プロジェクトを作成
   - test コレクション 154 件すべてに `researchProjectId` 付与（欠落 0 件）
4. **セキュリティルールドラフト**: [firestore.rules.draft](firestore.rules.draft)（未デプロイ）
5. **バックアップ**: マイグレーション前後で 2 世代取得（`.firestore-backups/`）

#### プロジェクト分布（マイグレーション後）

| プロジェクト | アノテ数 | 所有者 |
|---|---|---|
| `f245ef32-e4eb-4504-8131-4dfe369bea39` | 104 | na.kamura.1263@gmail.com |
| `26e7d123-d7db-44e4-9974-b8a420aaf0d8` | 46 | htjk6513khbk@gmail.com |
| `1dd5b6c1-9ef9-4cdb-b9e6-bf7ccaac44a9` | 1 | 24dm1112@student.gs.chiba-u.jp |
| `a0655201-6294-4685-a93c-4644d36a2b65` | 1 | kmurata7496@gmail.com |
| `9cfa625b-ac45-4606-a7fc-923fd7280b3a` | 1 | 24dm1117@student.gs.chiba-u.jp |
| `f4dbd73e-e97d-41e1-a5cf-24fcee498415` | 1 | system（creator 欠落の Orphan 退避先） |

### Phase 2 実装済み（2026-06-07）

1. **Atom / フック**: [src/app/atoms/currentProjectAtom.ts](src/app/atoms/currentProjectAtom.ts)、[src/app/hooks/useCurrentProject.ts](src/app/hooks/useCurrentProject.ts) — URL クエリ `?pid=...` を一次情報源として、プロジェクト・ロール・権限を解決
2. **ProjectSwitcher**: [src/app/components/ProjectSwitcher.tsx](src/app/components/ProjectSwitcher.tsx) — ヘッダのドロップダウン。所属プロジェクト一覧 + 新規プロジェクト導線
3. **ホーム画面**: [src/app/page.tsx](src/app/page.tsx) を所属プロジェクト一覧カード（アノテ数・更新日）に書き換え
4. **新規作成**: [src/app/projects/new/page.tsx](src/app/projects/new/page.tsx) — 名前・説明・可視性のフォーム
5. **個別画面**: [src/app/projects/[pid]/page.tsx](src/app/projects/[pid]/page.tsx) — プロジェクト情報編集 / 資料一覧 / メンバー管理
6. **メンバー招待**: [src/app/api/projects/[pid]/invite/route.ts](src/app/api/projects/[pid]/invite/route.ts) + [src/app/components/MemberManager.tsx](src/app/components/MemberManager.tsx) — Admin SDK で email → UID 解決
7. **エディタ連携**:
   - 2D/3D エディタは `useCurrentProject` で pid を取得し、ヘッダに `ProjectSwitcher` を表示
   - 保存系（領域アノテ作成・Object Annotation 作成・各リソース追加）に `researchProjectId` を自動付与
   - `getOrCreateObjectAnnotation(manifestUrl, userId, researchProjectId)` にシグネチャ変更し、プロジェクトごとに独立な Object Annotation を保持
8. **一覧フィルタ**:
   - 領域アノテーション一覧（regionPanel）・Object Annotation 一覧は現プロジェクトのみ表示
   - **マーカー（領域）は target_manifest が一致する全領域を表示**（プロジェクト横断の公開資産として扱う）
   - マーカークリック時のアノテ一覧は現プロジェクトのものに絞る。別プロジェクトでアノテ済みの領域をクリックすると「アノテ 0 件」状態で領域パネルが開き、新規アノテを作成すれば現プロジェクトに紐づく
9. **読み取り専用モード**:
   - pid なし / 編集権限なし時はエディタ画面にバナー表示
   - `annotationMode` を強制 `'none'` / `editable=false` で新規作成抑制
10. **Firebase Emulator + ルールテスト**:
    - [firebase.json](firebase.json) を新設（emulators 設定）
    - [test/rules/firestore.test.ts](test/rules/firestore.test.ts) で `@firebase/rules-unit-testing` を使った最低限のシナリオを定義
    - [firestore.rules.legacy](firestore.rules.legacy) に旧ルールを保管（ロールバック用）

### Phase 2 次の作業（ルールデプロイ）

1. `npm install -D @firebase/rules-unit-testing` でテスト依存を追加
2. `firebase emulators:start --only firestore,auth` で Emulator 起動
3. `npx tsx test/rules/firestore.test.ts` でルールテスト通過確認
4. `firestore.rules.draft` を `firestore.rules` にリネームしてデプロイ
5. 本番動作確認後、過渡期データ（researchProjectId 欠落許容）の撤去を別タスク化

### Phase 2 設計（確定済み・未実装）※ 上記実装で消化済み

| 項目 | 決定事項 |
|---|---|
| **URL 設計** | クエリパラメータ方式 `/editor/3d?manifest=...&pid=xxx` |
| **選択タイミング** | ホーム画面で明示選択 |
| **UI 設置場所** | ヘッダのドロップダウン（切替可能） |
| **ホーム画面** | 自分のプロジェクト一覧 + アノテーション数・最終更新日 |
| **個別画面** | `/projects/<pid>`（プロジェクト情報・メンバー管理・資料一覧） |
| **メンバー招待** | email 招待（Next.js API Route `/api/projects/<pid>/invite` で Admin SDK 経由） |
| **作成フォーム** | 名前 + 説明 + 可視性（デフォルト private） |
| **Object Annotation** | プロジェクトごとに独立作成、現プロジェクトのみ一覧表示、重複チェックは簡易 |
| **pid 取得** | URL クエリ一次情報源 + Jotai atom キャッシュ |
| **過渡期データ** | 編集時に現プロジェクトの pid を自動付与 |
| **クロスアクセス** | 読めるが編集不可（読み取り専用モード） |
| **領域アノテ一覧** | 現プロジェクトのみ |
| **マーカー可視性** | target_manifest が一致する全領域を表示（プロジェクト横断の公開資産）。クリック時のアノテ一覧は現プロジェクトに絞る |
| **ダングリング領域** | 領域自体は表示。アノテが 1 件もない領域をクリックすると空のパネルが開き、そこから新規アノテを作れる |
| **API スコープ** | Phase 2 では現状維持（RDF/IIIF 出力は全アノテ返す） |
| **ルールデプロイ** | Phase 2 実装完了・動作確認後 |
| **過渡期ルール** | `researchProjectId` 欠落データは Phase 2 リリース時点で許容、後日締める |
| **デプロイ前テスト** | Firebase Emulator + ルールテスト |
| **ロールバック** | `firestore.rules.legacy` に旧ルール保管 + Firebase Console 履歴 |

### Phase 2 実装の着手順序

```
1. Project スイッチャー UI（ヘッダのドロップダウン + URL/atom 連動）
2. ホーム画面（プロジェクト一覧、アノテーション数・最終更新日）
3. プロジェクト個別画面 (/projects/[pid]/page.tsx) + メンバー管理 + email 招待 API
4. エディタの pid 取得（URL → Jotai atom）
5. アノテーション保存時の researchProjectId 付与（過渡期データの自動付与含む）
6. 一覧フィルタ実装（領域アノテ・Object Annotation・マーカー）
7. 読み取り専用モード（クロスプロジェクトアクセス時）
8. Emulator でのルールテスト
9. firestore.rules.draft を firestore.rules にリネームしてデプロイ、旧ルールを firestore.rules.legacy へ
10. 本番動作確認
```

### Phase 2 で新設予定のファイル

- `src/app/page.tsx`（ホーム画面 - プロジェクト一覧）
- `src/app/projects/[pid]/page.tsx`（プロジェクト個別画面）
- `src/app/projects/new/page.tsx` または モーダル（新規プロジェクト作成）
- `src/app/components/ProjectSwitcher.tsx`（ヘッダのドロップダウン）
- `src/app/components/MemberManager.tsx`（メンバー管理 UI）
- `src/app/atoms/currentProjectAtom.ts`（Jotai atom for current pid）
- `src/app/hooks/useCurrentProject.ts`（URL → atom → projectService の統合フック）
- `src/app/api/projects/[pid]/invite/route.ts`（email 招待 API Route、Admin SDK で email → UID 変換）
- `firestore.rules`（本番デプロイ用、ドラフトからリネーム）
- `firestore.rules.legacy`（旧ルール退避先）
- `test/rules/`（Emulator 用ルールテスト）

### Phase 2 で変更予定の既存ファイル

- [src/lib/services/objectMetadata.ts](src/lib/services/objectMetadata.ts) — `getOrCreateObjectAnnotation(manifestUrl, userId, researchProjectId)` にシグネチャ変更
- [src/app/editor/3d/page.tsx](src/app/editor/3d/page.tsx) / [src/app/editor/2d/page.tsx](src/app/editor/2d/page.tsx) — pid 取得、保存時付与、一覧フィルタ
- [src/app/components/RegionAnnotationList.tsx](src/app/components/RegionAnnotationList.tsx) — projectId フィルタ
- マーカー表示系コンポーネント — 領域マーカーの可視性フィルタ

### 後続フェーズ（Phase 5 以降に回した論点）

- **クロスプロジェクト機能**: アノテーション間関係（`supports` / `challenges` / `supplements`）のプロジェクト境界越え許可、プロジェクト横断閲覧モード、横断検索
- **API 改修**: RDF/IIIF 出力エンドポイントの projectId 対応（`/api/projects/<pid>/...`）
- **manifest_metadata の権限細分化**: TEI マッピングなど解釈的データの分離検討
- **領域共有運用**: 領域の発見・再利用 UI、孤立領域のクリーンアップ
- **ルール厳格化**: `researchProjectId` 欠落許容の撤去

---

## Firestore セキュリティルール

**現在は旧ルール（creator ベース）が本番デプロイ済み**。プロジェクト所有モデルへの新ルールは [firestore.rules.draft](firestore.rules.draft) として準備済みだが、Phase 2 実装完了後に切替予定。

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
