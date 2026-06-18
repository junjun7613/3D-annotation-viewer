# マイグレーション履歴

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

## migrate-tei-elements.ts

```bash
npx tsx scripts/migrate-tei-elements.ts --dry-run
npx tsx scripts/migrate-tei-elements.ts
```

旧 `tei_line_mappings` / `annotationId` を `tei_element_mappings` の要素ベース構造に変換。

## migrate-description-to-markdown.ts

```bash
npx tsx scripts/migrate-description-to-markdown.ts --dry-run
npx tsx scripts/migrate-description-to-markdown.ts
```

旧データ（Editor.js JSON `{ blocks: [...] }`）を Markdown 文字列に一括変換。

| Editor.js ブロック | Markdown 変換 |
|---|---|
| `paragraph` | 段落そのまま（`<br>` は改行に） |
| `header` (level N) | `#` × N + テキスト |
| `list` (unordered) | `- ` 付きリスト |
| `list` (ordered) | `1. ` 付きリスト |

新形式（string）のみが残るため、コードに後方互換分岐は残していない。
