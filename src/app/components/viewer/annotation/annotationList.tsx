'use client;';

import { Annotation } from '@/types/main';
import { useAtomValue, useSetAtom } from 'jotai';
import { annotationsAtom, infoPanelAtom } from '@/app/atoms/infoPanelAtom';

const AnnotationItem = ({ annotation }: { annotation: Annotation }) => {
  const setInfoPanelContent = useSetAtom(infoPanelAtom);

  return (
    <li
      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => {
        setInfoPanelContent({
          id: annotation.id,
          creator: annotation.creator,
          title: annotation.data.body.label,
          description: annotation.data.body.value,
          media: annotation.media,
          wikidata: annotation.wikidata,
          bibliography: annotation.bibliography,
        });
      }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
            {annotation.data.body.label}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {annotation.data.target.selector.type}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">{annotation.data.body.value}</p>

        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>作成者: {annotation.creator}</span>
          {annotation.media && annotation.media.length > 0 && (
            <span>• メディア: {annotation.media.length}件</span>
          )}
        </div>
      </div>
    </li>
  );
};

const AnnotationList = () => {
  const annotations = useAtomValue(annotationsAtom);

  return (
    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
      {annotations.map((annotation) => (
        <AnnotationItem key={annotation.id} annotation={annotation} />
      ))}
    </ul>
  );
};

export default AnnotationList;
