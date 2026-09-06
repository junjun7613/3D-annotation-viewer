import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';
import { encodeManifestUrl } from './objectMetadata';
import type { TeiElementMappingMap } from '@/types/main';

export type DeleteRegionResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'annotations_remain' | 'tei_references_remain' };

/**
 * 領域ノードを削除する。以下の条件をすべて満たす場合のみ削除:
 *  - region が存在し、creator === uid（Firestore ルールと一致）
 *  - test コレクションに regionId 参照が 0 件
 *  - 同マニフェストの TEI element mapping に regionId 参照が 0 件
 */
export async function deleteRegionIfUnused(
  regionId: string,
  uid: string
): Promise<DeleteRegionResult> {
  const regionRef = doc(db, 'regions', regionId);
  const regionSnap = await getDoc(regionRef);
  if (!regionSnap.exists()) return { ok: false, reason: 'not_found' };

  const region = regionSnap.data() as { creator?: string; target_manifest?: string };
  if (region.creator !== uid) return { ok: false, reason: 'forbidden' };

  // アノテーション参照チェック（プロジェクト横断・全ユーザー）
  const annQuery = query(collection(db, 'test'), where('regionId', '==', regionId));
  const annSnap = await getDocs(annQuery);
  if (!annSnap.empty) return { ok: false, reason: 'annotations_remain' };

  // TEI element mapping 参照チェック（該当マニフェスト内のみ）
  if (region.target_manifest) {
    const metaRef = doc(db, 'manifest_metadata', encodeManifestUrl(region.target_manifest));
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      const mappings = (metaSnap.data().tei_element_mappings ?? {}) as TeiElementMappingMap;
      const referenced = Object.values(mappings).some((m) => m?.regionId === regionId);
      if (referenced) return { ok: false, reason: 'tei_references_remain' };
    }
  }

  await deleteDoc(regionRef);
  return { ok: true };
}
