# Firestore セキュリティルール

**現在は旧ルール（creator ベース）が本番デプロイ済み**。プロジェクト所有モデルへの新ルールは [firestore.rules.draft](../firestore.rules.draft) として準備済みだが、Phase 2 実装完了後に切替予定。

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
