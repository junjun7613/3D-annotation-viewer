/**
 * Firestoreからマニフェストに関連するデータをダウンロードするスクリプト
 *
 * Usage: npx tsx scripts/download-firestore-data.ts <manifest_url>
 * Example: npx tsx scripts/download-firestore-data.ts "https://ogawa.aws.ldas.jp/iiif/3/18/manifest"
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを手動で読み込む
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 引用符を除去
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

// マニフェストURLをBase64エンコードしてドキュメントIDに変換
function encodeManifestUrl(url: string): string {
  return Buffer.from(url).toString('base64').replace(/[/+=]/g, (char) => {
    switch (char) {
      case '/': return '_';
      case '+': return '-';
      case '=': return '';
      default: return char;
    }
  });
}

async function downloadData(manifestUrl: string) {
  // Firebase Admin SDKの初期化
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
  const serviceAccount = JSON.parse(serviceAccountStr);

  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();

  console.log('='.repeat(60));
  console.log('Manifest URL:', manifestUrl);
  console.log('='.repeat(60));

  // 1. manifest_metadataコレクションからデータを取得
  const docId = encodeManifestUrl(manifestUrl);
  console.log('\n[manifest_metadata] Document ID:', docId);

  const metadataRef = db.collection('manifest_metadata').doc(docId);
  const metadataDoc = await metadataRef.get();

  if (metadataDoc.exists) {
    console.log('\n[manifest_metadata] Data:');
    console.log(JSON.stringify(metadataDoc.data(), null, 2));
  } else {
    console.log('\n[manifest_metadata] No document found');
  }

  // 2. testコレクション（アノテーション）からデータを取得
  console.log('\n' + '='.repeat(60));
  console.log('[test collection] Annotations for this manifest:');

  const annotationsRef = db.collection('test').where('target_manifest', '==', manifestUrl);
  const annotationsSnapshot = await annotationsRef.get();

  if (annotationsSnapshot.empty) {
    console.log('No annotations found');
  } else {
    console.log(`Found ${annotationsSnapshot.size} annotation(s):\n`);
    annotationsSnapshot.forEach((doc) => {
      console.log(`--- Document ID: ${doc.id} ---`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('');
    });
  }

  // 結果をJSONファイルに保存
  const outputDir = path.resolve(__dirname, '../.firestore-exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `export-${timestamp}.json`);

  const exportData = {
    manifestUrl,
    exportedAt: new Date().toISOString(),
    manifest_metadata: metadataDoc.exists ? metadataDoc.data() : null,
    annotations: annotationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  };

  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
  console.log('='.repeat(60));
  console.log(`Data exported to: ${outputFile}`);
}

// メイン実行
const manifestUrl = process.argv[2];

if (!manifestUrl) {
  console.error('Usage: npx tsx scripts/download-firestore-data.ts <manifest_url>');
  console.error('Example: npx tsx scripts/download-firestore-data.ts "https://ogawa.aws.ldas.jp/iiif/3/18/manifest"');
  process.exit(1);
}

downloadData(manifestUrl)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
