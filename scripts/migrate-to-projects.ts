/**
 * 既存データをプロジェクト所有モデルへ移行するスクリプト。
 *
 * 戦略:
 *   1. Firebase Auth から全ユーザーを列挙
 *   2. ユーザーごとに「<email> のワークスペース」プロジェクトを作成し、本人を owner として登録
 *   3. test コレクションの全アノテーションに researchProjectId を付与（creator UID → projectId のマップで解決）
 *      - creator が空 / 既存プロジェクトと突合できない場合はオーファン用プロジェクトに寄せる
 *
 * 領域ノード (regions) は projectId を持たない公開資産のため対象外。
 * manifest_metadata も非依存のため対象外。
 *
 * Usage:
 *   npx tsx scripts/migrate-to-projects.ts --dry-run
 *   npx tsx scripts/migrate-to-projects.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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

interface AuthUserSummary {
  uid: string;
  email?: string;
  displayName?: string;
}

async function listAllAuthUsers(): Promise<AuthUserSummary[]> {
  const auth = getAuth();
  const result: AuthUserSummary[] = [];
  let nextPageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    for (const u of page.users) {
      result.push({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
      });
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return result;
}

function projectNameFor(user: AuthUserSummary): string {
  if (user.email) return `${user.email} のワークスペース`;
  if (user.displayName) return `${user.displayName} のワークスペース`;
  return `Workspace-${user.uid.slice(0, 8)}`;
}

async function migrate() {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('='.repeat(60));
  console.log(`${isDryRun ? '[DRY RUN] ' : ''}migrate-to-projects`);
  console.log('Phase 1: creator ごとに個別プロジェクトを作成');
  console.log('='.repeat(60));

  // ---------- 1. Firebase Auth から全ユーザー取得 ----------
  console.log('\n[1/4] Firebase Auth から全ユーザーを列挙...');
  const users = await listAllAuthUsers();
  console.log(`      ${users.length} ユーザー検出`);

  // ---------- 2. test コレクションを走査して creator UID 集合を構築 ----------
  console.log('\n[2/4] test コレクションを走査して creator を収集...');
  const annotationsSnap = await db.collection('test').get();
  const creatorUids = new Set<string>();
  let emptyCreatorCount = 0;
  for (const docSnap of annotationsSnap.docs) {
    const data = docSnap.data();
    const creator = (data.creator as string | undefined)?.trim();
    if (creator) creatorUids.add(creator);
    else emptyCreatorCount++;
  }
  console.log(`      アノテーション ${annotationsSnap.size} 件、creator UID ${creatorUids.size} 種`);
  if (emptyCreatorCount > 0) {
    console.log(`      ⚠ creator 欠落データ: ${emptyCreatorCount} 件`);
  }

  // creator UID のうち、Auth に存在しないものを検出
  const authUidSet = new Set(users.map((u) => u.uid));
  const orphanCreators = [...creatorUids].filter((uid) => !authUidSet.has(uid));
  if (orphanCreators.length > 0) {
    console.log(`      ⚠ Auth に存在しない creator UID: ${orphanCreators.length} 種`);
    orphanCreators.forEach((uid) => console.log(`        - ${uid}`));
  }

  // ---------- 3. ユーザーごとにプロジェクトを作成 ----------
  console.log('\n[3/4] ユーザーごとにワークスペース・プロジェクトを作成...');
  const uidToProjectId = new Map<string, string>();

  // 実データ creator のうち、Auth に存在するユーザーのみプロジェクトを立てる
  // （アノテーションを 1 件も持たないユーザーまでプロジェクトを作るのは過剰）
  const usersToProvision = users.filter((u) => creatorUids.has(u.uid));
  console.log(`      対象ユーザー（実データを持つ）: ${usersToProvision.length} 人`);

  for (const user of usersToProvision) {
    // 既存プロジェクトとの突合（同一 createdBy で workspace プロジェクトが既にあればスキップ）
    const existingSnap = await db
      .collection('projects')
      .where('createdBy', '==', user.uid)
      .limit(1)
      .get();

    let projectId: string;
    if (!existingSnap.empty) {
      projectId = existingSnap.docs[0].id;
      console.log(`      SKIP ${user.uid} (${user.email ?? '-'}) → 既存プロジェクト ${projectId}`);
    } else {
      projectId = uuidv4();
      const now = Date.now();
      const project = {
        id: projectId,
        name: projectNameFor(user),
        description: '',
        visibility: 'private' as const,
        createdAt: now,
        createdBy: user.uid,
      };
      const member = {
        uid: user.uid,
        role: 'owner' as const,
        joinedAt: now,
        invitedBy: user.uid,
      };
      console.log(`      CREATE ${user.uid} (${user.email ?? '-'}) → ${projectId}`);
      console.log(`             name: ${project.name}`);
      if (!isDryRun) {
        await db.collection('projects').doc(projectId).set(project);
        await db
          .collection('projects')
          .doc(projectId)
          .collection('members')
          .doc(user.uid)
          .set(member);
      }
    }
    uidToProjectId.set(user.uid, projectId);
  }

  // オーファン creator 用の共通プロジェクトを作る（Auth 削除済みユーザーのデータ救済）
  let orphanProjectId: string | null = null;
  if (orphanCreators.length > 0 || emptyCreatorCount > 0) {
    const orphanSnap = await db
      .collection('projects')
      .where('name', '==', 'Orphan Annotations (legacy)')
      .limit(1)
      .get();
    if (!orphanSnap.empty) {
      orphanProjectId = orphanSnap.docs[0].id;
    } else {
      orphanProjectId = uuidv4();
      const orphanProject = {
        id: orphanProjectId,
        name: 'Orphan Annotations (legacy)',
        description: 'Auth に存在しない creator または creator 欠落データの退避先',
        visibility: 'private' as const,
        createdAt: Date.now(),
        createdBy: 'system',
      };
      console.log(`      CREATE orphan project → ${orphanProjectId}`);
      if (!isDryRun) {
        await db.collection('projects').doc(orphanProjectId).set(orphanProject);
      }
    }
  }

  // ---------- 4. test コレクションに researchProjectId を付与 ----------
  console.log('\n[4/4] アノテーションに researchProjectId を付与...');
  let updated = 0;
  let skipped = 0;
  let assignedToOrphan = 0;

  for (const docSnap of annotationsSnap.docs) {
    const data = docSnap.data();
    const creator = (data.creator as string | undefined)?.trim() ?? '';
    const alreadyAssigned = (data.researchProjectId as string | undefined)?.trim();

    if (alreadyAssigned) {
      skipped++;
      continue;
    }

    const targetProjectId = uidToProjectId.get(creator) ?? orphanProjectId;
    if (!targetProjectId) {
      console.log(`      SKIP ${docSnap.id} — creator=${creator || '(empty)'} に対応するプロジェクトなし`);
      skipped++;
      continue;
    }

    const isOrphan = !uidToProjectId.has(creator);
    if (isOrphan) assignedToOrphan++;

    console.log(
      `      ASSIGN ${docSnap.id} → ${targetProjectId}${isOrphan ? ' [orphan]' : ''}`
    );
    if (!isDryRun) {
      await db.collection('test').doc(docSnap.id).update({
        researchProjectId: targetProjectId,
      });
    }
    updated++;
  }

  // ---------- サマリ ----------
  console.log('\n' + '='.repeat(60));
  console.log('完了サマリ');
  console.log(`  作成プロジェクト数: ${uidToProjectId.size}${orphanProjectId ? ' (+1 orphan)' : ''}`);
  console.log(`  アノテーション更新: ${updated} 件 (うち orphan ${assignedToOrphan} 件)`);
  console.log(`  アノテーションスキップ: ${skipped} 件`);
  if (isDryRun) console.log('  ※ --dry-run のため実際の書き込みは行っていません');
  console.log('='.repeat(60));
}

migrate().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});
