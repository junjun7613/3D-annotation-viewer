'use client';

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
import type { Manifest } from '@iiif/presentation-3';
import React, { useEffect, useState } from 'react';

const LoadingSkeleton = () => (
  <div className="animate-pulse p-3 sm:p-5 space-y-3 sm:space-y-4">
    <div className="space-y-2 sm:space-y-3">
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    </div>
    <div className="space-y-2 sm:space-y-3">
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
    <div className="space-y-2 sm:space-y-3">
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
    </div>
  </div>
);

const ManifestMetadata = ({ manifestUrl }: { manifestUrl: string }) => {
  const [manifest, setManifest] = useState<Manifest>();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        setIsError(false);
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error('Failed to fetch manifest');
        const json = await response.json();
        setManifest(json);
      } catch (error) {
        console.error('Error fetching manifest:', error);
        setIsError(true);
      }
    };

    if (manifestUrl) {
      fetchManifest();
    }
  }, [manifestUrl]);

  if (isError) {
    return (
      <div className="p-3 sm:p-5 text-center">
        <div className="text-red-600 dark:text-red-400 mb-2 text-sm sm:text-base">
          Failed to load manifest metadata
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!manifest) return <LoadingSkeleton />;

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

export default ManifestMetadata;
