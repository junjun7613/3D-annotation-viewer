# Firestore セキュリティルール

**プロジェクト所有モデルのルールが本番デプロイ済み**（2026-09-23 時点で Firebase Console の内容が [firestore.rules](../firestore.rules) のタグ追記前コミットと完全一致することを確認）。

> 旧称 `firestore.rules.draft` はリネーム済み（[firebase.json](../firebase.json) も `firestore.rules` を参照）。旧 creator ベースのルールは [firestore.rules.legacy](../firestore.rules.legacy) にロールバック用として保管。
>
> **未反映**: タグ語彙（`tagVocabulary`）のルールはリポジトリに追記済みだが本番未適用。下記参照。

## ルールテスト

[test/rules/firestore.test.ts](../test/rules/firestore.test.ts) に `@firebase/rules-unit-testing` によるシナリオを定義。

```bash
npx firebase-tools emulators:start --only firestore,auth   # 別ターミナルで起動
npx tsx test/rules/firestore.test.ts
```

- 依存は `@firebase/rules-unit-testing@4.0.1` 固定。最新の 5.x は peer に firebase 12 を要求するが、本プロジェクトは firebase 11 のため v4 系を使う
- `test` コレクションの read は**公開のまま**（旧ルール `allow read: if true` との後方互換）。所有モデルは create / update / delete で担保しており、テストもその前提で書かれている

## tagVocabulary（タグ語彙）

`projects/{pid}/tagVocabulary/{key}` は親プロジェクトのメンバーシップで判定する。

| 操作 | 権限 | 理由 |
|---|---|---|
| read | メンバー or 公開プロジェクト | `test` の read が公開である以上、公開プロジェクトの語彙も見えてよい |
| create / update | editor 以上 + 型チェック（`key` is string / `values` is list） | タグ付与権限と一致させ、viewer が語彙だけ汚せる状態を作らない |
| delete | owner のみ | 分類軸の廃止は影響が大きい |

詳細: [docs/tags.md](tags.md)

## 現在の本番ルール（creator ベース）

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
