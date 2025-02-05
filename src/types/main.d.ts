export interface Annotation {
  id: string;
  creator: string;
  title: string;
  description: string;
  media: [];
  wikidata: [];
  bibliography: [];
  position: {
    x: number;
    y: number;
    z: number;
  };
  target_manifest?: string;
  data: {
    body: {
      value: string;
      label: string;
    };
    target: {
      selector: {
        type: string;
        value: [number, number, number];
        area: [number, number, number];
        camPos: [number, number, number];
      };
    };
  };
}

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
