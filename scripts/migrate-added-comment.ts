/**
 * 既存アノテーションの bibliography / wikidata / media アイテムに
 * addedComment: "" を追加するマイグレーションスクリプト。
 *
 * Usage: npx tsx scripts/migrate-added-comment.ts [--dry-run]
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
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

const isDryRun = process.argv.includes('--dry-run');

function addCommentIfMissing(items: Record<string, unknown>[]): { updated: Record<string, unknown>[]; changed: boolean } {
  let changed = false;
  const updated = items.map((item) => {
    if (item.addedComment === undefined) {
      changed = true;
      return { ...item, addedComment: '' };
    }
    return item;
  });
  return { updated, changed };
}

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log(`${isDryRun ? '[DRY RUN] ' : ''}migrate-added-comment`);
  console.log('='.repeat(60));

  const snapshot = await db.collection('test').get();
  let updatedCount = 0;
  let skippedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates: Record<string, unknown> = {};
    let needsUpdate = false;

    for (const field of ['bibliography', 'wikidata', 'media'] as const) {
      const items = data[field] as Record<string, unknown>[] | undefined;
      if (!items || items.length === 0) continue;
      const { updated, changed } = addCommentIfMissing(items);
      if (changed) {
        updates[field] = updated;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log(`  update: ${docSnap.id}`);
      if (!isDryRun) {
        await db.collection('test').doc(docSnap.id).update(updates);
      }
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`完了: 更新 ${updatedCount} 件、スキップ ${skippedCount} 件`);
  if (isDryRun) console.log('※ --dry-run のため実際の書き込みは行っていません');
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
