import { v4 as uuidv4 } from 'uuid';
import EditorJSHtml from 'editorjs-html';
import { NewAnnotation, IIIFAnnotation } from '@/types/main';

const parser = EditorJSHtml();

// デコード
export function decodeSlug(slug: string): string {
  const base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString();
}

export function createSlug(url: string): string {
  return Buffer.from(url)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export const downloadIIIFManifest = async (
  manifestUrl: string,
  firebaseDocuments: NewAnnotation[]
) => {
  // manifestUrlを/でsplitして最後の要素を削除
  const newUrl = manifestUrl.split('/').slice(0, -1).join('/');

  const annotations: IIIFAnnotation[] = [];

  firebaseDocuments.forEach((doc) => {
    const html = parser.parse(doc.data.body.value);

    const annotation: IIIFAnnotation = {
      id: `${newUrl}/annotation/${doc.id}`,
      type: 'Annotation',
      motivation: 'painting',
      body: {
        value: html,
        label: doc.data.body.label,
        type: doc.data.body.type,
      }, // doc.data.body,
      target: {
        source: doc.target_canvas,
        selector: doc.data.target.selector,
      },
    };

    annotations.push(annotation);
  });

  const url = manifestUrl;

  const data = await fetch(url).then((res) => res.json());

  const newData = {
    id: `${newUrl}/annotationPage/${uuidv4()}`,
    type: 'AnnotationPage',
    items: annotations,
  };

  data.items[0].items[0].items.push(newData);

  return data;
};
