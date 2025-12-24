import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import type { ObjectMetadata, MediaItem, WikidataItem, BibliographyItem, LocationItem } from '@/types/main';

// manifest_url (URL) をFirestoreのドキュメントIDに変換する関数
// スラッシュやコロンなどの特殊文字をエンコード
export function encodeManifestUrl(url: string): string {
  return Buffer.from(url).toString('base64').replace(/[/+=]/g, (char) => {
    switch (char) {
      case '/': return '_';
      case '+': return '-';
      case '=': return '';
      default: return char;
    }
  });
}

export function decodeManifestUrl(encoded: string): string {
  const base64 = encoded.replace(/_/g, '/').replace(/-/g, '+');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export const objectMetadataService = {
  // Objectメタデータを取得
  getObjectMetadata: async (manifestUrl: string): Promise<ObjectMetadata | null> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ObjectMetadata;
    }
    return null;
  },

  // Objectメタデータを初期化（存在しない場合のみ）
  initializeObjectMetadata: async (manifestUrl: string, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const initialData: ObjectMetadata = {
        manifest_url: manifestUrl,
        media: [],
        wikidata: [],
        bibliography: [],
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      };
      await setDoc(docRef, initialData);
    }
  },

  // メディアを追加
  addMedia: async (manifestUrl: string, mediaItem: MediaItem, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      await updateDoc(docRef, {
        media: [...data.media, mediaItem],
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      // 初期化してから追加
      await objectMetadataService.initializeObjectMetadata(manifestUrl, userId);
      await objectMetadataService.addMedia(manifestUrl, mediaItem, userId);
    }
  },

  // メディアを一括更新
  updateMedia: async (manifestUrl: string, media: MediaItem[], userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    await updateDoc(docRef, {
      media,
      lastUpdatedBy: userId,
      updatedAt: Date.now(),
    });
  },

  // メディアを削除
  deleteMedia: async (manifestUrl: string, index: number, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      const newMedia = data.media.filter((_, i) => i !== index);
      await updateDoc(docRef, {
        media: newMedia,
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    }
  },

  // Wikidataを追加
  addWikidata: async (manifestUrl: string, wikidataItem: WikidataItem, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      await updateDoc(docRef, {
        wikidata: [...data.wikidata, wikidataItem],
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      await objectMetadataService.initializeObjectMetadata(manifestUrl, userId);
      await objectMetadataService.addWikidata(manifestUrl, wikidataItem, userId);
    }
  },

  // Wikidataを一括更新
  updateWikidata: async (manifestUrl: string, wikidata: WikidataItem[], userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    await updateDoc(docRef, {
      wikidata,
      lastUpdatedBy: userId,
      updatedAt: Date.now(),
    });
  },

  // Wikidataを削除
  deleteWikidata: async (manifestUrl: string, index: number, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      const newWikidata = data.wikidata.filter((_, i) => i !== index);
      await updateDoc(docRef, {
        wikidata: newWikidata,
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    }
  },

  // 参考文献を追加
  addBibliography: async (manifestUrl: string, bibItem: BibliographyItem, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      await updateDoc(docRef, {
        bibliography: [...data.bibliography, bibItem],
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      await objectMetadataService.initializeObjectMetadata(manifestUrl, userId);
      await objectMetadataService.addBibliography(manifestUrl, bibItem, userId);
    }
  },

  // 参考文献を一括更新
  updateBibliography: async (manifestUrl: string, bibliography: BibliographyItem[], userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    await updateDoc(docRef, {
      bibliography,
      lastUpdatedBy: userId,
      updatedAt: Date.now(),
    });
  },

  // 参考文献を削除
  deleteBibliography: async (manifestUrl: string, index: number, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ObjectMetadata;
      const newBibliography = data.bibliography.filter((_, i) => i !== index);
      await updateDoc(docRef, {
        bibliography: newBibliography,
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    }
  },

  // 位置情報を更新
  updateLocation: async (manifestUrl: string, location: LocationItem, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        location,
        lastUpdatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      await objectMetadataService.initializeObjectMetadata(manifestUrl, userId);
      await objectMetadataService.updateLocation(manifestUrl, location, userId);
    }
  },
};
