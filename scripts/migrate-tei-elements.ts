/**
 * manifest_metadata.tei_line_mappings を tei_element_mappings に変換するマイグレーション。
 *
 * 変換前: tei_line_mappings = { [lineNumber]: { lineNumber, lineText, annotationId | regionId } }
 * 変換後: tei_element_mappings = { [elementId]: { elementId, elementType, label, regionId } }
 *
 * elementId は lb なら `lb#<lineNumber>` を採用。
 * annotationId 形式の旧データは test ドキュメントの regionId フィールド経由で region を解決する。
 *
 * Usage: npx tsx scripts/migrate-tei-elements.ts [--dry-run]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

const isDryRun = process.argv.includes('--dry-run');

interface OldLineMapping {
  lineNumber: string;
  lineText: string;
  annotationId?: string | null;
  regionId?: string | null;
}
interface NewElementMapping {
  elementId: string;
  elementType: string;
  label: string;
  regionId: string | null;
}

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log((isDryRun ? '[DRY RUN] ' : '') + 'Migrate tei_line_mappings → tei_element_mappings');
  console.log('='.repeat(60));

  const snapshot = await db.collection('manifest_metadata').get();
  const targets = snapshot.docs.filter((d) => d.data().tei_line_mappings);

  console.log(`対象 manifest_metadata 件数（tei_line_mappings あり）: ${targets.length}`);
  if (targets.length === 0) {
    console.log('マイグレーション対象なし。');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const docSnap of targets) {
    const data = docSnap.data();
    const oldMappings = data.tei_line_mappings as Record<string, OldLineMapping>;

    // 既に element_mappings 形式に移行済みのドキュメントはスキップ
    if (data.tei_element_mappings) {
      console.log(`  SKIP ${docSnap.id} — 既に tei_element_mappings あり`);
      skipped++;
      continue;
    }

    // 旧 annotationId 形式が混じっている場合は test 経由で regionId 解決
    const annIds = Array.from(new Set(
      Object.values(oldMappings)
        .map((m) => m.annotationId)
        .filter((id): id is string => !!id)
    ));
    const annToRegion: Record<string, string | null> = {};
    for (const annId of annIds) {
      const annDoc = await db.collection('test').doc(annId).get();
      if (!annDoc.exists) {
        annToRegion[annId] = null;
        continue;
      }
      const annData = annDoc.data() as Record<string, unknown>;
      annToRegion[annId] = (annData.regionId as string | undefined) ?? null;
    }

    const newMappings: Record<string, NewElementMapping> = {};
    let lbCount = 0;
    let unresolved = 0;
    for (const [lineNumber, m] of Object.entries(oldMappings)) {
      // regionId を解決：直接持っていればそれを、なければ annotationId 経由
      const regionId = m.regionId ?? (m.annotationId ? annToRegion[m.annotationId] : null);
      if (m.annotationId && !regionId) unresolved++;
      const elementId = `lb#${m.lineNumber}`;
      newMappings[elementId] = {
        elementId,
        elementType: 'lb',
        label: m.lineText || `line ${m.lineNumber}`,
        regionId: regionId ?? null,
      };
      lbCount++;
    }

    console.log(`  ${docSnap.id}`);
    console.log(`    lb mappings: ${lbCount}, unresolved annotationIds: ${unresolved}`);

    if (!isDryRun) {
      await db.collection('manifest_metadata').doc(docSnap.id).update({
        tei_element_mappings: newMappings,
        tei_line_mappings: FieldValue.delete(),
      });
    }
    migrated++;
  }

  console.log('='.repeat(60));
  console.log(`完了: 変換 ${migrated} 件、スキップ ${skipped} 件`);
  if (isDryRun) console.log('※ --dry-run のため実際の書き込みは行っていません');
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
