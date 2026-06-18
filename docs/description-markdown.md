# Description（本文）の Markdown 化

annotation 本文は **CommonMark + GFM** の Markdown 文字列で保持する（実装済み）。

## データモデル

```ts
data: { body: { value: string; label: string; type: string } }  // value = Markdown
```

## エディタ

- **ライブラリ**: `@uiw/react-md-editor`（split / live / preview モード、ツールバー付き）
- **コンポーネント**: [src/app/components/dialogs/DescriptionDialog.tsx](../src/app/components/dialogs/DescriptionDialog.tsx)
- 2D / 3D エディタの「Description」ペン編集ボタンから呼び出される
- ライブプレビュー（右ペイン）は MDEditor の `components.preview` slot を差し替え、`renderMarkdown` で生成したカスタム HTML を表示。これによりプレビューも本番カードと完全に同じ見た目になる

## Linked Resource 参照・埋め込み

Markdown 本文中から、同じアノテーションに紐づく書誌 / 典拠 / メディアを参照できる。CommonMark のリンク・画像構文を流用。

| リソース種別 | 記法 | 例 |
|---|---|---|
| 書誌 | `[label](#bib/<id>)` | `[Smith 2020](#bib/abc123)` |
| 典拠 | `[label](#auth/<id>)` | `[Tokyo](#auth/xyz789)` |
| メディア | `![caption](#media/<id>)` | `![出土状況](#media/def456)` |

`<id>` は当該アノテーションの `bibliography[].id` / `wikidata[].id` / `media[].id`。

**ピッカー UI**: DescriptionDialog 上部の「Insert: Bibliography / Authority / Media」ボタン。クリックすると現アノテーションの紐づきリストがポップオーバーで開き、選択でカーソル位置に Markdown を挿入する。Media は `![img]` / `[link]` どちらの形式でも挿入可。

**レンダリング**: [src/utils/markdown.ts](../src/utils/markdown.ts) の `renderMarkdown(markdown, ctx)` がカスタムレンダラで `#bib/` `#auth/` `#media/` を判定：

| 種別 | 描画 |
|---|---|
| `#bib/<id>` | `<span class="md-ref md-ref-bib">` 黄バッジ + tooltip（著者 "タイトル" (年)）。`bib.page` がある場合は `<a target="_blank">` で外部リンク化 |
| `#auth/<id>` | `<span class="md-ref md-ref-auth">` 青バッジ + tooltip（label + uri）。`wikidata.uri` がある場合は `<a target="_blank">` で外部リンク化 |
| `![caption](#media/<id>)` | メディア種別ごとにサムネイル付き `<figure class="md-embed-media">` を生成 |
| `[caption](#media/<id>)` | `<span class="md-ref md-ref-media">` バッジ |

## メディアサムネイル解決

| メディア種別 | サムネイル URL の解決 |
|---|---|
| `img` | `media.source` をそのまま `<img>` の `src` に |
| `video` | `media.source` から YouTube ID を抽出（`youtu.be/<id>`, `?v=<id>`, `youtube.com/embed/<id>` 形式に対応）→ `https://img.youtube.com/vi/<id>/mqdefault.jpg` |
| `iiif` | [src/app/hooks/useIIIFThumbnails.ts](../src/app/hooks/useIIIFThumbnails.ts) が `manifestUrl` を fetch → v3/v2 両対応で `thumbnail` を解決。失敗時は紫グラデーションの "IIIF" プレースホルダ |
| `sketchfab` | サムネ URL を簡易取得できないため、常にティール→ブルーのグラデーションで "3D" プレースホルダ |

`useIIIFThumbnails` はモジュールスコープの Map にキャッシュを持ち、同一 manifest の再 fetch を回避する。

## クリック挙動（Description 表示中）

Description カード / DescriptionDialog プレビューの両方で:

- **メディアサムネ** (`figure.md-embed-media`) クリック → 2D/3D エディタが持つ既存の `setSelectedImage` / `setSelectedVideo` / `setSelectedIIIF` / `setSelectedSketchFab` を呼び、Mirador / YouTube embed / Sketchfab embed / 拡大画像のフルスクリーン dialog を開く（Resources タブと同じ UX）
- **書誌・典拠バッジ** クリック → 外部 URL を新規タブで開く（`bib.page` または `wikidata.uri` がある場合）。無い場合はバッジのみ表示
- ホバー：サムネは浮き上がり効果、バッジは brightness アップ

## RDF 出力（CiTO リンク抽出）

[src/utils/rdf.ts](../src/utils/rdf.ts) は本文 Markdown を走査して `cito:` トリプルを追加：

```turtle
@prefix cito: <http://purl.org/spar/cito/> .

<annotation/<id>> a oa:Annotation ;
  schema:description "..." ;
  cito:cites <bib/abc123> ;          # [..](#bib/<id>)
  cito:discusses <wikidata-uri> .    # [..](#auth/<id>)
```

`extractResourceRefs(markdown)` で参照 ID を 3 分類に抽出。Annotation に紐づいているリソースのみが triple 化される（未紐付け参照は破棄）。メディア参照はリソース側を主語にする既存方針に揃え、Annotation 直接の triple には追加しない。

## IIIF 出力

[src/utils/converter.ts](../src/utils/converter.ts) の `convertAnnotationToIIIF` も Markdown を `renderMarkdown` で HTML 化し、`body.value` にセット。

## スタイル

[src/app/globals.css](../src/app/globals.css) の `.description-content` 配下に Markdown 要素（h1-h6 / p / ul / ol / blockquote / code / pre / hr / table / img / del / strong / em / task list）のスタイルを追加。リソース参照用のクラス：

- `.md-ref-bib` (黄) / `.md-ref-auth` (青) / `.md-ref-media` (紫) — バッジ
- `.md-ref-link` — バッジを外部リンクで包んだ際の `<a>` ラッパ（下線・border-bottom を抑制、hover で brightness up）
- `.md-embed-media` — サムネイル付き figure（hover 効果あり）
- `.md-embed-iiif` / `.md-embed-sketchfab` — プレースホルダ（グラデーション + アイコン + ラベル）

## 依存

- 追加: `@uiw/react-md-editor`, `marked`
- 削除: `@editorjs/editorjs`, `@editorjs/header`, `@editorjs/list`, `editorjs-html`
