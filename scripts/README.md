# Scripts

## download-firestore-data.ts

Firestoreからマニフェストに関連するデータをダウンロードするスクリプト。

### 使い方

```bash
npx tsx scripts/download-firestore-data.ts <manifest_url>
```

### 例

```bash
npx tsx scripts/download-firestore-data.ts "https://ogawa.aws.ldas.jp/iiif/3/18/manifest"
```

### 出力

1. **コンソール出力**: manifest_metadataとアノテーションの内容を表示
2. **JSONファイル**: `.firestore-exports/export-<timestamp>.json` に保存

### 取得データ

- `manifest_metadata` コレクション: マニフェストに紐づくメタデータ（media, wikidata, bibliography, location）
- `test` コレクション: マニフェストに紐づくアノテーション一覧

### 必要条件

- `.env` ファイルに `FIREBASE_SERVICE_ACCOUNT` が設定されていること
