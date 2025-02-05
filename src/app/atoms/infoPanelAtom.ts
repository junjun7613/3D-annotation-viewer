import { atom } from 'jotai';
import type { Manifest } from '@iiif/presentation-3';
import type { Annotation, InfoPanelContent } from '@/types/main';

export const infoPanelAtom = atom<InfoPanelContent | null>(null);

export const manifestAtom = atom<Manifest | null>(null);

export const annotationsAtom = atom<Annotation[]>([]);
