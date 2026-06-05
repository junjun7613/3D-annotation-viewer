/**
 * manifest_metadata コレクションの wikidata / bibliography / media を
 * test コレクションの isObjectLevel: true アノテーションとして移行する。
 *
 * Usage: npx tsx scripts/migrate-object-annotations.ts [--dry-run]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log(`${isDryRun ? '[DRY RUN] ' : ''}migrate-object-annotations`);
  console.log('manifest_metadata → test (isObjectLevel: true)');
  console.log('='.repeat(60));

  const snapshot = await db.collection('manifest_metadata').get();
  let created = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const manifestUrl = data.manifest_url as string | undefined;

    if (!manifestUrl) {
      console.log(`  SKIP ${docSnap.id} — manifest_url なし`);
      skipped++;
      continue;
    }

    const wikidata   = data.wikidata   || [];
    const bibliography = data.bibliography || [];
    const media      = data.media      || [];

    if (wikidata.length === 0 && bibliography.length === 0 && media.length === 0) {
      console.log(`  SKIP ${docSnap.id} — リソースなし`);
      skipped++;
      continue;
    }

    // 既存の isObjectLevel アノテーションがあればスキップ
    const existingSnap = await db.collection('test')
      .where('target_manifest', '==', manifestUrl)
      .where('isObjectLevel', '==', true)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      console.log(`  SKIP ${docSnap.id} — 既に isObjectLevel アノテーションが存在する`);
      skipped++;
      continue;
    }

    const annotationId = uuidv4();
    const annotation = {
      id: annotationId,
      isObjectLevel: true,
      target_manifest: manifestUrl,
      target_canvas: '',
      creator: data.lastUpdatedBy || '',
      createdAt: data.updatedAt || Date.now(),
      media:        media,
      wikidata:     wikidata,
      bibliography: bibliography,
      data: {
        body: {
          label: data.manifest_label || '',
          value: { blocks: [], time: '', version: '' },
          type: 'TextualBody',
        },
        target: {
          selector: { type: '', value: [0, 0, 0], area: [], camPos: [0, 0, 0] },
        },
      },
    };

    console.log(`  migrate: ${docSnap.id}`);
    console.log(`    → annotation/${annotationId}`);
    console.log(`      wikidata: ${wikidata.length}, bibliography: ${bibliography.length}, media: ${media.length}`);

    if (!isDryRun) {
      await db.collection('test').doc(annotationId).set(annotation);
    }
    created++;
  }

  console.log('='.repeat(60));
  console.log(`完了: 作成 ${created} 件、スキップ ${skipped} 件`);
  if (isDryRun) console.log('※ --dry-run のため実際の書き込みは行っていません');
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
