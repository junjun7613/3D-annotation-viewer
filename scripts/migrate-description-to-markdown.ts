/**
 * test コレクションの data.body.value（Editor.js JSON）を Markdown 文字列に変換する。
 *
 * 旧データ:  data.body.value = { blocks: [{ type: 'paragraph' | 'header' | 'list', data: {...} }, ...] }
 * 新データ:  data.body.value = "Markdown text"
 *
 * Usage: npx tsx scripts/migrate-description-to-markdown.ts [--dry-run]
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
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}
loadEnv();

const isDryRun = process.argv.includes('--dry-run');

interface EditorBlock {
  type: string;
  data?: {
    text?: string;
    level?: number;
    style?: 'ordered' | 'unordered';
    items?: string[];
  };
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function blocksToMarkdown(blocks: EditorBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (!b) continue;
    const d = b.data ?? {};
    if (b.type === 'paragraph') {
      lines.push(stripHtml(d.text || ''));
      lines.push('');
    } else if (b.type === 'header') {
      const level = Math.max(1, Math.min(6, d.level ?? 2));
      lines.push(`${'#'.repeat(level)} ${stripHtml(d.text || '')}`);
      lines.push('');
    } else if (b.type === 'list') {
      const ordered = d.style === 'ordered';
      (d.items ?? []).forEach((item, i) => {
        lines.push(`${ordered ? `${i + 1}.` : '-'} ${stripHtml(item)}`);
      });
      lines.push('');
    } else if (d.text) {
      // 未知のブロックタイプは text フィールドだけ拾う
      lines.push(stripHtml(d.text));
      lines.push('');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log((isDryRun ? '[DRY RUN] ' : '') + 'Migrate body.value: Editor.js JSON → Markdown');
  console.log('='.repeat(60));

  const snap = await db.collection('test').get();
  console.log(`total docs: ${snap.size}`);

  let converted = 0;
  let alreadyString = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const value = data?.data?.body?.value;
    if (typeof value === 'string') {
      alreadyString++;
      continue;
    }
    if (!value || !Array.isArray(value.blocks)) {
      skipped++;
      continue;
    }
    const md = blocksToMarkdown(value.blocks as EditorBlock[]);
    console.log(`  ${docSnap.id}: ${value.blocks.length} blocks → ${md.length} chars`);
    if (!isDryRun) {
      await db.collection('test').doc(docSnap.id).update({
        'data.body.value': md,
      });
    }
    converted++;
  }

  console.log('='.repeat(60));
  console.log(`完了: 変換 ${converted}, 既に文字列 ${alreadyString}, スキップ ${skipped}`);
  if (isDryRun) console.log('※ --dry-run のため書き込み無し');
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
