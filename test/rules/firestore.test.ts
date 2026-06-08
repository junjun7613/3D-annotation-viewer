/**
 * Firestore セキュリティルールテスト
 *
 * 前提：
 *   1. Firebase Emulator が起動していること
 *      $ firebase emulators:start --only firestore,auth
 *   2. `@firebase/rules-unit-testing` がインストール済み
 *      $ npm install -D @firebase/rules-unit-testing
 *
 * 実行：
 *   $ npx tsx test/rules/firestore.test.ts
 *
 * テスト観点（Phase 2 リリース判定の最低限）:
 *   - projects: メンバーのみ read、owner のみ update/delete
 *   - members:  owner のみ add/update、本人 or owner のみ delete
 *   - test:     editor+ のみ create / update / delete、public プロジェクトは read 可
 *   - regions:  座標 immutable、creator のみ delete
 *   - manifest_metadata: ログインユーザーは write 可
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { setDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'three-sample-rules-test';

async function withEnv(fn: (env: RulesTestEnvironment) => Promise<void>) {
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules.draft', 'utf-8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  try {
    await fn(env);
  } finally {
    await env.cleanup();
  }
}

async function seed(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'projects/p1'), {
      id: 'p1',
      name: 'P1',
      visibility: 'private',
      createdAt: 0,
      createdBy: 'owner-uid',
    });
    await setDoc(doc(db, 'projects/p1/members/owner-uid'), {
      uid: 'owner-uid',
      role: 'owner',
      joinedAt: 0,
    });
    await setDoc(doc(db, 'projects/p1/members/editor-uid'), {
      uid: 'editor-uid',
      role: 'editor',
      joinedAt: 0,
    });
    await setDoc(doc(db, 'projects/p1/members/viewer-uid'), {
      uid: 'viewer-uid',
      role: 'viewer',
      joinedAt: 0,
    });
    await setDoc(doc(db, 'projects/pub'), {
      id: 'pub',
      name: 'Public',
      visibility: 'public',
      createdAt: 0,
      createdBy: 'owner-uid',
    });
    await setDoc(doc(db, 'test/ann-p1'), {
      id: 'ann-p1',
      researchProjectId: 'p1',
      creator: 'editor-uid',
      target_manifest: 'urn:m',
    });
    await setDoc(doc(db, 'test/ann-pub'), {
      id: 'ann-pub',
      researchProjectId: 'pub',
      creator: 'owner-uid',
      target_manifest: 'urn:m',
    });
    await setDoc(doc(db, 'test/ann-legacy'), {
      id: 'ann-legacy',
      creator: 'legacy-uid',
      target_manifest: 'urn:m',
    });
  });
}

async function main() {
  await withEnv(async (env) => {
    await seed(env);

    const ownerDb = env.authenticatedContext('owner-uid').firestore();
    const editorDb = env.authenticatedContext('editor-uid').firestore();
    const viewerDb = env.authenticatedContext('viewer-uid').firestore();
    const strangerDb = env.authenticatedContext('stranger-uid').firestore();
    const anonDb = env.unauthenticatedContext().firestore();

    console.log('— projects read —');
    await assertSucceeds(getDoc(doc(ownerDb, 'projects/p1')));
    await assertSucceeds(getDoc(doc(editorDb, 'projects/p1')));
    await assertFails(getDoc(doc(strangerDb, 'projects/p1')));
    await assertSucceeds(getDoc(doc(strangerDb, 'projects/pub'))); // public は誰でも

    console.log('— projects update —');
    await assertSucceeds(updateDoc(doc(ownerDb, 'projects/p1'), { name: 'P1!' }));
    await assertFails(updateDoc(doc(editorDb, 'projects/p1'), { name: 'no' }));

    console.log('— members add (only owner) —');
    await assertSucceeds(
      setDoc(doc(ownerDb, 'projects/p1/members/new-uid'), {
        uid: 'new-uid', role: 'viewer', joinedAt: 0,
      })
    );
    await assertFails(
      setDoc(doc(editorDb, 'projects/p1/members/another'), {
        uid: 'another', role: 'viewer', joinedAt: 0,
      })
    );

    console.log('— members self-leave —');
    await assertSucceeds(deleteDoc(doc(viewerDb, 'projects/p1/members/viewer-uid')));

    console.log('— test create —');
    await assertSucceeds(
      setDoc(doc(editorDb, 'test/new-ann'), {
        id: 'new-ann',
        researchProjectId: 'p1',
        creator: 'editor-uid',
        target_manifest: 'urn:m',
      })
    );
    // viewer は editor 未満なので作成不可
    await assertFails(
      setDoc(doc(viewerDb, 'test/forbidden'), {
        id: 'forbidden',
        researchProjectId: 'p1',
        creator: 'viewer-uid',
        target_manifest: 'urn:m',
      })
    );

    console.log('— test update / delete —');
    await assertSucceeds(updateDoc(doc(editorDb, 'test/ann-p1'), { creator: 'editor-uid' }));
    await assertFails(updateDoc(doc(strangerDb, 'test/ann-p1'), { creator: 'x' }));
    // legacy (researchProjectId 無し) は creator のみ
    await assertFails(updateDoc(doc(editorDb, 'test/ann-legacy'), { creator: 'editor-uid' }));

    console.log('— test read —');
    await assertSucceeds(getDoc(doc(anonDb, 'test/ann-pub')));    // public プロジェクト
    await assertFails(getDoc(doc(strangerDb, 'test/ann-p1')));    // private プロジェクト
    await assertSucceeds(getDoc(doc(anonDb, 'test/ann-legacy'))); // 過渡期データ

    console.log('— regions —');
    await assertSucceeds(
      setDoc(doc(editorDb, 'regions/r1'), {
        creator: 'editor-uid',
        createdAt: 0,
        target_manifest: 'urn:m',
        target_canvas: '',
        selector: { type: '3DSelector', value: [0, 0, 0] },
      })
    );
    // 座標 immutable
    await assertFails(updateDoc(doc(editorDb, 'regions/r1'), {
      selector: { type: '3DSelector', value: [1, 1, 1] },
    }));
    // 削除は creator のみ
    await assertFails(deleteDoc(doc(strangerDb, 'regions/r1')));
    await assertSucceeds(deleteDoc(doc(editorDb, 'regions/r1')));

    console.log('— manifest_metadata —');
    await assertSucceeds(setDoc(doc(editorDb, 'manifest_metadata/m1'), {
      manifest_url: 'urn:m', media: [], wikidata: [], bibliography: [],
    }));
    await assertFails(setDoc(doc(anonDb, 'manifest_metadata/m1'), {
      manifest_url: 'urn:m', media: [], wikidata: [], bibliography: [],
    }));

    console.log('All rule assertions passed.');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
