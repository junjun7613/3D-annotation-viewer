/**
 * 既存アノテーション（test コレクション）から regions コレクションを生成し、
 * 各アノテーションに regionId を付与するマイグレーションスクリプト。
 *
 * Usage: npx tsx scripts/migrate-regions.ts [--dry-run]
 *
 * --dry-run: Firestore への書き込みを行わず、変更内容のみ表示する
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log(isDryRun ? '[DRY RUN] ' : '' + 'Migrate annotations → regions');
  console.log('='.repeat(60));

  // regionId が未設定のアノテーションを全件取得
  const snapshot = await db.collection('test').get();
  const targets = snapshot.docs.filter((d) => !d.data().regionId);

  console.log(`対象アノテーション数（regionId 未設定）: ${targets.length}`);
  if (targets.length === 0) {
    console.log('マイグレーション済みです。');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const docSnap of targets) {
    const data = docSnap.data();
    const selector = data.data?.target?.selector;

    if (!selector || !selector.type) {
      console.log(`  SKIP ${docSnap.id} — selector なし`);
      skipped++;
      continue;
    }

    // selector の type が既知のものか確認
    const knownTypes = ['3DSelector', 'PolygonSelector', '2DRectSelector', '2DPolygonSelector'];
    if (!knownTypes.includes(selector.type)) {
      console.log(`  SKIP ${docSnap.id} — 未知の selector.type: ${selector.type}`);
      skipped++;
      continue;
    }

    const regionId = uuidv4();
    const regionData = {
      creator: data.creator ?? '',
      createdAt: data.createdAt ?? Date.now(),
      target_manifest: data.target_manifest ?? '',
      target_canvas: data.target_canvas ?? '',
      selector,
    };

    console.log(`  annotation: ${docSnap.id}`);
    console.log(`    → region:  ${regionId}  (${selector.type})`);

    if (!isDryRun) {
      // regions コレクションに新規作成
      await db.collection('regions').doc(regionId).set(regionData);
      // アノテーションに regionId を付与
      await db.collection('test').doc(docSnap.id).update({ regionId });
    }

    created++;
  }

  console.log('='.repeat(60));
  console.log(`完了: regions 作成 ${created} 件、スキップ ${skipped} 件`);
  if (isDryRun) console.log('※ --dry-run のため実際の書き込みは行っていません');
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
