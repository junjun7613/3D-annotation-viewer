import {
  // Homepage,
  Label,
  Metadata as CloverMetadata,
  // PartOf,
  // RequiredStatement,
  SeeAlso,
  Summary,
  PrimitivesExternalWebResource,
  // PrimitivesIIIFResource,
} from '@samvera/clover-iiif/primitives';
import { useTranslation } from 'react-i18next';

import { useAtomValue } from 'jotai';
import { manifestAtom } from '@/app/atoms/infoPanelAtom';

const Metadata3 = () => {
  const { t } = useTranslation('Metadata');
  const manifest = useAtomValue(manifestAtom);
  return (
    <div className="p-6 bg-white dark:bg-gray-900">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">{t('metadata')}</h2>
      {/* メタデータの内容をここに追加 */}
      {manifest && (
        <div className="space-y-4">
          <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('title')}</div>
            <div className="text-gray-900 dark:text-gray-100">
              <Label label={manifest.label} as="span" />
            </div>
          </div>
          {manifest.summary && (
            <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</div>
              <div className="text-gray-900 dark:text-gray-100">
                <Summary summary={manifest.summary} />
              </div>
            </div>
          )}

          {manifest.metadata && (
            <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('metadata')}</div>
              <div className="text-gray-900 dark:text-gray-100">
                <CloverMetadata metadata={manifest.metadata || []} />
              </div>
            </div>
          )}

          {manifest.seeAlso && (
            <div className="border-b pb-2 border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('seeAlso')}</div>
              <div className="text-gray-900 dark:text-gray-100">
                <SeeAlso seeAlso={manifest.seeAlso as unknown as PrimitivesExternalWebResource[]} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Metadata3;
