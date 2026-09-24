# タグ機能（key:value 形式の軽量分類）

2D / 3D エディタのアノテーションに `身分:武士` のような **key:value 形式のタグ**を付与する機能。

## 設計方針

### 既存の分類機構との棲み分け

本プロジェクトには既に分類に使える機構が2つある。タグはそれらを置き換えるものではなく、**URI を持たない軽量分類**という別の役割を担う。

| 機構 | 語彙 | 用途 |
|---|---|---|
| 典拠（`WikidataItem` + `:classified_as` / `:has_type`） | Wikidata URI による統制語彙 | 外部と相互参照可能な厳密な分類 |
| `AuthorityEntityType` | 固定10種（Person / Place / Concept 等） | 典拠エンティティの種別 |
| **タグ（`TagItem`）** | **プロジェクト内で自動蓄積・非統制** | **Wikidata に無い概念、作業用の分類軸** |

典拠は Wikidata 項目を探す手間があり、「要再調査」のような Wikidata に存在しない概念は原理的に扱えない。タグはそこを埋める。

### なぜ key:value か

フラットなタグ（「武士」だけ）だと語彙が平坦に散らかる。`身分:武士` なら **「身分」という分類軸**が明示され、後から軸単位での集計・絞り込みができる。

これは CIDOC CRM の型階層とも対応する。key が分類体系（`:TagScheme`）、value がその体系内の値（`:Tag`）。

## データ構造

```ts
// src/types/main.ts
export interface TagItem {
  key: string;            // 分類軸（例: '身分'）
  value: string;          // 値（例: '武士'）
  addedBy?: string;       // E13: 付与者 UID
  addedAt?: number;       // E13: 付与日時（ms）
  addedComment?: string;  // 付与者コメント（crm:P3_has_note）
}
```

`NewAnnotation.tags?` / `InfoPanelContent.tags?` としてアノテーションに配列で保持。**オプショナルなのでマイグレーション不要**（既存ドキュメントは `tags` 欠落のまま読める）。

**同一 key に複数の値を持てる**。`身分:武士` と `身分:町人` は独立した `TagItem` として並存し、重複判定は `key` と `value` の組で行う。フラットな配列にしているのはこのため（`{ [key]: string[] }` だと値ごとの E13 来歴が持てない）。

E13 の3フィールド（`addedBy` / `addedAt` / `addedComment`）は書誌・典拠・メディアと同じ形に揃えてある。「誰がいつなぜこのタグを付けたか」が他リソースと同じ粒度で残る。

### 付与先

**アノテーション（`test` コレクション）のみ**。領域ノード（`regions`）には付与しない。

`regions` はプロジェクト横断の公開資産であり、そこにタグを付けると付与権限の設計が別途必要になる。アノテーションに限定すれば既存の `researchProjectId` ベースの権限がそのまま効く。

## タグ語彙の蓄積

`projects/{pid}/tagVocabulary/{encodedKey}`:

```ts
{ key: '身分', values: ['武士', '町人', '僧侶'], updatedAt: number }
```

- **事前定義は不要**。タグ保存時に `setDoc(..., {merge:true})` + `arrayUnion` で自動追記される
- 蓄積された語彙は入力時のサジェストに使うだけで、**入力を制限しない**（新しい key / value は常に自由に作れる）
- ドキュメント ID は `encodeURIComponent(key)`（`/` を含む key や `.` 予約語への対策）

### なぜサブコレクションか

`projects/{pid}/members/{uid}` と同じ階層に置くことで、既存の Firestore ルール構造（親プロジェクトの membership で判定）をそのまま流用できる。`collectionGroup` を使わないため、client SDK でルールの静的評価により permission-denied になる問題も踏まない。

語彙の蓄積はタグ付与の副作用であり、失敗してもタグ本体の保存は妨げない（`console.warn` のみ）。

### セキュリティルール

[firestore.rules](../firestore.rules) に定義済み（**未デプロイ** — 親ルールセット全体が Phase 2 デプロイ待ち）。

| 操作 | 権限 |
|---|---|
| read | メンバー or 公開プロジェクト |
| create / update | editor 以上 + 型チェック（`key` is string / `values` is list） |
| delete | owner のみ |

write を editor 以上に揃えてあるのは、タグを付与できる権限と一致させ、viewer が語彙だけを汚せる状態を作らないため。[test/rules/firestore.test.ts](../test/rules/firestore.test.ts) にテスト済み。

## RDF 出力

語彙定義は `src/utils/rdf.ts` の `VOCAB_DEFINITIONS` §3.6。

```turtle
:TagScheme a rdfs:Class ;
  rdfs:subClassOf crm:E55_Type ;
  rdfs:comment "タグの分類軸（key）。プロジェクト内で自動蓄積される非統制の語彙体系。" .

:Tag a rdfs:Class ;
  rdfs:subClassOf crm:E55_Type .

:has_tag a rdf:Property ;
  rdfs:domain oa:Annotation ;
  rdfs:range :Tag ;
  rdfs:subPropertyOf crm:P2_has_type .
```

実際の出力:

```turtle
<.../tag/身分> a :TagScheme ;
  rdfs:label "身分" .

<.../tag/身分/武士> a :Tag ;
  crm:P127_has_broader_term <.../tag/身分> ;
  rdfs:label "武士" .

<.../annotation/a1> :has_tag <.../tag/身分/武士> .

<.../annotation/a1/event/tag-0> a crm:E13_Attribute_Assignment ;
  crm:P140_assigned_attribute_to <.../annotation/a1> ;
  crm:P141_assigned <.../tag/身分/武士> ;
  crm:P177_assigned_property_of_type :has_tag ;
  crm:P14_carried_out_by <urn:uid:...> ;
  crm:P4_has_time-span "..."^^xsd:dateTime ;
  crm:P3_has_note "帯刀と髷の形状から判断" .
```

- URI は `{manifestBase}/tag/{key}/{value}`（各セグメントは `encodeURIComponent`）
- 同一 key/value が複数アノテーションで使われても、`:TagScheme` / `:Tag` の定義は**初出時のみ出力**（`emittedTagSchemes` / `emittedTags` で重複排除）
- E13 イベント URI は `{annotationUri}/event/tag-{index}`。他リソースと異なり `relationTypes` を持たないため、配列上の位置で一意化する

## UI

詳細パネルの **4タブ（Resources / Linked Data / References / Location）の外側**、Description カードの直下にタグ行を配置。

タグは4分類のいずれにも属さず、かつ一覧性そのものが価値なのでタブ内に埋めない。

- `+ タグ` ボタン → `TagDialog`（key 入力 + value 入力、両方サジェスト付き）
- タグチップの `✕`（ホバーで表示）で削除
- `addedComment` はチップの `title` 属性としてツールチップ表示
- 編集権限（`annotationCanEdit`）が無い場合は追加・削除ボタンを出さない
- 同一 key:value の重複付与は保存時に無視される

### 複数値の入力

1つの key に対して値を複数まとめて付与できる（`身分:武士` `身分:町人` `身分:僧侶`）。

#### 分割案の確認フロー（researchmap の著者登録と同じ流れ）

区切り文字を含む入力は**その場で自動分割せず、分割案を提示して確認を取る**。

```
入力「元老院階級，騎士階級，平民」
  ↓ 区切り文字を検知
分割案（3 件）
  1. 元老院階級   既に追加済み（スキップ）
  2. 騎士階級
  3. 平民
  [分割して追加（2 件）] [分割せず 1 件として追加]
  ↓ ユーザーが選択
チップとして確定 → Save
```

- 自動分割にしないのは、意図せず値が割れても気づけないため。逆に区切り文字を含む 1 つの値（例: 書名）を登録したい場合の逃げ道も要る
- 分割案では**既に付与済みの値に取り消し線を引き**、追加件数から除外する
- **分割案が出ている間は Save を無効化**する（`canSave` に `!splitPreview`）。未確定のまま保存されるのを防ぐ
- 区切り文字を含まない入力では分割案は出ず、従来どおり「追加」ボタンで確定

#### Enter キーの扱い

**Enter では確定も保存も行わない**（`e.preventDefault()` のみ）。

日本語入力では IME の変換確定で Enter が飛ぶため、Enter に確定・保存を割り当てると意図しない登録が起きる。値の確定は「追加」ボタン、分割は「分割して追加」ボタンに限定する。

> 以前は Enter に「値の確定」と「空入力なら保存実行」を割り当てていたが、変換確定のつもりの Enter で保存まで走る問題があったため撤去した。

#### 区切り文字

`VALUE_SEPARATORS = /[,，、､]/`（半角カンマ・全角カンマ・読点・半角読点）。

**日本語入力では全角カンマ「，」がそのまま入るため、半角だけでは取りこぼす**（`身分:元老院階級，騎士階級` が 1 つの値として保存される不具合があった）。
- 空入力での Backspace は直前のチップを削除
- key を変更すると入力中の値はクリアされる（別の軸の値になるため）
- 値のサジェストからは、この場で追加済みの値と**既にそのアノテーションに付いている値**を除外する
- `addedComment` は保存する全値に同じ内容が記録される（ダイアログ上に注記を表示）
- 保存時、値の数だけ `TagItem` を生成して1回の `updateDoc` で書き込む

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `src/types/main.ts` | `TagItem` 型定義 |
| `src/lib/services/tagVocabulary.ts` | 語彙の蓄積・取得 |
| `src/app/hooks/useTagVocabulary.ts` | 語彙をサジェスト用に供給するフック |
| `src/app/components/dialogs/TagDialog.tsx` | タグ入力ダイアログ |
| `src/utils/rdf.ts` | `:has_tag` 語彙定義 + `buildE13ForTag` |
| `src/app/editor/{2d,3d}/page.tsx` | `saveTag` / `deleteTag` + タグ行 UI |

---

## IIIF 出力

タグは IIIF Presentation API 3.0 のマニフェストにも出力する（[converter.ts](../src/utils/converter.ts) の `convertAnnotationToIIIF`）。

書誌・典拠は「詳細を IIIF に含めず RDF に委ねる」方針だが、タグは **URI を持たない自己完結した短い文字列**で外部ビューアでもそのまま意味を持つため、例外として出力する。

### 出力形式

Web Annotation Data Model の tagging body を使う。Presentation 3.0 §3.5 は次のように述べており、Textual Body 上の `purpose` を明示的に認めている。

> This specification defines two values for the Web Annotation property of `motivation`, or `purpose` when used on a Specific Resource or Textual Body.

`tagging` は Presentation API 側の定義ではなく Web Annotation Data Model の語彙（同 §3.5 は「Additional motivations may be added to the Annotation to further clarify the intent, drawn from extensions or other sources」として外部語彙の利用を許容している）。

```json
{
  "id": ".../annotation/a1",
  "type": "Annotation",
  "motivation": ["commenting", "tagging"],
  "body": [
    { "type": "TextualBody", "format": "text/html", "value": "<p>本文…</p>", "label": "武士図像の考察" },
    { "type": "TextualBody", "value": "武士", "purpose": "tagging", "label": { "none": ["身分"] } },
    { "type": "TextualBody", "value": "町人", "purpose": "tagging", "label": { "none": ["身分"] } },
    { "type": "TextualBody", "value": "江戸", "purpose": "tagging", "label": { "none": ["時代"] } }
  ],
  "target": { "type": "SpecificResource", "source": "...", "selector": { ... } }
}
```

### key:value の載せ方

**`value` には値のみを入れ、分類軸（key）は `label` の言語マップで保持する。**

`value` に `"身分:武士"` と連結する案もあるが、値自体が `:` を含む場合（書名など）に分割が曖昧になるため採らない。値だけを `value` に置けば、タグ非対応のビューアでも値がそのまま読める。

`label` のキーに `none` を使うのは、タグの分類軸に言語を特定できないため（IIIF v3 の言語マップで「言語不明」を表す規定値）。

### 後方互換

- **タグが 0 件のアノテーションは従来どおり**の出力（`motivation: "commenting"`、`body` は単一オブジェクト）。既存マニフェストの形は変わらない
- タグがある場合のみ `motivation` が配列に、`body` が配列になる。本文 body は常に配列の先頭に置くので、先頭だけを読むビューアでも本文は表示される
- 型は `IIIFAnnotation.motivation: string | string[]` / `body: IIIFTextualBody | IIIFTextualBody[]`（[types/main.ts](../src/types/main.ts)）

### 参考: 採らなかった案

CODH の [IIIF Curation Viewer](https://codh.rois.ac.jp/software/iiif-curation-viewer/) はアノテーション情報を Canvas の `metadata` 配列に `{label, value}` として押し込む方式を採る。実績ある拡張点ではあるが標準の意味論を持たないため、`purpose: "tagging"` を優先した。なお Curation API 本体にタグ機構は無く（分類手段は Range の `label` のみで多重付与不可）、Curation Board もタグではなく空間配置を選んでいる。

### 非統制語彙であることの明示

タグは**プロジェクト内でのみ通用する非統制語彙**であり、`:classified_as`（Wikidata 裏付けあり）と同等の統制語彙と誤解されないようにする必要がある。RDF 側では `:has_tag` の `rdfs:comment` に明記済み。IIIF 側は `purpose: "tagging"` であること自体が統制語彙でない旨を示す（統制された分類なら典拠リソースとして別に出力される）。
