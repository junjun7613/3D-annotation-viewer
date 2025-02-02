import { atom } from 'jotai';

interface MediaItem {
  type: string;
  source: string;
  caption: string;
}

interface WikidataItem {
  label: string;
  uri: string;
  wikipedia?: string;
}

interface BibliographyItem {
  author: string;
  title: string;
  year: string;
  page?: string;
  pdf?: string;
}

export interface InfoPanelContent {
  id: string;
  creator: string;
  title: string;
  description: string;
  media: MediaItem[];
  wikidata: WikidataItem[];
  bibliography: BibliographyItem[];
}

export const infoPanelAtom = atom<InfoPanelContent>({
  id: '',
  creator: '',
  title: '',
  description: '',
  media: [],
  wikidata: [],
  bibliography: [],
});
