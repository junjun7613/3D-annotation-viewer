import { collection, getDocs, query, addDoc, where } from 'firebase/firestore';
import db from '@/lib/firebase/firebase';

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

export const annotationService = {
  // アノテーション一覧を取得
  getAnnotations: async (): Promise<Annotation[]> => {
    const annotations: Annotation[] = [];
    const q = query(collection(db, 'annotations'));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Annotation;
      const annotationWithId = {
        ...data,
        id: doc.id,
        creator: data.creator,
        media: data.media || [],
        wikidata: data.wikidata || [],
        bibliography: data.bibliography || [],
      };
      annotations.push(annotationWithId);
    });

    return annotations;
  },

  // アノテーションを追加
  addAnnotation: async (annotationData: Omit<Annotation, 'id'>) => {
    return await addDoc(collection(db, 'annotations'), annotationData);
  },

  // if (annotation.target_manifest == manifest.id) {
  getAnnotationsByManifestId: async (manifestId: string): Promise<Annotation[]> => {
    const annotations: Annotation[] = [];
    const q = query(collection(db, 'annotations'), where('target_manifest', '==', manifestId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Annotation;
      data.id = doc.id;
      annotations.push(data);
    });

    return annotations;
  },
};
