/**
 * アノテーションが 1 件もない自分のプロジェクトを削除するスクリプト。
 *
 * 対象:
 *   - projects.createdBy == 指定 email のユーザー
 *   - かつ test コレクションで researchProjectId == そのプロジェクトID のドキュメントが 0 件
 *
 * 削除対象:
 *   - projects/{pid}/members/* （サブコレクション全件）
 *   - projects/{pid}       （本体）
 *
 * Usage:
 *   npx tsx scripts/delete-empty-projects.ts --email htjk6513khbk@gmail.com --dry-run
 *   npx tsx scripts/delete-empty-projects.ts --email htjk6513khbk@gmail.com
 *
 * 安全策:
 *   - デフォルトで --dry-run なしで動かしても、削除前に対象一覧を出して 5 秒待つ
 *   - --yes を付けると待機を省略
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const email = getArg('email');
const isDryRun = hasFlag('dry-run');
const skipWait = hasFlag('yes');

if (!email) {
  console.error('Usage: npx tsx scripts/delete-empty-projects.ts --email <email> [--dry-run] [--yes]');
  process.exit(1);
}

async function main() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log(`${isDryRun ? '[DRY RUN] ' : ''}delete-empty-projects`);
  console.log(`  email: ${email}`);
  console.log('='.repeat(60));

  // 1. email → uid 解決
  const user = await getAuth().getUserByEmail(email!);
  console.log(`\n[1/4] User: ${user.uid} (${user.email})`);

  // 2. createdBy == uid の projects を列挙
  const projectsSnap = await db
    .collection('projects')
    .where('createdBy', '==', user.uid)
    .get();
  console.log(`\n[2/4] 自分が作成したプロジェクト: ${projectsSnap.size} 件`);

  // 3. 各プロジェクトのアノテ数を集計
  console.log('\n[3/4] アノテ数を集計...');
  const empties: { pid: string; name: string }[] = [];
  for (const projectDoc of projectsSnap.docs) {
    const pid = projectDoc.id;
    const name = (projectDoc.data().name as string) ?? '(no name)';
    const annSnap = await db
      .collection('test')
      .where('researchProjectId', '==', pid)
      .limit(1)
      .get();
    const count = annSnap.size;
    const mark = count === 0 ? '✗' : '✓';
    console.log(`      ${mark} ${pid}  ${name} — annotations: ${count > 0 ? '1+' : 0}`);
    if (count === 0) empties.push({ pid, name });
  }

  console.log(`\n      削除対象: ${empties.length} 件`);
  empties.forEach((p) => console.log(`        - ${p.pid}  ${p.name}`));

  if (empties.length === 0) {
    console.log('\n何も削除する必要がありません。');
    return;
  }

  if (isDryRun) {
    console.log('\n※ --dry-run のため削除は行いません。');
    return;
  }

  if (!skipWait) {
    console.log('\n5 秒後に削除を開始します。中断するには Ctrl+C ...');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 4. members サブコレクション + projects 本体を削除
  console.log('\n[4/4] 削除を実行...');
  for (const { pid, name } of empties) {
    const membersSnap = await db.collection('projects').doc(pid).collection('members').get();
    for (const m of membersSnap.docs) {
      await m.ref.delete();
    }
    await db.collection('projects').doc(pid).delete();
    console.log(`      DELETED ${pid}  ${name} (members: ${membersSnap.size})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`完了: ${empties.length} 件削除`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
