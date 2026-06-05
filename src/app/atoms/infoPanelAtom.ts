import { atom } from 'jotai';
import type { Manifest } from '@iiif/presentation-3';
import type { Annotation, InfoPanelContent, RegionPanelContent, Annotation3 } from '@/types/main';

// オブジェクトレベルのアノテーション一覧（複数人対応）
export const objectAnnotationListAtom = atom<InfoPanelContent[]>([]);

// オブジェクトレベル選択モード（true のとき一覧を全面表示）
export const objectAnnotationPanelOpenAtom = atom<boolean>(false);

export const infoPanelAtom = atom<InfoPanelContent | null>(null);

// 領域ノード選択時のアノテーション一覧パネル
export const regionPanelAtom = atom<RegionPanelContent | null>(null);

export const manifestAtom = atom<Manifest | null>(null);

export const annotationsAtom = atom<Annotation[]>([]);

export const annotationsAtom3 = atom<Annotation3[]>([]);

// 選択中のアノテーションIDのアトム
export const selectedAnnotationIdAtom = atom<string | null>(null);

export const manifestUrlAtom = atom<string | null>(null);
