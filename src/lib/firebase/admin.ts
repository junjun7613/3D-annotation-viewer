import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
if (!serviceAccountStr) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
}

const serviceAccount = JSON.parse(serviceAccountStr);

// Firebase Admin SDKの初期化
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Firestoreインスタンスの取得
export const db = getFirestore();
