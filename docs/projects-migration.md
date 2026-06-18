# 研究プロジェクト所有モデル移行

アノテーションの所有・編集権限を **ユーザー単位 → 研究プロジェクト単位**に移行する作業。Phase 1（バックエンド準備 + マイグレーション）完了済み、Phase 2（UI 改修）の実装が完了。**ルールデプロイ（Step 9-10）は未実施で次の作業**。

## 基本設計（確定済み）

- **所有モデル**: `projects/{pid}` コレクション + `projects/{pid}/members/{uid}` サブコレクション
- **ロール階層**: `owner` / `editor` / `viewer`
- **プロジェクト可視性**: `public` / `private`
- **アノテーション**: `test/{aid}.researchProjectId` でプロジェクトに所属
- **領域ノード**: `regions` は projectId を持たない**プロジェクト横断の公開資産**、座標 immutable
- **manifest_metadata**: 資料の事実情報（プロジェクト非依存）

## データモデル

```ts
// types/main.ts に追加済み
Project { id, name, description, visibility, createdAt, createdBy }
ProjectMember { uid, role, joinedAt, invitedBy }
NewAnnotation.researchProjectId?: string  // 移行過渡期は optional
```

## サービス層

- [src/lib/services/projects.ts](../src/lib/services/projects.ts)（新設済み）
  - `projectService`: create / get / update / delete / listPublic / listForMember
  - `projectMemberService`: upsert / remove / getRole / list
  - 権限ヘルパ: `canEdit` / `canView` / `canManageProject`

## Phase 1 で実施済み

1. **型定義追加**: `Project` / `ProjectMember` / `ProjectRole` / `ProjectVisibility` + `NewAnnotation.researchProjectId`
2. **サービス層**: `src/lib/services/projects.ts` 新設
3. **マイグレーション**: `scripts/migrate-to-projects.ts` 実行（2026-06-07）
   - Firebase Auth から全 9 ユーザーを列挙
   - 実データを持つ 5 ユーザーに対して「`<email>` のワークスペース」プロジェクトを作成、本人を owner に
   - creator 欠落データ 1 件のため「Orphan Annotations (legacy)」プロジェクトを作成
   - test コレクション 154 件すべてに `researchProjectId` 付与（欠落 0 件）
4. **セキュリティルールドラフト**: [firestore.rules.draft](../firestore.rules.draft)（未デプロイ）
5. **バックアップ**: マイグレーション前後で 2 世代取得（`.firestore-backups/`）

### プロジェクト分布（マイグレーション後）

| プロジェクト | アノテ数 | 所有者 |
|---|---|---|
| `f245ef32-e4eb-4504-8131-4dfe369bea39` | 104 | na.kamura.1263@gmail.com |
| `26e7d123-d7db-44e4-9974-b8a420aaf0d8` | 46 | htjk6513khbk@gmail.com |
| `1dd5b6c1-9ef9-4cdb-b9e6-bf7ccaac44a9` | 1 | 24dm1112@student.gs.chiba-u.jp |
| `a0655201-6294-4685-a93c-4644d36a2b65` | 1 | kmurata7496@gmail.com |
| `9cfa625b-ac45-4606-a7fc-923fd7280b3a` | 1 | 24dm1117@student.gs.chiba-u.jp |
| `f4dbd73e-e97d-41e1-a5cf-24fcee498415` | 1 | system（creator 欠落の Orphan 退避先） |

## Phase 2 実装済み（2026-06-07）

1. **Atom / フック**: [src/app/atoms/currentProjectAtom.ts](../src/app/atoms/currentProjectAtom.ts)、[src/app/hooks/useCurrentProject.ts](../src/app/hooks/useCurrentProject.ts) — URL クエリ `?pid=...` を一次情報源として、プロジェクト・ロール・権限を解決
2. **ProjectSwitcher**: [src/app/components/ProjectSwitcher.tsx](../src/app/components/ProjectSwitcher.tsx) — ヘッダのドロップダウン。所属プロジェクト一覧 + 新規プロジェクト導線
3. **ホーム画面**: [src/app/page.tsx](../src/app/page.tsx) を所属プロジェクト一覧カード（アノテ数・更新日）に書き換え
4. **新規作成**: [src/app/projects/new/page.tsx](../src/app/projects/new/page.tsx) — 名前・説明・可視性のフォーム
5. **個別画面**: [src/app/projects/[pid]/page.tsx](../src/app/projects/[pid]/page.tsx) — プロジェクト情報編集 / 資料一覧 / メンバー管理
6. **メンバー招待**: [src/app/api/projects/[pid]/invite/route.ts](../src/app/api/projects/[pid]/invite/route.ts) + [src/app/components/MemberManager.tsx](../src/app/components/MemberManager.tsx) — Admin SDK で email → UID 解決
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
    - [firebase.json](../firebase.json) を新設（emulators 設定）
    - [test/rules/firestore.test.ts](../test/rules/firestore.test.ts) で `@firebase/rules-unit-testing` を使った最低限のシナリオを定義
    - [firestore.rules.legacy](../firestore.rules.legacy) に旧ルールを保管（ロールバック用）

## Phase 2 次の作業（ルールデプロイ）

1. `npm install -D @firebase/rules-unit-testing` でテスト依存を追加
2. `firebase emulators:start --only firestore,auth` で Emulator 起動
3. `npx tsx test/rules/firestore.test.ts` でルールテスト通過確認
4. `firestore.rules.draft` を `firestore.rules` にリネームしてデプロイ
5. 本番動作確認後、過渡期データ（researchProjectId 欠落許容）の撤去を別タスク化

## Phase 2 設計（確定済み）

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

## 後続フェーズ（Phase 5 以降に回した論点）

- **クロスプロジェクト機能**: アノテーション間関係（`supports` / `challenges` / `supplements`）のプロジェクト境界越え許可、プロジェクト横断閲覧モード、横断検索
- **API 改修**: RDF/IIIF 出力エンドポイントの projectId 対応（`/api/projects/<pid>/...`）
- **manifest_metadata の権限細分化**: TEI マッピングなど解釈的データの分離検討
- **領域共有運用**: 領域の発見・再利用 UI、孤立領域のクリーンアップ
- **ルール厳格化**: `researchProjectId` 欠落許容の撤去
