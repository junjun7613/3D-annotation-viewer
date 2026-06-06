import { doc, getDoc, setDoc, updateDoc, deleteField, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import { v4 as uuidv4 } from 'uuid';
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

  // サムネイルURLを保存（未設定の場合のみ）
  saveThumbnailUrl: async (manifestUrl: string, thumbnailUrl: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && !docSnap.data().thumbnail_url) {
      await updateDoc(docRef, { thumbnail_url: thumbnailUrl });
    }
  },

  // マニフェストラベルを保存（未設定の場合のみ）
  saveManifestLabel: async (manifestUrl: string, label: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && !docSnap.data().manifest_label) {
      await updateDoc(docRef, { manifest_label: label });
    }
  },

  // サムネイルURLを強制上書き保存
  updateThumbnailUrl: async (manifestUrl: string, thumbnailUrl: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, { thumbnail_url: thumbnailUrl });
    } else {
      await objectMetadataService.initializeObjectMetadata(manifestUrl, '');
      await updateDoc(docRef, { thumbnail_url: thumbnailUrl });
    }
  },

  // TEIデータを保存（元XML・要素マッピング、オプションでsourceDoc XML）
  saveTei: async (
    manifestUrl: string,
    teiOriginal: string,
    teiSourcedoc: string | null,
    teiElementMappings: import('@/types/main').TeiElementMappingMap,
    userId: string
  ): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    const docSnap = await getDoc(docRef);
    const base = {
      tei_original: teiOriginal,
      tei_element_mappings: teiElementMappings,
      lastUpdatedBy: userId,
      updatedAt: Date.now(),
    };
    const payload = teiSourcedoc !== null ? { ...base, tei_sourcedoc: teiSourcedoc } : base;
    if (docSnap.exists()) {
      await updateDoc(docRef, payload);
    } else {
      await objectMetadataService.initializeObjectMetadata(manifestUrl, userId);
      await updateDoc(docRef, payload);
    }
  },

  // TEIデータを削除
  clearTei: async (manifestUrl: string, userId: string): Promise<void> => {
    const docId = encodeManifestUrl(manifestUrl);
    const docRef = doc(db, 'manifest_metadata', docId);
    await updateDoc(docRef, {
      tei_original: deleteField(),
      tei_sourcedoc: deleteField(),
      tei_element_mappings: deleteField(),
      lastUpdatedBy: userId,
      updatedAt: Date.now(),
    });
  },
};

// ======================================================
// オブジェクトレベルアノテーション（test コレクション）
// ======================================================

/** 指定 manifest の isObjectLevel アノテーションを取得。なければ作成して返す */
export async function getOrCreateObjectAnnotation(
  manifestUrl: string,
  userId: string
): Promise<{ id: string }> {
  const q = query(
    collection(db, 'test'),
    where('target_manifest', '==', manifestUrl),
    where('isObjectLevel', '==', true)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { id: snap.docs[0].id };
  }
  // 存在しなければ新規作成
  const id = uuidv4();
  await addDoc(collection(db, 'test'), {
    id,
    isObjectLevel: true,
    target_manifest: manifestUrl,
    target_canvas: '',
    creator: userId,
    createdAt: Date.now(),
    media: [],
    wikidata: [],
    bibliography: [],
    data: {
      body: { label: '', value: { blocks: [], time: '', version: '' }, type: 'TextualBody' },
      target: { selector: { type: '', value: [0, 0, 0], area: [], camPos: [0, 0, 0] } },
    },
  });
  // 作成したドキュメントを取得して id を返す
  const snap2 = await getDocs(q);
  return { id: snap2.docs[0].id };
}

/** オブジェクトレベルアノテーションのリソースを更新する汎用関数 */
async function updateObjectAnnotationField(
  manifestUrl: string,
  userId: string,
  field: 'media' | 'wikidata' | 'bibliography',
  updater: (current: unknown[]) => unknown[]
): Promise<void> {
  const { id } = await getOrCreateObjectAnnotation(manifestUrl, userId);
  const docRef = doc(db, 'test', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const current = (docSnap.data()[field] as unknown[]) ?? [];
  await updateDoc(docRef, { [field]: updater(current) });
}

export const objectAnnotationService = {
  getAll: async (manifestUrl: string) => {
    const q = query(
      collection(db, 'test'),
      where('target_manifest', '==', manifestUrl),
      where('isObjectLevel', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...(d.data() as Record<string, unknown>), docId: d.id }));
  },

  addMedia: async (manifestUrl: string, item: MediaItem, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'media', cur => [...cur, item]);
  },
  updateMedia: async (manifestUrl: string, media: MediaItem[], userId: string) => {
    const { id } = await getOrCreateObjectAnnotation(manifestUrl, userId);
    await updateDoc(doc(db, 'test', id), { media });
  },
  deleteMedia: async (manifestUrl: string, index: number, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'media',
      cur => (cur as MediaItem[]).filter((_, i) => i !== index));
  },

  addWikidata: async (manifestUrl: string, item: WikidataItem, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'wikidata', cur => [...cur, item]);
  },
  updateWikidata: async (manifestUrl: string, wikidata: WikidataItem[], userId: string) => {
    const { id } = await getOrCreateObjectAnnotation(manifestUrl, userId);
    await updateDoc(doc(db, 'test', id), { wikidata });
  },
  deleteWikidata: async (manifestUrl: string, index: number, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'wikidata',
      cur => (cur as WikidataItem[]).filter((_, i) => i !== index));
  },

  addBibliography: async (manifestUrl: string, item: BibliographyItem, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'bibliography', cur => [...cur, item]);
  },
  updateBibliography: async (manifestUrl: string, bibliography: BibliographyItem[], userId: string) => {
    const { id } = await getOrCreateObjectAnnotation(manifestUrl, userId);
    await updateDoc(doc(db, 'test', id), { bibliography });
  },
  deleteBibliography: async (manifestUrl: string, index: number, userId: string) => {
    await updateObjectAnnotationField(manifestUrl, userId, 'bibliography',
      cur => (cur as BibliographyItem[]).filter((_, i) => i !== index));
  },
};
