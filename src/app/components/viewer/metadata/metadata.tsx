import {
  Homepage,
  Label,
  Metadata as CloverMetadata,
  PartOf,
  RequiredStatement,
  SeeAlso,
  Summary,
  PrimitivesExternalWebResource,
  PrimitivesIIIFResource,
} from '@samvera/clover-iiif/primitives';

import { useAtomValue } from 'jotai';
import { manifestAtom } from '@/app/atoms/infoPanelAtom';

import React from 'react';

const MetadataContent = () => {
  const manifest = useAtomValue(manifestAtom);

  if (!manifest) return null;

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-6 text-gray-900 dark:text-gray-100 max-w-3xl mx-auto">
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
          Title
        </h3>
        <div className="text-base sm:text-lg">
          <Label label={manifest.label} as="span" />
        </div>
      </div>

      {manifest.summary && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            Description
          </h3>
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <Summary summary={manifest.summary} />
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
          Metadata
        </h3>
        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
          <CloverMetadata metadata={manifest.metadata || []} />
        </div>
      </div>

      {manifest.requiredStatement && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            Attribution
          </h3>
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <RequiredStatement requiredStatement={manifest.requiredStatement} />
          </div>
        </div>
      )}

      {manifest.homepage && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            Homepage
          </h3>
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <Homepage homepage={manifest.homepage as unknown as PrimitivesExternalWebResource[]} />
          </div>
        </div>
      )}

      {manifest.seeAlso && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            See Also
          </h3>
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <SeeAlso seeAlso={manifest.seeAlso as unknown as PrimitivesExternalWebResource[]} />
          </div>
        </div>
      )}

      {manifest.partOf && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2">
            Part Of
          </h3>
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <PartOf partOf={manifest.partOf as unknown as PrimitivesIIIFResource[]} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataContent;
