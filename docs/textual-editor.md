# Textual エディタ（`/editor/textual`）

TEI XML と領域ノードのリンクを管理する独立画面（実装済み）。

## 画面構成

- 左 5：マニフェストタイプに応じた 2D 画像 or 3D モデルビューア（自動判定）
- 右 5：TEI テキスト（`TEILinkViewer`）。上部に「選択中 region」インジケータと「要素タイプフィルタ」
- ナビ：2D/3D エディタ ↔ Textual を相互リンク

## 動作

- 領域マーカー（`regions` コレクション）は**表示のみ**。作成・編集・削除は 2D/3D 側で行う
- マーカークリック → `regionPanelAtom` に regionId が入る → 接続可能要素（タイプフィルタで ON のもの）をクリックでリンク作成
- Unlink：リンク済みマーカーのダブルクリックで Unlink ポップオーバー
- 連動ハイライト：
  - 要素クリック → リンク先 region のマーカーをハイライト（`ThreeCanvas.focusRegionId` / `TwoDCanvas.focusAnnotationId`）
  - マーカークリック → リンク先要素をハイライト
- アノテーション一覧 / 詳細は表示しない（領域ノード単位のみ）

## 接続対象要素

行（`<lb>`）に限らず、TEI 文書中で **`xml:id` を持つ任意の要素**（`<persName>`, `<placeName>`, `<w>`, `<seg>` 等）を接続対象にできる。`<lb>` は xml:id を持たないことが多いため `@n` を `lb#<n>` 形式で id 代わりに採用。

UI：TEI ビューア上部に「Element types」フィルタ chip 群を表示。XML 読み込み時に検出した要素タイプを列挙し、ON のタイプのみマーカーが可視化される。デフォルトは `lb` のみ ON。

## マニフェストタイプ判定

`detectManifestType()` が IIIF JSON を fetch し、`canvas.items[0].items[0].body.format` / `type` から `model/*` ⇒ 3D、`image/*` ⇒ 2D を判定。IIIF v2 の `images[0].resource.format` にもフォールバック。

## データモデル

`manifest_metadata.tei_element_mappings` の値は `{ elementId, elementType, label, regionId }`。
- `elementId`: `xml:id`（`<lb>` は `lb#<@n>`）
- `elementType`: TEI タグ名（`'lb' | 'persName' | 'placeName' | 'w' | ...`）
- `label`: 表示用の短いテキスト
- `regionId`: `regions` コレクションのドキュメント ID

## Export（`<sourceDoc>`）

`teiGenerator.ts` の `<zone type="line">` 生成は `elementType='lb'` のマッピングのみを対象とする（既存挙動）。`<lb>` 以外の要素は将来的に本文側 `corresp` 付与等で扱う余地を残してある。

## 2D / 3D エディタからの除去

`TEILinkViewer` 表示・`useTeiLinking` フック・`useObjectMetadata` の TEI 関連戻り値・TEI ハンドラを撤去。Description カードは横幅いっぱい。

## 未対応：テキスト ↔ 領域リンクが動作しない（保留中）

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
