/**
 * Firestore コレクション全体のスナップショットを JSON として保存する。
 *
 * 対象コレクション:
 *   - test                  (アノテーション)
 *   - regions               (領域ノード)
 *   - manifest_metadata     (オブジェクトメタデータ)
 *   - projects              (新設後はバックアップ対象に含める)
 *
 * Usage:
 *   npx tsx scripts/backup-firestore.ts
 *   npx tsx scripts/backup-firestore.ts --collections test,regions
 *
 * 出力先:
 *   .firestore-backups/backup-<timestamp>/<collection>.json
 *   .firestore-backups/backup-<timestamp>/_summary.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

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

const DEFAULT_COLLECTIONS = ['test', 'regions', 'manifest_metadata', 'projects'];

function parseCollectionsArg(): string[] {
  const idx = process.argv.indexOf('--collections');
  if (idx === -1 || idx + 1 >= process.argv.length) return DEFAULT_COLLECTIONS;
  return process.argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
}

async function backup() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const collections = parseCollectionsArg();

  // タイムスタンプを ISO 形式から : と . を - に置換した形にしてディレクトリ名に
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(__dirname, `../.firestore-backups/backup-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('='.repeat(60));
  console.log('Firestore Backup');
  console.log(`  Output: ${outputDir}`);
  console.log(`  Collections: ${collections.join(', ')}`);
  console.log('='.repeat(60));

  const summary: Record<string, { count: number; file: string }> = {};

  for (const coll of collections) {
    console.log(`\n[${coll}] エクスポート中...`);
    const snap = await db.collection(coll).get();
    const docs = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

    const fileName = `${coll}.json`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));

    summary[coll] = { count: docs.length, file: fileName };
    console.log(`  ${docs.length} 件 → ${fileName}`);

    // projects コレクションのサブコレクション (members) もバックアップ
    if (coll === 'projects' && docs.length > 0) {
      const allMembers: Record<string, unknown[]> = {};
      for (const projDoc of snap.docs) {
        const memberSnap = await db
          .collection('projects')
          .doc(projDoc.id)
          .collection('members')
          .get();
        if (!memberSnap.empty) {
          allMembers[projDoc.id] = memberSnap.docs.map((m) => ({ _id: m.id, ...m.data() }));
        }
      }
      const memberCount = Object.values(allMembers).reduce(
        (sum, arr) => sum + (arr as unknown[]).length,
        0
      );
      const memberFile = 'projects_members.json';
      fs.writeFileSync(path.join(outputDir, memberFile), JSON.stringify(allMembers, null, 2));
      summary['projects/_/members'] = { count: memberCount, file: memberFile };
      console.log(`  projects subcollection members: ${memberCount} 件 → ${memberFile}`);
    }
  }

  // サマリファイル
  const summaryData = {
    backedUpAt: new Date().toISOString(),
    firebaseProjectId: serviceAccount.project_id,
    collections: summary,
  };
  fs.writeFileSync(path.join(outputDir, '_summary.json'), JSON.stringify(summaryData, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Backup 完了');
  console.log(`  Total collections: ${Object.keys(summary).length}`);
  console.log(`  Output: ${outputDir}`);
  console.log('='.repeat(60));
}

backup().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
